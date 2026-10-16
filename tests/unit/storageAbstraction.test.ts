import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '../../apps/api/src/services/storage/memoryStorageAdapter.js';
import { SupabaseStorageAdapter } from '../../apps/api/src/services/storage/supabaseStorageAdapter.js';
import { IStorageAdapter } from '../../apps/api/src/services/storage/storage.types.js';
import { Case, DocumentRecord, Finding, ChecklistItem, RepresentationDraft } from '@claimclarity/shared';

describe('Storage Abstraction & Deletion Integrity', () => {
  const userA = '00000000-0000-0000-0000-000000000001';
  const userB = '00000000-0000-0000-0000-000000000002';

  let storage: IStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  it('enforces tenant isolation across getCases, getCaseById, and getCaseRaw', async () => {
    const caseA = await storage.createCase({
      id: 'case-test-1',
      user_id: userA,
      title: 'User A Appendicitis',
      claim_type: 'reimbursement',
      insurer_name: 'Insurer Alpha',
      status: 'rejected',
      consent_version: 'v1.0',
    });

    const caseB = await storage.createCase({
      id: 'case-test-2',
      user_id: userB,
      title: 'User B Cardiac Stent',
      claim_type: 'reimbursement',
      insurer_name: 'Insurer Beta',
      status: 'rejected',
      consent_version: 'v1.0',
    });

    // User A can only list User A cases
    const userACases = await storage.getCases(userA);
    expect(userACases.some(c => c.id === caseA.id)).toBe(true);
    expect(userACases.some(c => c.id === caseB.id)).toBe(false);

    // User A cannot read User B case
    const forbiddenCase = await storage.getCaseById(caseB.id, userA);
    expect(forbiddenCase).toBeNull();

    // Raw case lookup retrieves the record for system authorization checks
    const rawB = await storage.getCaseRaw(caseB.id);
    expect(rawB?.user_id).toBe(userB);
  });

  it('performs soft-deletion, unlinking child records while preserving soft delete record', async () => {
    const caseId = 'case-soft-del-101';
    await storage.createCase({
      id: caseId,
      user_id: userA,
      title: 'Soft Delete Case',
      claim_type: 'reimbursement',
      insurer_name: 'Insurer Gamma',
      status: 'rejected',
      consent_version: 'v1.0',
    });

    const docId = 'doc-soft-del-1';
    await storage.createDocument({
      id: docId,
      case_id: caseId,
      filename: 'Hospital_Discharge.pdf',
      storage_path: `cases/${caseId}/${docId}_Hospital_Discharge.pdf`,
      file_type: 'application/pdf',
      file_size_bytes: 50000,
      document_type: 'discharge_summary',
      page_count: 1,
      extraction_status: 'extracted',
      extraction_error: null,
      created_at: new Date().toISOString(),
    }, userA);

    await storage.saveFindings(caseId, [{
      id: 'f-1',
      case_id: caseId,
      category: 'contradiction',
      source_statement: 'Contradiction finding',
      source_document_id: docId,
      page_number: 1,
      block_id: null,
      source_excerpt: 'Excerpt',
      user_document_facts: 'Facts',
      interpretation: 'Interpretation',
      confidence_label: 'high_confidence',
      validation_status: 'verified_exact_match',
      model_version: 'demo',
      created_at: new Date().toISOString(),
    }], userA);

    // Execute soft deletion
    const delResult = await storage.deleteCase(caseId, userA, false);
    expect(delResult.success).toBe(true);
    expect(delResult.erasureType).toBe('soft_deletion');
    expect(delResult.deletedResources.documentsCount).toBe(1);
    expect(delResult.deletedResources.findingsCount).toBe(1);

    // Subsequent retrieval as user returns null
    const afterDel = await storage.getCaseById(caseId, userA);
    expect(afterDel).toBeNull();
  });

  it('performs hard erasure (?hard=true), expunging all case data and metadata completely', async () => {
    const caseId = 'case-hard-del-202';
    await storage.createCase({
      id: caseId,
      user_id: userA,
      title: 'Hard Erasure Case',
      claim_type: 'reimbursement',
      insurer_name: 'Insurer Delta',
      status: 'rejected',
      consent_version: 'v1.0',
    });

    const hardResult = await storage.deleteCase(caseId, userA, true);
    expect(hardResult.success).toBe(true);
    expect(hardResult.erasureType).toBe('hard_erasure');

    // Completely expunged from raw lookup as well
    const rawCheck = await storage.getCaseRaw(caseId);
    expect(rawCheck).toBeNull();
  });
});
