import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getStorage } from '../services/storage/index.js';
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

// Helper to check case existence and ownership for tenant-aware 403 vs 404 responses
async function checkCaseAccess(caseId: string, userId: string) {
  const storage = getStorage();
  const rawCase = await storage.getCaseRaw(caseId);
  if (!rawCase || rawCase.deleted_at) {
    return { status: 404 as const, error: 'Case not found', case: null };
  }
  if (rawCase.user_id !== userId) {
    return { status: 403 as const, error: 'Forbidden', message: 'Unauthorized access to case.', case: null };
  }
  return { status: 200 as const, case: rawCase };
}

// GET /api/v1/health
router.get('/health', (_req: Request, res: Response) => {
  const storage = getStorage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ClaimClarity API',
    storage_adapter: storage.name,
    storage_persistent: storage.isPersistent,
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
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const profile = await storage.getProfile(req.user!.id);
    res.json({
      user: req.user,
      profile,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve user profile', details: err.message });
  }
});

// GET /api/v1/cases - List cases belonging to authenticated user
router.get('/cases', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const userCases = await storage.getCases(req.user!.id);
    res.json({ cases: userCases });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to query cases', details: err.message });
  }
});

// POST /api/v1/cases - Create new case with explicit consent
router.post('/cases', requireAuth, async (req: Request, res: Response) => {
  try {
    const input = CreateCaseInputSchema.parse(req.body);
    const storage = getStorage();

    const newCase = await storage.createCase({
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
    });

    res.status(201).json({ case: newCase });
  } catch (err: any) {
    res.status(400).json({ error: 'Validation Failed', details: err.errors || err.message });
  }
});

// GET /api/v1/cases/:caseId - Get specific case
router.get('/cases/:caseId', requireAuth, async (req: Request, res: Response) => {
  try {
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }
    res.json({ case: access.case });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// DELETE /api/v1/cases/:caseId - Soft delete / wipe case and documents
router.delete('/cases/:caseId', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const isHardDelete = req.query.hard === 'true';
    const result = await storage.deleteCase(caseId, req.user!.id, isHardDelete);
    res.json({
      success: true,
      erasure_type: result.erasureType,
      deleted_resources: result.deletedResources,
      limitations: result.limitations || [],
      message: result.message,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Deletion failed', details: err.message });
  }
});

// GET /api/v1/cases/:caseId/documents - Get documents for case
router.get('/cases/:caseId/documents', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const docs = await storage.getDocuments(access.case.id, req.user!.id);
    res.json({ documents: docs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve documents', details: err.message });
  }
});

// POST /api/v1/cases/:caseId/documents - Upload document
router.post('/cases/:caseId/documents', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const c = access.case;

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
    const existingDocs = await storage.getDocuments(c.id, req.user!.id);
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

    await storage.createDocument(docRecord, req.user!.id);

    // Run PDF text extraction
    const extraction = await extractPdfText(req.file.buffer, docId, c.id);
    if (extraction.success) {
      docRecord.page_count = extraction.pageCount;
      docRecord.extraction_status = extraction.status;
      const allBlocks = extraction.pages.flatMap(p => p.blocks);
      await storage.saveDocumentBlocks(allBlocks, req.user!.id);
      await storage.updateDocumentExtraction(docId, req.user!.id, {
        page_count: extraction.pageCount,
        extraction_status: extraction.status,
        extraction_error: null,
      });
    } else {
      docRecord.extraction_status = 'failed';
      docRecord.extraction_error = extraction.error || 'Text extraction failed';
      await storage.updateDocumentExtraction(docId, req.user!.id, {
        extraction_status: 'failed',
        extraction_error: docRecord.extraction_error,
      });
    }

    res.status(201).json({ document: docRecord });
  } catch (err: any) {
    res.status(500).json({ error: 'Upload Processing Failed', details: err.message });
  }
});

