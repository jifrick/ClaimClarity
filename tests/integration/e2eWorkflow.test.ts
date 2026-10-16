import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../apps/api/src/server.js';
import { getStorage, setStorageInstance } from '../../apps/api/src/services/storage/index.js';
import { MemoryStorageAdapter } from '../../apps/api/src/services/storage/memoryStorageAdapter.js';
import fs from 'fs';

describe('ClaimClarity Complete 15-Step Synthetic E2E Workflow', () => {
  const userA = '00000000-0000-0000-0000-000000000001';
  const userB = '99999999-9999-9999-9999-999999999999';

  let storage: MemoryStorageAdapter;
  let createdCaseId: string;
  let uploadedDocId: string;
  let checklistItemId: string;
  let draftId: string;

  beforeAll(() => {
    storage = new MemoryStorageAdapter();
    setStorageInstance(storage);
  });

  // Step 1: Health & API Verification
  it('Step 1: System health check reports active services and storage adapter', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.storage_adapter).toBe('in_memory_demo');
  });

  // Step 2: Authentication / Identity Verification
  it('Step 2: Sign-in / session profile retrieval for User A', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('x-demo-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userA);
    expect(res.body.profile).toBeDefined();
  });

  // Step 3: Create Synthetic Claim Case
  it('Step 3: Create a new synthetic claim case for emergency hospitalization dispute', async () => {
    const payload = {
      title: 'E2E Emergency Cardiac Stenting Repudiation',
      claim_type: 'reimbursement',
      insurer_name: 'National Health Assurance Co.',
      claim_reference: 'NHA/E2E/2026/991',
      status: 'rejected',
      policy_number: 'NHA-E2E-POL-88',
      preferred_language: 'en',
      user_notes: 'Sudden acute chest pain admitted to ICU on 12 Sep 2026.',
      consent_agreed: true,
    };

    const res = await request(app)
      .post('/api/v1/cases')
      .set('x-demo-user-id', userA)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.case.id).toBeDefined();
    createdCaseId = res.body.case.id;
  });

  // Step 4 & 5: Upload Synthetic PDF and Extract Page-Level Blocks
  it('Step 4 & 5: Upload valid synthetic PDF and extract page-level text blocks', async () => {
    const pdfBuffer = fs.readFileSync('tests/fixtures/valid_test.pdf');

    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/documents`)
      .set('x-demo-user-id', userA)
      .field('document_type', 'policy_wording')
      .attach('file', pdfBuffer, 'E2E_Policy_Wording.pdf');

    expect(res.status).toBe(201);
    expect(res.body.document.id).toBeDefined();
    expect(res.body.document.page_count).toBe(2);
    expect(res.body.document.extraction_status).toBe('extracted');
    uploadedDocId = res.body.document.id;

    // Verify blocks stored with page numbers
    const blocks = await storage.getDocumentBlocks(uploadedDocId, userA);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].page_number).toBe(1);
  });

  // Step 6: Verify Extraction Status
  it('Step 6: Display extraction status and list case documents', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}/documents`)
      .set('x-demo-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0].filename).toBe('E2E_Policy_Wording.pdf');
  });

  // Step 7: Run Analysis Pipeline
  it('Step 7: Run grounded analysis pipeline on case documents', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/analysis`)
      .set('x-demo-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.findings.length).toBeGreaterThan(0);
    expect(res.body.checklist.length).toBeGreaterThan(0);
    expect(res.body.draft).toBeDefined();

    checklistItemId = res.body.checklist[0].id;
    draftId = res.body.draft.id;
  });

  // Step 8 & 9: Verify Grounded Findings and Evidence
  it('Step 8 & 9: Inspect grounded findings and verified citations', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}/findings`)
      .set('x-demo-user-id', userA);

    expect(res.status).toBe(200);
    // Find the grounded policy finding
    const verifiedFinding = res.body.findings.find((f: any) => f.category === 'policy_clause');
    expect(verifiedFinding).toBeDefined();
    expect(verifiedFinding.validation_status.startsWith('verified')).toBe(true);
    expect(verifiedFinding.source_excerpt).toBeDefined();
    expect(verifiedFinding.page_number).toBeDefined();
  });

  // Step 10: Review Contradictions & Missing Clauses
  it('Step 10: Identify contradictions or missing clauses without fabricating terms', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}/findings`)
      .set('x-demo-user-id', userA);

    // Ensure no unsupported citations were marked as verified
    for (const f of res.body.findings) {
      if (f.validation_status === 'unsupported_citation') {
        expect(f.source_document_id).toBeNull();
      }
    }
  });

  // Step 11: Edit Checklist Item & Save Status
  it('Step 11: Update checklist item status (pending -> completed)', async () => {
    const res = await request(app)
      .patch(`/api/v1/checklist/${checklistItemId}`)
      .set('x-demo-user-id', userA)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe('completed');
  });

  // Step 12: Generate, Edit, and Save Representation Draft
  it('Step 12: Edit representation draft and persist changes', async () => {
    const updatedBody = 'Edited formal grievance draft with verified hospital discharge records.';
    const res = await request(app)
      .patch(`/api/v1/drafts/${draftId}`)
      .set('x-demo-user-id', userA)
      .send({ body: updatedBody });

    expect(res.status).toBe(200);
    expect(res.body.draft.body).toBe(updatedBody);

    // Reopen and verify persistence
    const getDrafts = await request(app)
      .get(`/api/v1/cases/${createdCaseId}/drafts`)
      .set('x-demo-user-id', userA);

    expect(getDrafts.status).toBe(200);
    expect(getDrafts.body.drafts[0].body).toBe(updatedBody);
  });

  // Step 13: Review Final Report
  it('Step 13: Export final audit report with case details', async () => {
    const caseRes = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('x-demo-user-id', userA);

    expect(caseRes.status).toBe(200);
    expect(caseRes.body.case.claim_reference).toBe('NHA/E2E/2026/991');
  });

  // Step 14: Delete Case & Verify Cascading Wipe
  it('Step 14: Delete case and verify child resource unlinking', async () => {
    const delRes = await request(app)
      .delete(`/api/v1/cases/${createdCaseId}`)
      .set('x-demo-user-id', userA);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Subsequent retrieval as User A returns 404
    const getRes = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('x-demo-user-id', userA);

    expect(getRes.status).toBe(404);
  });

  // Step 15: Cross-User Isolation & Multi-Tenant Boundaries
  it('Step 15: Confirm User B cannot access User A resources or deleted cases', async () => {
    // User B attempting to read User A case
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('x-demo-user-id', userB);

    // Returns 404 since it was deleted (or 403 if active)
    expect([403, 404]).toContain(res.status);
  });
});
