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
import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageAdapter, StorageDeletionResult } from './storage.types.js';

export class SupabaseStorageAdapter implements IStorageAdapter {
  public readonly name = 'supabase_postgres';
  public readonly isPersistent = true;

  constructor(private client: SupabaseClient) {}

  // Profile operations
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get profile: ${error.message}`);
    }
    return data as Profile;
  }

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        id: profile.id,
        display_name: profile.display_name || 'Policyholder',
        preferred_language: profile.preferred_language || 'en',
        consent_given: profile.consent_given ?? true,
        consent_timestamp: profile.consent_timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
    return data as Profile;
  }

  // Case operations
  async getCases(userId: string): Promise<Case[]> {
    const { data, error } = await this.client
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to query cases: ${error.message}`);
    return (data || []) as Case[];
  }

  async getCaseById(caseId: string, userId: string): Promise<Case | null> {
    const { data, error } = await this.client
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get case: ${error.message}`);
    }
    return data as Case;
  }

  async getCaseRaw(caseId: string): Promise<Case | null> {
    const { data, error } = await this.client
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get case: ${error.message}`);
    }
    return data as Case;
  }

  async createCase(caseData: Omit<Case, 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Case> {
    const { data, error } = await this.client
      .from('cases')
      .insert({
        id: caseData.id,
        user_id: caseData.user_id,
        title: caseData.title,
        claim_type: caseData.claim_type,
        insurer_name: caseData.insurer_name,
        claim_reference: caseData.claim_reference || null,
        status: caseData.status,
        policy_number: caseData.policy_number || null,
        user_notes: caseData.user_notes || null,
        consent_version: caseData.consent_version || 'v1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create case: ${error.message}`);
    return data as Case;
  }

  async deleteCase(caseId: string, userId: string, hardDelete = false): Promise<StorageDeletionResult> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Case not found or unauthorized');

    // Retrieve documents to clean storage bucket files
    const docs = await this.getDocuments(caseId, userId);
    const filePaths = docs.map(d => d.storage_path).filter(Boolean);

    let storageFilesDeleted = 0;
    if (filePaths.length > 0) {
      try {
        const { error: storageErr } = await this.client.storage
          .from('claim-documents')
          .remove(filePaths);
        if (!storageErr) storageFilesDeleted = filePaths.length;
      } catch (e) {
        console.warn('Storage files cleanup notice:', e);
      }
    }

    if (hardDelete) {
      // Direct hard deletion cascades to foreign keys
      const { error: delErr } = await this.client
        .from('cases')
        .delete()
        .eq('id', caseId)
        .eq('user_id', userId);

      if (delErr) throw new Error(`Hard deletion failed: ${delErr.message}`);
    } else {
      // Soft deletion
      const { error: updateErr } = await this.client
        .from('cases')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', caseId)
        .eq('user_id', userId);

      if (updateErr) throw new Error(`Soft deletion failed: ${updateErr.message}`);
    }

    return {
      success: true,
      erasureType: hardDelete ? 'hard_erasure' : 'soft_deletion',
      deletedResources: {
        case: true,
        documentsCount: docs.length,
        blocksCount: 0,
        findingsCount: 0,
        checklistCount: 0,
        draftsCount: 0,
        feedbackCount: 0,
        storageFilesCount: storageFilesDeleted,
      },
      limitations: [
        'Storage files wiped from bucket. Database backups / WAL replication retention cannot be overwritten immediately by application layer.',
      ],
      message: hardDelete
        ? 'Case, child records, and private storage documents hard-deleted.'
        : 'Case soft-deleted and access disabled through RLS filter.',
    };
  }

  // Document operations
  async getDocuments(caseId: string, userId: string): Promise<DocumentRecord[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];

    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list documents: ${error.message}`);
    return (data || []) as DocumentRecord[];
  }

  async getDocumentById(docId: string, userId: string): Promise<DocumentRecord | null> {
    const { data, error } = await this.client
      .from('documents')
      .select('*, cases!inner(user_id, deleted_at)')
      .eq('id', docId)
      .eq('cases.user_id', userId)
      .is('cases.deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get document: ${error.message}`);
    }
    return data as DocumentRecord;
  }

  async createDocument(doc: DocumentRecord, userId: string): Promise<DocumentRecord> {
    const c = await this.getCaseById(doc.case_id, userId);
    if (!c) throw new Error('Unauthorized or invalid case');

    const { data, error } = await this.client
      .from('documents')
      .insert(doc)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to insert document: ${error.message}`);
    return data as DocumentRecord;
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

    const { data, error } = await this.client
      .from('documents')
      .update(update)
      .eq('id', docId)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update document: ${error.message}`);
    return data as DocumentRecord;
  }

  // Document blocks
  async getDocumentBlocks(docId: string, userId: string): Promise<DocumentBlock[]> {
    const doc = await this.getDocumentById(docId, userId);
    if (!doc) return [];

    const { data, error } = await this.client
      .from('document_blocks')
      .select('*')
      .eq('document_id', docId)
      .order('page_number', { ascending: true })
      .order('block_index', { ascending: true });

    if (error) throw new Error(`Failed to list document blocks: ${error.message}`);
    return (data || []) as DocumentBlock[];
  }

  async getCaseBlocks(caseId: string, userId: string): Promise<DocumentBlock[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];

    const { data, error } = await this.client
      .from('document_blocks')
      .select('*')
      .eq('case_id', caseId)
      .order('page_number', { ascending: true })
      .order('block_index', { ascending: true });

    if (error) throw new Error(`Failed to list case blocks: ${error.message}`);
    return (data || []) as DocumentBlock[];
  }

  async saveDocumentBlocks(blocks: DocumentBlock[], userId: string): Promise<void> {
    if (blocks.length === 0) return;
    const doc = await this.getDocumentById(blocks[0].document_id, userId);
    if (!doc) throw new Error('Unauthorized document blocks submission');

    const { error } = await this.client
      .from('document_blocks')
      .insert(blocks);

    if (error) throw new Error(`Failed to save document blocks: ${error.message}`);
  }

  // Findings
  async getFindings(caseId: string, userId: string): Promise<Finding[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];

    const { data, error } = await this.client
      .from('findings')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list findings: ${error.message}`);
    return (data || []) as Finding[];
  }

  async saveFindings(caseId: string, findings: Finding[], userId: string): Promise<void> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Unauthorized findings submission');

    // Wipe previous findings for case then insert fresh ones
    await this.client.from('findings').delete().eq('case_id', caseId);

    if (findings.length > 0) {
      const { error } = await this.client.from('findings').insert(findings);
      if (error) throw new Error(`Failed to save findings: ${error.message}`);
    }
  }

  // Checklist
  async getChecklist(caseId: string, userId: string): Promise<ChecklistItem[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];

    const { data, error } = await this.client
      .from('checklist_items')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to list checklist: ${error.message}`);
    return (data || []) as ChecklistItem[];
  }

  async saveChecklist(caseId: string, items: ChecklistItem[], userId: string): Promise<void> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Unauthorized checklist submission');

    await this.client.from('checklist_items').delete().eq('case_id', caseId);

    if (items.length > 0) {
      const { error } = await this.client.from('checklist_items').insert(items);
      if (error) throw new Error(`Failed to save checklist items: ${error.message}`);
    }
  }

  async updateChecklistItemStatus(
    itemId: string,
    status: ChecklistItem['status'],
    userId: string
  ): Promise<ChecklistItem | null> {
    // Check ownership via parent case
    const { data: item, error: fetchErr } = await this.client
      .from('checklist_items')
      .select('*, cases!inner(user_id, deleted_at)')
      .eq('id', itemId)
      .eq('cases.user_id', userId)
      .is('cases.deleted_at', null)
      .single();

    if (fetchErr || !item) return null;

    const { data, error } = await this.client
      .from('checklist_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update checklist item: ${error.message}`);
    return data as ChecklistItem;
  }

  // Drafts
  async getDrafts(caseId: string, userId: string): Promise<RepresentationDraft[]> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) return [];

    const { data, error } = await this.client
      .from('drafts')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list drafts: ${error.message}`);
    return (data || []) as RepresentationDraft[];
  }

  async saveDrafts(caseId: string, drafts: RepresentationDraft[], userId: string): Promise<void> {
    const c = await this.getCaseById(caseId, userId);
    if (!c) throw new Error('Unauthorized drafts submission');

    await this.client.from('drafts').delete().eq('case_id', caseId);

    if (drafts.length > 0) {
      const { error } = await this.client.from('drafts').insert(drafts);
      if (error) throw new Error(`Failed to save drafts: ${error.message}`);
    }
  }

  async updateDraft(
    draftId: string,
    update: { body?: string; subject?: string },
    userId: string
  ): Promise<RepresentationDraft | null> {
    const { data: draft, error: fetchErr } = await this.client
      .from('drafts')
      .select('*, cases!inner(user_id, deleted_at)')
      .eq('id', draftId)
      .eq('cases.user_id', userId)
      .is('cases.deleted_at', null)
      .single();

    if (fetchErr || !draft) return null;

    const { data, error } = await this.client
      .from('drafts')
      .update({
        ...update,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to update draft: ${error.message}`);
    return data as RepresentationDraft;
  }

  // Feedback & Audit
  async createFeedback(feedback: Omit<Feedback, 'id' | 'created_at'>, userId: string): Promise<Feedback> {
    const c = await this.getCaseById(feedback.case_id, userId);
    if (!c) throw new Error('Unauthorized feedback submission');

    const { data, error } = await this.client
      .from('feedback')
      .insert(feedback)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to insert feedback: ${error.message}`);
    return data as Feedback;
  }

  async createAuditEvent(event: Omit<AuditEvent, 'id' | 'created_at'>): Promise<AuditEvent> {
    const { data, error } = await this.client
      .from('audit_events')
      .insert(event)
      .select('*')
      .single();

    if (error) throw new Error(`Failed to insert audit event: ${error.message}`);
    return data as AuditEvent;
  }
}
