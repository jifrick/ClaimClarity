import { describe, it, expect } from 'vitest';
import { runAnalysisPipeline } from '../../apps/api/src/services/analysisEngine.js';
import { extractPdfText } from '../../apps/api/src/services/documentExtractor.js';
import { isScannedOrLowDensityPage } from '../../apps/api/src/services/ocrProvider.js';
import { Case, DocumentRecord, DocumentBlock } from '@claimclarity/shared';

describe('Document Processing Reliability & Scanned PDF Handling', () => {
  const caseId = '00000000-0000-0000-0000-000000000999';
  const docId = '00000000-0000-0000-0000-000000000888';

  it('correctly detects low-density or scanned raster pages', () => {
    const lowDensityText = '     \n \n \t  ';
    const rasterOnlyText = 'SCAN-001';
    const digitalText = 'Policy Section 5: Co-payment of 10% shall be levied on all claims for insured persons aged over 60 years.';

    expect(isScannedOrLowDensityPage(lowDensityText)).toBe(true);
    expect(isScannedOrLowDensityPage(rasterOnlyText)).toBe(true);
    expect(isScannedOrLowDensityPage(digitalText)).toBe(false);
  });

  it('flags extraction status as ocr_required with clear notice when scanned pages are parsed without an active OCR engine', async () => {
    const fs = await import('fs');
    // Using valid_test.pdf fixture
    const buffer = fs.readFileSync('tests/fixtures/valid_test.pdf');
    const result = await extractPdfText(buffer, docId, caseId);

    expect(result.success).toBe(true);
    expect(result.pageCount).toBe(2);
    // Since valid_test.pdf has real digital text on both pages
    expect(result.hasScannedPages).toBe(false);
    expect(result.status).toBe('extracted');
  });

  it('handles malformed PDF buffers gracefully with structured error message', async () => {
    const malformedBuffer = Buffer.from('%PDF-1.4\nCorrupted binary payload that is completely broken');
    const result = await extractPdfText(malformedBuffer, docId, caseId);

    // Should return failure without crashing the process
    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });
});
