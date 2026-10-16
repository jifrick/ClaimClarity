import { DocumentBlock, ExtractionStatus } from '@claimclarity/shared';

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface OcrExtractionResult {
  success: boolean;
  isOcrApplied: boolean;
  pages: OcrPageResult[];
  error?: string;
  provider: string;
}

export interface OcrProvider {
  name: string;
  isConfigured(): boolean;
  processScannedPdf(buffer: Buffer): Promise<OcrExtractionResult>;
}

/**
 * Standard Scanned-PDF Detection Algorithm:
 * Evaluates whether extracted digital text across pages is below the minimum density threshold (< 50 non-whitespace characters)
 * indicating scanned raster images, handwritten notes, or non-searchable document pages.
 */
export function isScannedOrLowDensityPage(text: string): boolean {
  const stripped = text.replace(/[\s\r\n\t]/g, '');
  return stripped.length < 50;
}

/**
 * Default OCR Provider Interface
 * Provides honest status when external OCR engine (Tesseract/Google Cloud Vision) is not configured.
 */
export class FallbackOcrProvider implements OcrProvider {
  public name = 'unconfigured_ocr';

  public isConfigured(): boolean {
    return false;
  }

  public async processScannedPdf(_buffer: Buffer): Promise<OcrExtractionResult> {
    return {
      success: false,
      isOcrApplied: false,
      pages: [],
      provider: this.name,
      error: 'OCR Engine is not configured. Scanned raster PDFs require an active OCR engine or digital PDF upload.',
    };
  }
}

export const ocrProvider: OcrProvider = new FallbackOcrProvider();
