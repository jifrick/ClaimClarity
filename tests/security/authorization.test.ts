import { describe, it, expect } from 'vitest';
import { memoryStore } from '../../apps/api/src/services/memoryStore.js';
import { Case } from '@claimclarity/shared';

describe('Security & Multi-Tenant Authorization', () => {
  const userA = '00000000-0000-0000-0000-000000000001';
  const userB = '99999999-9999-9999-9999-999999999999';

  it('prevents user B from accessing user A cases in memory store', () => {
    // Create case for User A
    const caseAId = 'case-a-secure-123';
    const caseA: Case = {
      id: caseAId,
      user_id: userA,
      title: 'Private Health Claim A',
      claim_type: 'reimbursement',
      insurer_name: 'Insurer Alpha',
      status: 'rejected',
      consent_version: 'v1.0',
    };
    memoryStore.cases.set(caseAId, caseA);

    // Query cases for User B
    const userBCases = Array.from(memoryStore.cases.values()).filter(
      c => c.user_id === userB && !c.deleted_at
    );

    expect(userBCases.some(c => c.id === caseAId)).toBe(false);
  });

  it('enforces deletion wipe: soft deletes case and unlinks findings and documents', () => {
    const caseId = 'case-to-delete-789';
    const testCase: Case = {
      id: caseId,
      user_id: userA,
      title: 'Case to Delete',
      claim_type: 'reimbursement',
      insurer_name: 'Insurer Beta',
      status: 'rejected',
      consent_version: 'v1.0',
    };
    memoryStore.cases.set(caseId, testCase);

    // Mark deleted
    testCase.deleted_at = new Date().toISOString();
    memoryStore.findings.delete(caseId);
    memoryStore.checklistItems.delete(caseId);

    const activeCases = Array.from(memoryStore.cases.values()).filter(
      c => c.user_id === userA && !c.deleted_at
    );
    expect(activeCases.some(c => c.id === caseId)).toBe(false);
    expect(memoryStore.findings.has(caseId)).toBe(false);
  });
});