// POST /api/v1/cases/:caseId/analysis - Run source-grounded analysis
router.post('/cases/:caseId/analysis', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const c = access.case;
    const docs = await storage.getDocuments(c.id, req.user!.id);
    const blocks = await storage.getCaseBlocks(c.id, req.user!.id);

    const result = await runAnalysisPipeline(c, docs, blocks);

    await storage.saveFindings(c.id, result.findings, req.user!.id);
    await storage.saveChecklist(c.id, result.checklist, req.user!.id);
    await storage.saveDrafts(c.id, [result.draft], req.user!.id);

    res.json({
      success: true,
      findings: result.findings,
      checklist: result.checklist,
      draft: result.draft,
      summary: result.summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
});

// GET /api/v1/cases/:caseId/findings
router.get('/cases/:caseId/findings', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const findings = await storage.getFindings(access.case.id, req.user!.id);
    res.json({ findings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve findings', details: err.message });
  }
});

// GET /api/v1/cases/:caseId/checklist
router.get('/cases/:caseId/checklist', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const items = await storage.getChecklist(access.case.id, req.user!.id);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve checklist', details: err.message });
  }
});

// PATCH /api/v1/checklist/:itemId - Update item status with tenant check
const UpdateChecklistSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'not_applicable']),
});

router.patch('/checklist/:itemId', requireAuth, async (req: Request, res: Response) => {
  const parseResult = UpdateChecklistSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid checklist status' });
  }

  try {
    const storage = getStorage();
    const itemId = getParam(req.params.itemId);
    const updated = await storage.updateChecklistItemStatus(itemId, parseResult.data.status, req.user!.id);
    if (!updated) {
      return res.status(403).json({ error: 'Forbidden', message: 'You cannot edit another user\'s checklist or item not found.' });
    }
    res.json({ item: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Checklist update failed', details: err.message });
  }
});

// GET /api/v1/cases/:caseId/drafts
router.get('/cases/:caseId/drafts', requireAuth, async (req: Request, res: Response) => {
  try {
    const storage = getStorage();
    const caseId = getParam(req.params.caseId);
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    const drafts = await storage.getDrafts(access.case.id, req.user!.id);
    res.json({ drafts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve drafts', details: err.message });
  }
});

// PATCH /api/v1/drafts/:draftId - Update draft content with tenant check
const UpdateDraftSchema = z.object({
  body: z.string().max(20000).optional(),
  subject: z.string().max(500).optional(),
});

router.patch('/drafts/:draftId', requireAuth, async (req: Request, res: Response) => {
  const parseResult = UpdateDraftSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid draft update payload', details: parseResult.error.errors });
  }

  try {
    const storage = getStorage();
    const draftId = getParam(req.params.draftId);
    const updated = await storage.updateDraft(draftId, parseResult.data, req.user!.id);
    if (!updated) {
      return res.status(403).json({ error: 'Forbidden', message: 'You cannot edit another user\'s draft or draft not found.' });
    }
    res.json({ draft: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Draft update failed', details: err.message });
  }
});

// POST /api/v1/cases/:caseId/feedback
const CreateFeedbackSchema = z.object({
  finding_id: z.string().uuid().optional().nullable(),
  rating: z.enum(['helpful', 'inaccurate', 'confusing', 'incomplete']),
  correction_text: z.string().max(2000).optional().nullable(),
});

router.post('/cases/:caseId/feedback', requireAuth, async (req: Request, res: Response) => {
  const caseId = getParam(req.params.caseId);
  const parseResult = CreateFeedbackSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid feedback submission', details: parseResult.error.errors });
  }

  try {
    const storage = getStorage();
    const access = await checkCaseAccess(caseId, req.user!.id);
    if (access.status !== 200) {
      return res.status(access.status).json({ error: access.error, message: access.message });
    }

    await storage.createFeedback({
      case_id: caseId,
      finding_id: parseResult.data.finding_id || null,
      rating: parseResult.data.rating,
      correction_text: parseResult.data.correction_text || null,
    }, req.user!.id);

    res.status(201).json({ success: true, message: 'Feedback recorded. Thank you for helping improve claim guidance.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Feedback submission failed', details: err.message });
  }
});
