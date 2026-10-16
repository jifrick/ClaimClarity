import {
  Case,
  DocumentRecord,
  DocumentBlock,
  Finding,
  ChecklistItem,
  RepresentationDraft,
  Feedback,
  AuditEvent,
  Profile,
} from '@claimclarity/shared';
import crypto from 'crypto';
import { IStorageAdapter, StorageDeletionResult } from './storage.types.js';

export class MemoryStorageAdapter implements IStorageAdapter {
  public readonly name = 'in_memory_demo';
  public readonly isPersistent = false;

  public cases: Map<string, Case> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();
  public documentBlocks: Map<string, DocumentBlock[]> = new Map(); // docId -> blocks
  public findings: Map<string, Finding[]> = new Map(); // caseId -> findings
  public checklistItems: Map<string, ChecklistItem[]> = new Map(); // caseId -> items
  public drafts: Map<string, RepresentationDraft[]> = new Map(); // caseId -> drafts
  public profiles: Map<string, Profile> = new Map();
  public feedback: Feedback[] = [];
  public auditEvents: AuditEvent[] = [];

  constructor() {
    this.seedSyntheticDemo();
  }

  public seedSyntheticDemo() {
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const demoCaseId = '11111111-1111-1111-1111-111111111111';
    const docPolicyId = '22222222-2222-2222-2222-222222222221';
    const docRejectionId = '22222222-2222-2222-2222-222222222222';

    const demoCase: Case = {
      id: demoCaseId,
      user_id: demoUserId,
      title: 'Emergency Appendectomy Claim Rejection - Policy 2024/09',
      claim_type: 'reimbursement',
      insurer_name: 'Star Care General Insurance Co. Ltd.',
      claim_reference: 'CIR/2026/DEL/891244',
      status: 'rejected',
      policy_number: 'POL-HLT-9923841-A',
      user_notes: 'Admitted for sudden acute appendicitis on 14 Aug 2026. Claim of ₹1,42,000 rejected stating pre-existing condition waiting period, but policy has been active for 38 months.',
      consent_version: 'v1.0',
      created_at: new Date('2026-08-20T10:00:00Z').toISOString(),
      updated_at: new Date('2026-08-20T10:00:00Z').toISOString(),
      deleted_at: null,
    };
    this.cases.set(demoCaseId, demoCase);

    const docPolicy: DocumentRecord = {
      id: docPolicyId,
      case_id: demoCaseId,
      filename: 'StarCare_HealthOptima_PolicyWording.pdf',
      storage_path: `cases/${demoCaseId}/StarCare_HealthOptima_PolicyWording.pdf`,
      file_type: 'application/pdf',
      file_size_bytes: 482910,
      document_type: 'policy_wording',
      page_count: 24,
      extraction_status: 'extracted',
      extraction_error: null,
      created_at: new Date('2026-08-20T10:02:00Z').toISOString(),
    };

    const docRejection: DocumentRecord = {
      id: docRejectionId,
      case_id: demoCaseId,
      filename: 'Repudiation_Letter_CIR891244.pdf',
      storage_path: `cases/${demoCaseId}/Repudiation_Letter_CIR891244.pdf`,
      file_type: 'application/pdf',
      file_size_bytes: 142100,
      document_type: 'claim_rejection_letter',
      page_count: 2,
      extraction_status: 'extracted',
      extraction_error: null,
      created_at: new Date('2026-08-20T10:03:00Z').toISOString(),
    };

    this.documents.set(docPolicyId, docPolicy);
    this.documents.set(docRejectionId, docRejection);

    const policyBlocks: DocumentBlock[] = [
      {
        id: '33333333-3333-3333-3333-333333333301',
        document_id: docPolicyId,
        case_id: demoCaseId,
        page_number: 14,
        block_index: 0,
        text: 'Section 4.1: Pre-Existing Diseases (PED) Waiting Period - A waiting period of thirty-six (36) months of continuous coverage shall apply to all pre-existing medical conditions disclosed prior to inception.',
        extraction_confidence: 0.99,
        created_at: new Date().toISOString(),
      },
      {
        id: '33333333-3333-3333-3333-333333333302',
        document_id: docPolicyId,
        case_id: demoCaseId,
        page_number: 15,
        block_index: 1,
        text: 'Section 4.2 Exceptions to Waiting Periods: Emergency life-saving surgeries, acute sudden illnesses (including acute appendicitis requiring immediate laparotomy), and accidental injuries shall not be excluded under the waiting period provisions of Section 4.1.',
        extraction_confidence: 0.99,
        created_at: new Date().toISOString(),
      }
    ];

    const rejectionBlocks: DocumentBlock[] = [
      {
        id: '33333333-3333-3333-3333-333333333303',
        document_id: docRejectionId,
        case_id: demoCaseId,
        page_number: 1,
        block_index: 0,
        text: 'We regret to inform you that your claim CIR/2026/DEL/891244 has been repudiated under Policy Clause Section 4.1 (Pre-Existing Diseases Waiting Period).',
        extraction_confidence: 0.98,
        created_at: new Date().toISOString(),
      }
    ];

    this.documentBlocks.set(docPolicyId, policyBlocks);
    this.documentBlocks.set(docRejectionId, rejectionBlocks);

    const demoFindings: Finding[] = [
      {
        id: '44444444-4444-4444-4444-444444444401',
        case_id: demoCaseId,
        category: 'contradiction',
        source_statement: 'Repudiation under Section 4.1 conflicts with emergency surgery exception under Section 4.2.',
        source_document_id: docPolicyId,
        page_number: 15,
        block_id: '33333333-3333-3333-3333-333333333302',
        source_excerpt: 'Emergency life-saving surgeries, acute sudden illnesses (including acute appendicitis requiring immediate laparotomy), and accidental injuries shall not be excluded under the waiting period provisions of Section 4.1.',
        user_document_facts: 'Hospital records confirm emergency emergency appendectomy; policy continuous tenure is 38 months (exceeding the 36-month threshold regardless).',
        interpretation: 'The insurer repudiated citing the pre-existing disease waiting period, but policy Section 4.2 explicitly exempts acute appendicitis. Additionally, 38 months of continuous coverage satisfies the 36-month clause.',
        confidence_label: 'high_confidence',
        validation_status: 'verified_exact_match',
        missing_information: null,
        suggested_question: 'Why was Section 4.2 emergency exception not applied to an emergency appendectomy?',
        safety_note: 'Informational analysis only. Verify all representations with your policy schedule.',
        model_version: 'deterministic-verifier-v1',
        created_at: new Date().toISOString(),
      }
    ];
    this.findings.set(demoCaseId, demoFindings);

    const demoChecklist: ChecklistItem[] = [
      {
        id: '55555555-5555-5555-5555-555555555501',
        case_id: demoCaseId,
        item_text: 'Obtain Hospital Emergency Admission Certificate specifying acute onset',
        reason: 'Corroborates exception clause under Section 4.2 exempting emergency surgery from waiting periods.',
        priority: 'high',
        evidence_refs: ['StarCare_HealthOptima_PolicyWording.pdf p.15'],
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555502',
        case_id: demoCaseId,
        item_text: 'Collate continuous renewal premium receipts for all 4 years (38 months)',
        reason: 'Defeats Section 4.1 36-month clause on duration grounds alone.',
        priority: 'high',
        evidence_refs: ['StarCare_HealthOptima_PolicyWording.pdf p.14'],
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    ];
    this.checklistItems.set(demoCaseId, demoChecklist);

    const demoDraft: RepresentationDraft = {
      id: '66666666-6666-6666-6666-666666666601',
      case_id: demoCaseId,
      draft_type: 'grievance_representation',
      recipient_name: 'Grievance Redressal Officer (GRO), Star Care General Insurance Co. Ltd.',
      salutation: 'Respected Sir/Madam,',
      subject: 'Representation seeking review of repudiated Claim CIR/2026/DEL/891244 (Policy POL-HLT-9923841-A)',
      body: `To,
The Grievance Redressal Officer (GRO),
Star Care General Insurance Co. Ltd.

Subject: Formal Representation for Review of Repudiated Claim Ref: CIR/2026/DEL/891244 under Policy No: POL-HLT-9923841-A

Dear Grievance Redressal Officer,

I am writing to formally request a reconsideration of the repudiation decision dated 16 Aug 2026 regarding my health insurance claim for emergency laparoscopic appendectomy performed at Fortis Hospital.

1. Grounding in Policy Terms:
The repudiation notice cites Section 4.1 (Pre-Existing Diseases Waiting Period of 36 months). However, I direct your attention to Section 4.2 of the Policy Terms & Conditions Wording (Page 15), which explicitly provides:
"Emergency life-saving surgeries, acute sudden illnesses (including acute appendicitis requiring immediate laparotomy), and accidental injuries shall not be excluded under the waiting period provisions of Section 4.1."

2. Verified Policy Tenure:
Without prejudice to the emergency exemption above, the policy has been continuously active and renewed without lapse for 38 months (commencing 10 June 2023), exceeding the statutory 36-month waiting period threshold.

3. Request for Redressal:
In accordance with IRDAI (Protection of Policyholders' Interests and Allied Matters) Regulations, 2024, I request an expedited review and settlement within the 15-day regulatory timeline.

Sincerely,
Muhammed Jifri
Policyholder`,
      referenced_facts: [
        'Policy Clause Section 4.2 Emergency Exception',
        'Continuous coverage period of 38 months',
      ],
      supporting_documents_list: [
        'StarCare_HealthOptima_PolicyWording.pdf',
        'Repudiation_Letter_CIR891244.pdf'
      ],
      sign_off: 'Yours sincerely,',
      sender_name_placeholder: 'Muhammed Jifri',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.drafts.set(demoCaseId, [demoDraft]);
  }

  // Profile operations
  async getProfile(userId: string): Promise<Profile | null> {
    return this.profiles.get(userId) || {
      id: userId,
      display_name: 'Verified Policyholder',
      preferred_language: 'en',
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const existing = await this.getProfile(profile.id);
    const updated: Profile = {
      id: profile.id,
      display_name: profile.display_name || existing?.display_name || 'Policyholder',
      preferred_language: profile.preferred_language || existing?.preferred_language || 'en',
      consent_given: profile.consent_given ?? existing?.consent_given ?? true,
      consent_timestamp: profile.consent_timestamp || existing?.consent_timestamp || new Date().toISOString(),
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(profile.id, updated);
    return updated;
  }

  // Case operations
  async getCases(userId: string): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(
      c => c.user_id === userId && !c.deleted_at
    );
  }

  async getCaseById(caseId: string, userId: string): Promise<Case | null> {
    const c = this.cases.get(caseId);
    if (!c || c.deleted_at || c.user_id !== userId) return null;
    return c;
  }

  async getCaseRaw(caseId: string): Promise<Case | null> {
    const c = this.cases.get(caseId);
    if (!c || c.deleted_at) return null;
    return c;
  }

  async createCase(caseData: Omit<Case, 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Case> {
    const newCase: Case = {
      ...caseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    this.cases.set(newCase.id, newCase);
    return newCase;
  }

  async deleteCase(caseId: string, userId: string, hardDelete = false): Promise<StorageDeletionResult> {
    const c = this.cases.get(caseId);
    if (!c || c.user_id !== userId) {
      throw new Error('Case not found or unauthorized');
    }

    const docIdsToDelete: string[] = [];
    for (const doc of this.documents.values()) {
      if (doc.case_id === caseId) {
        docIdsToDelete.push(doc.id);
      }
    }

    let blocksWiped = 0;
    for (const docId of docIdsToDelete) {
      blocksWiped += (this.documentBlocks.get(docId) || []).length;
      this.documents.delete(docId);
      this.documentBlocks.delete(docId);
    }

    const findingsWiped = (this.findings.get(caseId) || []).length;
    const checklistWiped = (this.checklistItems.get(caseId) || []).length;
    const draftsWiped = (this.drafts.get(caseId) || []).length;

    this.findings.delete(caseId);
    this.checklistItems.delete(caseId);
    this.drafts.delete(caseId);

    if (hardDelete) {
      this.cases.delete(caseId);
    } else {
      c.deleted_at = new Date().toISOString();
    }

    return {
      success: true,
      erasureType: hardDelete ? 'hard_erasure' : 'soft_deletion',
      deletedResources: {
        case: true,
        documentsCount: docIdsToDelete.length,
        blocksCount: blocksWiped,
        findingsCount: findingsWiped,
        checklistCount: checklistWiped,
        draftsCount: draftsWiped,
        feedbackCount: 0,
        storageFilesCount: docIdsToDelete.length,
      },
      limitations: [
        'In-memory adapter: Data destroyed in memory, but server process logs may retain redacted metadata.',
      ],
      message: hardDelete
        ? 'Case, documents, blocks, and drafts completely expunged.'
        : 'Case marked soft-deleted and child resources unlinked securely.',
    };
  }

  // Document operations
  async getDocuments(caseId: string, userId: string): Promise<DocumentRecord[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];
    return Array.from(this.documents.values()).filter(d => d.case_id === caseId);
  }

  async getDocumentById(docId: string, userId: string): Promise<DocumentRecord | null> {
    const doc = this.documents.get(docId);
    if (!doc) return null;
    const c = await this.getCaseById(doc.case_id, userId);
    if (!c) return null;
    return doc;
  }

  async createDocument(doc: DocumentRecord, userId: string): Promise<DocumentRecord> {
    const c = await this.getCaseById(doc.case_id, userId);
    if (!c) throw new Error('Unauthorized or invalid case');
    this.documents.set(doc.id, doc);
    return doc;
  }

  async updateDocumentExtraction(
    docId: string,
    userId: string,
    update: {
      page_count?: number;
      extraction_status: DocumentRecord['extraction_status'];
      extraction_error?: string | null;
    }
  ): Promise<DocumentRecord> {
    const doc = await this.getDocumentById(docId, userId);
    if (!doc) throw new Error('Document not found or unauthorized');
    if (update.page_count !== undefined) doc.page_count = update.page_count;
    doc.extraction_status = update.extraction_status;
    doc.extraction_error = update.extraction_error || null;
    return doc;
  }

  // Document block operations
  async getDocumentBlocks(docId: string, userId: string): Promise<DocumentBlock[]> {
    const doc = await this.getDocumentById(docId, userId);
    if (!doc) return [];
    return this.documentBlocks.get(docId) || [];
  }

  async getCaseBlocks(caseId: string, userId: string): Promise<DocumentBlock[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];
    const docs = await this.getDocuments(caseId, userId);
    const blocks: DocumentBlock[] = [];
    for (const doc of docs) {
      blocks.push(...(this.documentBlocks.get(doc.id) || []));
    }
    return blocks;
  }

  async saveDocumentBlocks(blocks: DocumentBlock[], userId: string): Promise<void> {
    if (blocks.length === 0) return;
    const firstDoc = await this.getDocumentById(blocks[0].document_id, userId);
    if (!firstDoc) throw new Error('Unauthorized document block submission');
    this.documentBlocks.set(firstDoc.id, blocks);
  }

  // Findings
  async getFindings(caseId: string, userId: string): Promise<Finding[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];
    return this.findings.get(caseId) || [];
  }

  async saveFindings(caseId: string, findings: Finding[], userId: string): Promise<void> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Unauthorized case finding submission');
    this.findings.set(caseId, findings);
  }

  // Checklist
  async getChecklist(caseId: string, userId: string): Promise<ChecklistItem[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];
    return this.checklistItems.get(caseId) || [];
  }

