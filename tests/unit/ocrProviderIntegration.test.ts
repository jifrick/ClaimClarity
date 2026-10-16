import { describe, it, expect } from 'vitest';
import { 
  isScannedOrLowDensityPage, 
  MockOcrProvider, 
  FallbackOcrProvider, 
  CloudOcrAdapter,
  getOcrProvider 
} from '../../apps/api/src/services/ocrProvider.js';

describe('OCR Provider Architecture & Error Classification', () => {
  const samplePdfBuffer = Buffer.from('%PDF-1.4\nSimulated scanned PDF document');

  it('detects low density and scanned pages reliably', () => {
    expect(isScannedOrLowDensityPage('')).toBe(true);
    expect(isScannedOrLowDensityPage('   \n \t ')).toBe(true);
    expect(isScannedOrLowDensityPage('SCAN001')).toBe(true);
    expect(
      isScannedOrLowDensityPage('Fortis Healthcare discharge certificate. Patient underwent emergency surgery with no prior symptoms.')
    ).toBe(false);
  });

  it('unconfigured provider returns explicit UNCONFIGURED error code and no fabricated text', async () => {
    const unconfigured = new FallbackOcrProvider();
    expect(unconfigured.isConfigured()).toBe(false);

    const result = await unconfigured.processScannedPdf(samplePdfBuffer);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('UNCONFIGURED');
    expect(result.isOcrApplied).toBe(false);
    expect(result.pages).toHaveLength(0);
    expect(result.retryable).toBe(false);
  });

  it('mock OCR provider processes scanned document with page confidence and language metadata', async () => {
    const mock = new MockOcrProvider([
      {
        pageNumber: 1,
        text: 'DIAGNOSIS: Acute appendicitis with perforation. Emergency appendectomy performed.',
        confidence: 0.96,
      }
    ]);
    expect(mock.isConfigured()).toBe(true);

    const result = await mock.processScannedPdf(samplePdfBuffer);
    expect(result.success).toBe(true);
    expect(result.isOcrApplied).toBe(true);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].confidence).toBe(0.96);
    expect(result.pages[0].text).toContain('Acute appendicitis');
    expect(result.errorCode).toBe('NONE');
    expect(result.processingDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('mock OCR handles failure modes with retryable classification', async () => {
    const rateLimitedMock = new MockOcrProvider([], true, 'RATE_LIMITED');
    const result = await rateLimitedMock.processScannedPdf(samplePdfBuffer);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMITED');
    expect(result.retryable).toBe(true);
  });

  it('cloud OCR adapter safely guards against unconfigured credentials', async () => {
    const cloudAdapter = new CloudOcrAdapter('cloud_vision');
    // When OCR_API_KEY is not set in test environment
    if (!cloudAdapter.isConfigured()) {
      const result = await cloudAdapter.processScannedPdf(samplePdfBuffer);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNCONFIGURED');
    }
  });
});
