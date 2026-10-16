import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { memoryStore } from '../services/memoryStore.js';
import { 
  CreateCaseInputSchema, 
  Case, 
  DocumentRecord, 
  INDIA_HEALTH_GRIEVANCE_GUIDANCE,
  FeedbackSchema
} from '@claimclarity/shared';
import multer from 'multer';
import crypto from 'crypto';
import { extractPdfText } from '../services/documentExtractor.js';
import { runAnalysisPipeline } from '../services/analysisEngine.js';
import { validateCitation } from '../services/citationValidator.js';
import { z } from 'zod';

export const router = Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param || '';
}

// Strict PDF Magic Number Check (Buffer header must be '%PDF-')
function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).toString('ascii') === '%PDF-';
}

// Sanitize filename to prevent directory traversal
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const upload = multer({
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type: Only PDF documents are supported.'));
    }
  }
});

// GET /api/v1/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ClaimClarity API',
  });
});

// GET /api/v1/guidance/india
router.get('/guidance/india', (_req: Request, res: Response) => {
  res.json({
    title: 'India Health Insurance Grievance & Escalation Framework',
    statutory_basis: 'IRDAI (Protection of Policyholders\' Interests and Allied Matters) Regulations',
    steps: INDIA_HEALTH_GRIEVANCE_GUIDANCE,
    disclaimer: 'This guidance is strictly educational. Confirm current procedural rules directly on official portals before filing.',
  });
});

// GET /api/v1/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});

// GET /api/v1/cases - List cases belonging to authenticated user
router.get('/cases', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userCases = Array.from(memoryStore.cases.values()).filter(
    c => c.user_id === userId && !c.deleted_at
  );
  res.json({ cases: userCases });
});

// POST /api/v1/cases - Create new case with explicit consent
router.post('/cases', requireAuth, (req: Request, res: Response) => {
  try {
    const input = CreateCaseInputSchema.parse(req.body);
    const newCase: Case = {
      id: crypto.randomUUID(),
      user_id: req.user!.id,
      title: input.title,
      claim_type: input.claim_type,
      insurer_name: input.insurer_name,
      claim_reference: input.claim_reference || null,
      status: input.status,
      policy_number: input.policy_number || null,
      user_notes: input.user_notes || null,
      consent_version: 'v1.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    memoryStore.cases.set(newCase.id, newCase);
    res.status(201).json({ case: newCase });
  } catch (err: any) {
    res.status(400).json({ error: 'Validation Failed', details: err.errors || err.message });
  }
});

// GET /api/v1/cases/:caseId - Get specific case
router.get('/cases/:caseId', requireAuth, (req: Request, res: Response) => {
  const c = memoryStore.cases.get(getParam(req.params.caseId));
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access to case.' });
  }
  res.json({ case: c });
});

// DELETE /api/v1/cases/:caseId - Soft delete / wipe case and documents
router.delete('/cases/:caseId', requireAuth, (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized operation.' });
  }

  const isHardDelete = req.query.hard === 'true';

  if (isHardDelete) {
    // Complete hard erasure
    memoryStore.cases.delete(caseId);
  } else {
    // Soft delete case record
    c.deleted_at = new Date().toISOString();
  }

  // Cascade deletion wipe across memory records
  memoryStore.findings.delete(caseId);
  memoryStore.checklistItems.delete(caseId);
  memoryStore.drafts.delete(caseId);

  // Remove child documents and extracted blocks
  const docIdsToDelete: string[] = [];
  for (const doc of memoryStore.documents.values()) {
    if (doc.case_id === caseId) {
      docIdsToDelete.push(doc.id);
    }
  }
  for (const docId of docIdsToDelete) {
    memoryStore.documents.delete(docId);
    memoryStore.documentBlocks.delete(docId);
  }

  res.json({
    success: true,
    erasure_type: isHardDelete ? 'hard_erasure' : 'soft_deletion',
    message: isHardDelete 
      ? 'Case, documents, extracted blocks, and drafts completely expunged.'
      : 'Case soft-deleted and all associated document blocks and findings wiped securely.'
  });
});

// GET /api/v1/cases/:caseId/documents - Get documents for case
router.get('/cases/:caseId/documents', requireAuth, (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access.' });
  }

  const docs = Array.from(memoryStore.documents.values()).filter(d => d.case_id === c.id);
  res.json({ documents: docs });
});

// POST /api/v1/cases/:caseId/documents - Upload document
router.post('/cases/:caseId/documents', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const c = memoryStore.cases.get(caseId);
    if (!c || c.deleted_at) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (c.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized upload attempt.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided.' });
    }

    // Deep inspect PDF magic number signature
    if (!isValidPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ 
        error: 'Invalid file signature', 
        message: 'The uploaded file does not match a valid PDF structure.' 
      });
    }

    // Verify per-case document limit (e.g. 10 documents)
    const existingDocs = Array.from(memoryStore.documents.values()).filter(d => d.case_id === c.id);
    if (existingDocs.length >= 10) {
      return res.status(400).json({
        error: 'Limit Exceeded',
        message: 'Maximum document limit (10 documents) reached for this case.'
      });
    }

    const docType = req.body.document_type || 'other_evidence';
    const docId = crypto.randomUUID();
    const safeFilename = sanitizeFilename(req.file.originalname);

    const docRecord: DocumentRecord = {
      id: docId,
      case_id: c.id,
      filename: safeFilename,
      storage_path: `cases/${c.id}/${docId}_${safeFilename}`,
      file_type: 'application/pdf',
      file_size_bytes: req.file.size,
      document_type: docType,
      page_count: 1,
      extraction_status: 'extracting',
      extraction_error: null,
      created_at: new Date().toISOString(),
    };

    memoryStore.documents.set(docId, docRecord);

    // Run PDF text extraction
    const extraction = await extractPdfText(req.file.buffer, docId, c.id);
    if (extraction.success) {
      docRecord.page_count = extraction.pageCount;
      docRecord.extraction_status = 'extracted';
      const allBlocks = extraction.pages.flatMap(p => p.blocks);
      memoryStore.documentBlocks.set(docId, allBlocks);
    } else {
      docRecord.extraction_status = 'failed';
      docRecord.extraction_error = extraction.error || 'Text extraction failed';
    }

    res.status(201).json({ document: docRecord });
  } catch (err: any) {
    res.status(500).json({ error: 'Upload Processing Failed', details: err.message });
  }
});

