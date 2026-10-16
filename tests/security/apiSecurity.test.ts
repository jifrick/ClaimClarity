import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../apps/api/src/server.js';
import { memoryStore } from '../../apps/api/src/services/memoryStore.js';
import { Case } from '@claimclarity/shared';

describe('API Security & Cross-Tenant Access Enforcement', () => {
  const userA = '00000000-0000-0000-0000-000000000001';
  const userB = '99999999-9999-9999-9999-999999999999';

  const caseAId = 'case-alpha-secure-101';
  const caseBId = 'case-bravo-secure-202';

  // Seed isolated cases for User A and User B
  const caseA: Case = {
    id: caseAId,
    user_id: userA,
    title: 'User A Appendectomy Claim',
    claim_type: 'reimbursement',
    insurer_name: 'Star Care Insurance',
    claim_reference: 'REF-USER-A-101',
    status: 'rejected',
    consent_version: 'v1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const caseB: Case = {
    id: caseBId,
    user_id: userB,
    title: 'User B Cardiac Surgery Claim',
    claim_type: 'reimbursement',
    insurer_name: 'HDFC Ergo Insurance',
    claim_reference: 'REF-USER-B-202',
    status: 'rejected',
    consent_version: 'v1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  memoryStore.cases.set(caseAId, caseA);
  memoryStore.cases.set(caseBId, caseB);

  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/cases');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('prevents User B from reading User A claim case (returns 403)', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseAId}`)
      .set('x-demo-user-id', userB);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('allows User A to read their own claim case (returns 200)', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${caseAId}`)
      .set('x-demo-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.case.id).toBe(caseAId);
  });

  it('prevents User B from uploading documents to User A case (returns 403)', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const res = await request(app)
      .post(`/api/v1/cases/${caseAId}/documents`)
      .set('x-demo-user-id', userB)
      .attach('file', validPdfBuffer, 'test_attack.pdf');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('prevents User B from triggering AI analysis on User A case (returns 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseAId}/analysis`)
      .set('x-demo-user-id', userB);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('prevents User B from deleting User A claim case (returns 403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/cases/${caseAId}`)
      .set('x-demo-user-id', userB);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(memoryStore.cases.get(caseAId)?.deleted_at).toBeNull();
  });

  it('prevents User B from updating User A checklist item (returns 403)', async () => {
    const itemId = 'item-user-a-chk-1';
    memoryStore.checklistItems.set(caseAId, [{
      id: itemId,
      case_id: caseAId,
      item_text: 'Verify renewal certificate',
      reason: 'Check 36 month waiting period',
      priority: 'high',
      evidence_refs: [],
      status: 'pending',
    }]);

    const res = await request(app)
      .patch(`/api/v1/checklist/${itemId}`)
      .set('x-demo-user-id', userB)
      .send({ status: 'completed' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('rejects fake non-PDF file upload with spoofed .pdf extension (Magic Number Validation)', async () => {
    const fakePdfBuffer = Buffer.from('<html><body>Fake PDF malicious payload</body></html>');
    const res = await request(app)
      .post(`/api/v1/cases/${caseAId}/documents`)
      .set('x-demo-user-id', userA)
      .attach('file', fakePdfBuffer, 'exploit.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid file signature');
  });

  it('verifies cascading wipe on case deletion', async () => {
    // Perform deletion as authorized user
    const deleteRes = await request(app)
      .delete(`/api/v1/cases/${caseAId}`)
      .set('x-demo-user-id', userA);

    expect(deleteRes.status).toBe(200);

    // Verify subsequent read returns 404
    const getRes = await request(app)
      .get(`/api/v1/cases/${caseAId}`)
      .set('x-demo-user-id', userA);

    expect(getRes.status).toBe(404);
  });

  it('supports hard-erasure to completely expunge case metadata (?hard=true)', async () => {
    const hardCaseId = 'case-hard-delete-999';
    memoryStore.cases.set(hardCaseId, {
      id: hardCaseId,
      user_id: userA,
      title: 'Hard Delete Test Case',
      claim_type: 'reimbursement',
      insurer_name: 'Test Insurer',
      status: 'rejected',
      consent_version: 'v1.0',
    });

    const res = await request(app)
      .delete(`/api/v1/cases/${hardCaseId}?hard=true`)
      .set('x-demo-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.erasure_type).toBe('hard_erasure');
    // Should be completely removed from map, not merely soft-deleted
    expect(memoryStore.cases.has(hardCaseId)).toBe(false);
  });
});
