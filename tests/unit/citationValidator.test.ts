import { describe, it, expect } from 'vitest';
import { validateCitation } from '../../apps/api/src/services/citationValidator.js';
import { normalizeText } from '../../apps/api/src/services/documentExtractor.js';
import { Finding, DocumentBlock } from '@claimclarity/shared';

describe('Evidence Grounding & Citation Validator', () => {
  const docId = 'doc-test-123';
  const caseId = 'case-test-456';

  const mockBlocks: DocumentBlock[] = [
    {
      id: 'block-1',
      document_id: docId,
      case_id: caseId,
      page_number: 4,
      block_index: 0,
      text: 'Section 4.1: Pre-Existing Diseases (PED) Waiting Period - A waiting period of thirty-six (36) months shall apply.',
      extraction_confidence: 0.99,
      created_at: new Date().toISOString(),
    },
    {
      id: 'block-2',
      document_id: docId,
      case_id: caseId,
      page_number: 5,
      block_index: 0,
      text: 'Emergency surgical treatments like acute appendicitis are specifically exempt from exclusion.',
      extraction_confidence: 0.98,
      created_at: new Date().toISOString(),
    }
  ];

  it('verifies exact quote matches on the correct page', () => {
    const finding: Finding = {
      id: 'f-1',
      case_id: caseId,
      category: 'waiting_period',
      source_statement: 'Policy Waiting Period Clause',
      source_document_id: docId,
      page_number: 4,
      block_id: 'block-1',
      source_excerpt: 'Section 4.1: Pre-Existing Diseases (PED) Waiting Period',
      user_document_facts: 'Policy active 38 months',
      interpretation: 'PED applies for 36 months',
      confidence_label: 'high_confidence',
      validation_status: 'verified_exact_match',
      model_version: 'gemini-1.5-pro',
    };

    const result = validateCitation(finding, mockBlocks);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('verified_exact_match');
  });

  it('verifies normalized text matches despite OCR whitespace variation', () => {
    const finding: Finding = {
      id: 'f-2',
      case_id: caseId,
      category: 'waiting_period',
      source_statement: 'Policy Waiting Period Clause Normalized',
      source_document_id: docId,
      page_number: 4,
      source_excerpt: 'pre-existing   diseases (ped) waiting period',
      user_document_facts: 'Facts',
      interpretation: 'Interpretation',
      confidence_label: 'high_confidence',
      validation_status: 'verified_exact_match',
      model_version: 'gemini-1.5-pro',
    };

    const result = validateCitation(finding, mockBlocks);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('verified_normalized_match');
  });

  it('rejects citations if the page does not exist in extracted blocks', () => {
    const finding: Finding = {
      id: 'f-3',
      case_id: caseId,
      category: 'policy_clause',
      source_statement: 'Invalid Page Finding',
      source_document_id: docId,
      page_number: 99, // Non-existent page
      source_excerpt: 'Some invented clause',
      user_document_facts: 'Facts',
      interpretation: 'Interpretation',
      confidence_label: 'needs_verification',
      validation_status: 'unsupported_citation',
      model_version: 'gemini-1.5-pro',
    };

    const result = validateCitation(finding, mockBlocks);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('page_missing');
  });

  it('rejects fabricated excerpts that do not appear on the cited page', () => {
    const finding: Finding = {
      id: 'f-4',
      case_id: caseId,
      category: 'policy_clause',
      source_statement: 'Fabricated Excerpt Finding',
      source_document_id: docId,
      page_number: 4,
      source_excerpt: 'The insurer shall refund double damages within twenty-four hours.',
      user_document_facts: 'Facts',
      interpretation: 'Interpretation',
      confidence_label: 'needs_verification',
      validation_status: 'unsupported_citation',
      model_version: 'gemini-1.5-pro',
    };

    const result = validateCitation(finding, mockBlocks);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('unsupported_citation');
  });
});