// POST /api/v1/cases/:caseId/analysis - Run source-grounded analysis
router.post('/cases/:caseId/analysis', requireAuth, async (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized operation.' });
  }

  const docs = Array.from(memoryStore.documents.values()).filter(d => d.case_id === c.id);
  const blocks: any[] = [];
  for (const doc of docs) {
    const docBlocks = memoryStore.documentBlocks.get(doc.id) || [];
    blocks.push(...docBlocks);
  }

  const result = await runAnalysisPipeline(c, docs, blocks);

  memoryStore.findings.set(c.id, result.findings);
  memoryStore.checklistItems.set(c.id, result.checklist);
  memoryStore.drafts.set(c.id, [result.draft]);

  res.json({
    success: true,
    findings: result.findings,
    checklist: result.checklist,
    draft: result.draft,
    summary: result.summary,
  });
});

// GET /api/v1/cases/:caseId/findings
router.get('/cases/:caseId/findings', requireAuth, (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access.' });
  }
  const findings = memoryStore.findings.get(c.id) || [];
  res.json({ findings });
});

// GET /api/v1/cases/:caseId/checklist
router.get('/cases/:caseId/checklist', requireAuth, (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access.' });
  }
  const items = memoryStore.checklistItems.get(c.id) || [];
  res.json({ items });
});

// PATCH /api/v1/checklist/:itemId - Update item status with tenant check
const UpdateChecklistSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'not_applicable']),
});

router.patch('/checklist/:itemId', requireAuth, (req: Request, res: Response) => {
  const parseResult = UpdateChecklistSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid checklist status' });
  }

  const itemId = getParam(req.params.itemId);
  let targetItem: any = null;
  let owningCaseId: string | null = null;

  for (const [caseId, items] of memoryStore.checklistItems.entries()) {
    const found = items.find(i => i.id === itemId);
    if (found) {
      targetItem = found;
      owningCaseId = caseId;
      break;
    }
  }

  if (!targetItem || !owningCaseId) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  // Verify ownership of the parent case
  const c = memoryStore.cases.get(owningCaseId);
  if (!c || c.deleted_at || c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'You cannot edit another user\'s checklist.' });
  }

  targetItem.status = parseResult.data.status;
  targetItem.updated_at = new Date().toISOString();
  res.json({ item: targetItem });
});

// GET /api/v1/cases/:caseId/drafts
router.get('/cases/:caseId/drafts', requireAuth, (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access.' });
  }
  const drafts = memoryStore.drafts.get(c.id) || [];
  res.json({ drafts });
});

// PATCH /api/v1/drafts/:draftId - Update draft content with tenant check
const UpdateDraftSchema = z.object({
  body: z.string().max(20000).optional(),
  subject: z.string().max(500).optional(),
});

router.patch('/drafts/:draftId', requireAuth, (req: Request, res: Response) => {
  const parseResult = UpdateDraftSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid draft update payload', details: parseResult.error.errors });
  }

  const draftId = getParam(req.params.draftId);
  let targetDraft: any = null;
  let owningCaseId: string | null = null;

  for (const [caseId, drafts] of memoryStore.drafts.entries()) {
    const found = drafts.find(d => d.id === draftId);
    if (found) {
      targetDraft = found;
      owningCaseId = caseId;
      break;
    }
  }

  if (!targetDraft || !owningCaseId) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  // Verify ownership of the parent case
  const c = memoryStore.cases.get(owningCaseId);
  if (!c || c.deleted_at || c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'You cannot edit another user\'s draft.' });
  }

  if (parseResult.data.body) targetDraft.body = parseResult.data.body;
  if (parseResult.data.subject) targetDraft.subject = parseResult.data.subject;
  targetDraft.updated_at = new Date().toISOString();

  res.json({ draft: targetDraft });
});

// POST /api/v1/cases/:caseId/feedback
const CreateFeedbackSchema = z.object({
  finding_id: z.string().uuid().optional().nullable(),
  rating: z.enum(['helpful', 'inaccurate', 'confusing', 'incomplete']),
  correction_text: z.string().max(2000).optional().nullable(),
});

router.post('/cases/:caseId/feedback', requireAuth, (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const c = memoryStore.cases.get(caseId);
  if (!c || c.deleted_at) {
    return res.status(404).json({ error: 'Case not found' });
  }
  if (c.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized feedback submission.' });
  }

  const parseResult = CreateFeedbackSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid feedback submission', details: parseResult.error.errors });
  }

  memoryStore.feedback.push({
    id: crypto.randomUUID(),
    case_id: caseId,
    finding_id: parseResult.data.finding_id || null,
    rating: parseResult.data.rating,
    correction_text: parseResult.data.correction_text || null,
    created_at: new Date().toISOString(),
  });
  res.status(201).json({ success: true, message: 'Feedback recorded. Thank you for helping improve claim guidance.' });
});
