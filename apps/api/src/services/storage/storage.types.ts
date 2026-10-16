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

export interface StorageDeletionResult {
  success: boolean;
  erasureType: 'soft_deletion' | 'hard_erasure';
  deletedResources: {
    case: boolean;
    documentsCount: number;
    blocksCount: number;
    findingsCount: number;
    checklistCount: number;
    draftsCount: number;
    feedbackCount: number;
    storageFilesCount: number;
  };
  limitations?: string[];
  message: string;
}

export interface IStorageAdapter {
  readonly name: string;
  readonly isPersistent: boolean;

  // Profile operations
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile>;

  // Case operations
  getCases(userId: string): Promise<Case[]>;
  getCaseById(caseId: string, userId: string): Promise<Case | null>;
  getCaseRaw(caseId: string): Promise<Case | null>;
  createCase(caseData: Omit<Case, 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Case>;
  deleteCase(caseId: string, userId: string, hardDelete?: boolean): Promise<StorageDeletionResult>;

  // Document operations
  getDocuments(caseId: string, userId: string): Promise<DocumentRecord[]>;
  getDocumentById(docId: string, userId: string): Promise<DocumentRecord | null>;
  createDocument(doc: DocumentRecord, userId: string): Promise<DocumentRecord>;
  updateDocumentExtraction(
    docId: string,
    userId: string,
    update: {
      page_count?: number;
      extraction_status: DocumentRecord['extraction_status'];
      extraction_error?: string | null;
    }
  ): Promise<DocumentRecord>;

  // Document block operations
  getDocumentBlocks(docId: string, userId: string): Promise<DocumentBlock[]>;
  getCaseBlocks(caseId: string, userId: string): Promise<DocumentBlock[]>;
  saveDocumentBlocks(blocks: DocumentBlock[], userId: string): Promise<void>;

  // Grounded findings
  getFindings(caseId: string, userId: string): Promise<Finding[]>;
  saveFindings(caseId: string, findings: Finding[], userId: string): Promise<void>;

  // Action checklist
  getChecklist(caseId: string, userId: string): Promise<ChecklistItem[]>;
  saveChecklist(caseId: string, items: ChecklistItem[], userId: string): Promise<void>;
  updateChecklistItemStatus(
    itemId: string,
    status: ChecklistItem['status'],
    userId: string
  ): Promise<ChecklistItem | null>;

  // Representation drafts
  getDrafts(caseId: string, userId: string): Promise<RepresentationDraft[]>;
  saveDrafts(caseId: string, drafts: RepresentationDraft[], userId: string): Promise<void>;
  updateDraft(
    draftId: string,
    update: { body?: string; subject?: string },
    userId: string
  ): Promise<RepresentationDraft | null>;

  // Feedback & Audit
  createFeedback(feedback: Omit<Feedback, 'id' | 'created_at'>, userId: string): Promise<Feedback>;
  createAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): Promise<AuditEvent>;
}
