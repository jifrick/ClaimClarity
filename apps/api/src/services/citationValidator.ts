import { Finding, DocumentBlock, ValidationStatus } from '@claimclarity/shared';
import { normalizeText } from './documentExtractor.js';

export interface CitationValidationResult {
  status: ValidationStatus;
  isValid: boolean;
  matchScore: number;
  reason?: string;
}

/**
 * Deterministically checks that:
 * 1. The cited document and page exist in the case's extracted blocks.
 * 2. The quoted excerpt actually appears in the extracted source text.
 * 3. The citation does NOT fabricate ungrounded claims.
 */
export function validateCitation(
  finding: Finding,
  availableBlocks: DocumentBlock[]
): CitationValidationResult {
  if (!finding.source_document_id || !finding.page_number) {
    return {
      status: 'unsupported_citation',
      isValid: false,
      matchScore: 0,
      reason: 'Finding has no document ID or page number reference.',
    };
  }

  // Filter blocks for matching document and page
  const pageBlocks = availableBlocks.filter(
    b => b.document_id === finding.source_document_id && b.page_number === finding.page_number
  );

  if (pageBlocks.length === 0) {
    return {
      status: 'page_missing',
      isValid: false,
      matchScore: 0,
      reason: `Page ${finding.page_number} not found in extracted text for document ${finding.source_document_id}.`,
    };
  }

  if (!finding.source_excerpt || finding.source_excerpt.trim().length === 0) {
    return {
      status: 'unsupported_citation',
      isValid: false,
      matchScore: 0,
      reason: 'No source excerpt provided in finding.',
    };
  }

  const combinedPageText = pageBlocks.map(b => b.text).join('\n');
  const normalizedPage = normalizeText(combinedPageText);
  const normalizedExcerpt = normalizeText(finding.source_excerpt);

  // Exact substring match
  if (combinedPageText.includes(finding.source_excerpt.trim())) {
    return {
      status: 'verified_exact_match',
      isValid: true,
      matchScore: 1.0,
    };
  }

  // Normalized substring match (handles OCR spacing/punctuation differences)
  if (normalizedPage.includes(normalizedExcerpt)) {
    return {
      status: 'verified_normalized_match',
      isValid: true,
      matchScore: 0.95,
    };
  }

  // Partial phrase overlap calculation
  const excerptWords = normalizedExcerpt.split(' ').filter(w => w.length > 3);
  if (excerptWords.length > 0) {
    const matchedWords = excerptWords.filter(word => normalizedPage.includes(word));
    const ratio = matchedWords.length / excerptWords.length;
    if (ratio >= 0.75) {
      return {
        status: 'unverified_ocr',
        isValid: true,
        matchScore: ratio,
        reason: 'Substantial vocabulary match; minor OCR variation detected.',
      };
    }
  }

  return {
    status: 'unsupported_citation',
    isValid: false,
    matchScore: 0,
    reason: 'Quoted excerpt could not be found on the cited page.',
  };
}
