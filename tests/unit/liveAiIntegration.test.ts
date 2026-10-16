import { describe, it, expect } from 'vitest';
import { runAnalysisPipeline } from '../../apps/api/src/services/analysisEngine.js';
import { LiveAIProviderAdapter, LiveAIProviderRequest, LiveAIProviderResponse } from '../../apps/api/src/services/aiProvider.types.js';
import { Case, DocumentRecord, DocumentBlock } from '@claimclarity/shared';

describe('Live AI Provider Adapter & Grounding Verification', () => {
  const caseId = '00000000-0000-0000-0000-000000000101';
  const docId = '00000000-0000-0000-0000-000000000202';

  const mockCase: Case = {
    id: caseId,
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Chemotherapy Daycare Settlement Claim',
    claim_type: 'reimbursement',
    insurer_name: 'Care Health Insurance',
    claim_reference: 'CIR/DAYCARE/2026/901',
    status: 'partially_settled',
    policy_number: 'CARE-POL-771',
    consent_version: 'v1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const mockDoc: DocumentRecord = {
    id: docId,
    case_id: caseId,
    filename: 'Care_Daycare_Schedule.pdf',
    storage_path: `cases/${caseId}/Care_Daycare_Schedule.pdf`,
    file_type: 'application/pdf',
    file_size_bytes: 120000,
    document_type: 'policy_wording',
    page_count: 5,
    extraction_status: 'extracted',
    extraction_error: null,
  };

  const mockBlocks: DocumentBlock[] = [
    {
      id: 'blk-1',
      document_id: docId,
      case_id: caseId,
      page_number: 3,
      block_index: 0,
      text: 'Section 3.4 Day Care Procedures: Medical advancements allow chemotherapy without 24 hours hospitalization. Day care treatments listed in Annexure A are payable up to the Sum Insured.',
      extraction_confidence: 0.98,
      created_at: new Date().toISOString(),
    }
  ];

  it('successfully integrates with a mock live AI provider, enforcing structured schemas and citation validation', async () => {
    const mockProvider: LiveAIProviderAdapter = {
      isConfigured: () => true,
      analyzeClaim: async (_req: LiveAIProviderRequest): Promise<LiveAIProviderResponse> => {
        return {
          provider: 'gemini',
          model: 'gemini-1.5-pro',
          output: {
            findings: [
              {
                category: 'policy_clause',
                source_statement: 'Section 3.4 covers daycare chemotherapy without 24h hospitalization requirement.',
                source_document_id: docId,
                page_number: 3,
                source_excerpt: 'Medical advancements allow chemotherapy without 24 hours hospitalization.',
                user_document_facts: 'Daycare chemotherapy bills totaling ₹65,000 were deducted by the insurer for lack of 24h stay.',
                interpretation: 'Policy explicitly recognizes daycare chemotherapy under Section 3.4, waiving the 24-hour stay requirement.',
                confidence_label: 'high_confidence',
                missing_information: null,
                suggested_question: 'Request insurer to re-evaluate the deduction under Section 3.4 Day Care Procedures.',
                safety_note: 'Ensure Annexure A schedule is referenced in representation.',
              }
            ],
            checklist: [
              {
                item_text: 'Attach Daycare Chemotherapy Discharge Summary',
                reason: 'Proves daycare procedure complies with Section 3.4 guidelines.',
                priority: 'high',
                evidence_refs: ['Care_Daycare_Schedule.pdf p.3'],
              }
            ],
            draft_subject: 'Representation on Daycare Chemotherapy Deduction - Policy CARE-POL-771',
            draft_body: 'Respected Grievance Officer, I request reconsideration under Section 3.4 Day Care Procedures...',
          }
        };
      }
    };

    const result = await runAnalysisPipeline(mockCase, [mockDoc], mockBlocks, mockProvider);

    expect(result.providerMode).toBe('live_ai');
    expect(result.providerName).toContain('gemini');
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].validation_status).toBe('verified_exact_match');
    expect(result.summary.verifiedCitations).toBe(1);
    expect(result.checklist.length).toBe(1);
    expect(result.draft.subject).toContain('CARE-POL-771');
  });

  it('marks hallucinated excerpts from a model as unsupported_citation', async () => {
    const hallucinatingProvider: LiveAIProviderAdapter = {
      isConfigured: () => true,
      analyzeClaim: async (_req: LiveAIProviderRequest): Promise<LiveAIProviderResponse> => {
        return {
          provider: 'openai',
          model: 'gpt-4o',
          output: {
            findings: [
              {
                category: 'policy_clause',
                source_statement: 'Fabricated non-existent clause in document.',
                source_document_id: docId,
                page_number: 3,
                source_excerpt: 'The insurer shall unconditionally pay 500% penalty on any query.',
                user_document_facts: 'Arbitrary claim facts',
                interpretation: 'Fabricated interpretation',
                confidence_label: 'needs_verification',
              }
            ],
            checklist: [],
            draft_subject: 'Subject',
            draft_body: 'Body',
          }
        };
      }
    };

    const result = await runAnalysisPipeline(mockCase, [mockDoc], mockBlocks, hallucinatingProvider);

    expect(result.findings.length).toBe(1);
    expect(result.findings[0].validation_status).toBe('unsupported_citation');
    expect(result.summary.unsupportedCitations).toBe(1);
  });

  it('throws an explicit error when live provider fails and never silently produces a fake successful report', async () => {
    const failingProvider: LiveAIProviderAdapter = {
      isConfigured: () => true,
      analyzeClaim: async () => {
        throw new Error('503 Service Unavailable: Rate limit exceeded');
      }
    };

    await expect(
      runAnalysisPipeline(mockCase, [mockDoc], mockBlocks, failingProvider)
    ).rejects.toThrow('Live AI Analysis failed');
  });
});