  async saveChecklist(caseId: string, items: ChecklistItem[], userId: string): Promise<void> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Unauthorized checklist submission');
    this.checklistItems.set(caseId, items);
  }

  async updateChecklistItemStatus(
    itemId: string,
    status: ChecklistItem['status'],
    userId: string
  ): Promise<ChecklistItem | null> {
    for (const [caseId, items] of this.checklistItems.entries()) {
      const found = items.find(i => i.id === itemId);
      if (found) {
        const c = await this.getCaseById(caseId, userId);
        if (!c) return null;
        found.status = status;
        found.updated_at = new Date().toISOString();
        return found;
      }
    }
    return null;
  }

  // Drafts
  async getDrafts(caseId: string, userId: string): Promise<RepresentationDraft[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];
    return this.drafts.get(caseId) || [];
  }

  async saveDrafts(caseId: string, drafts: RepresentationDraft[], userId: string): Promise<void> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Unauthorized drafts submission');
    this.drafts.set(caseId, drafts);
  }

  async updateDraft(
    draftId: string,
    update: { body?: string; subject?: string },
    userId: string
  ): Promise<RepresentationDraft | null> {
    for (const [caseId, drafts] of this.drafts.entries()) {
      const found = drafts.find(d => d.id === draftId);
      if (found) {
        const c = await this.getCaseById(caseId, userId);
        if (!c) return null;
        if (update.body !== undefined) found.body = update.body;
        if (update.subject !== undefined) found.subject = update.subject;
        found.updated_at = new Date().toISOString();
        return found;
      }
    }
    return null;
  }

  // Feedback & Audit
  async createFeedback(feedback: Omit<Feedback, 'id' | 'created_at'>, userId: string): Promise<Feedback> {
    const c = await this.getCaseById(feedback.case_id, userId);
    if (!c) throw new Error('Unauthorized feedback submission');
    const newFeedback: Feedback = {
      ...feedback,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.feedback.push(newFeedback);
    return newFeedback;
  }

  async createAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): Promise<AuditEvent> {
    const newEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.auditEvents.push(newEvent);
    return newEvent;
  }
}
