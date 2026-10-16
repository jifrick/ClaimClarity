import { z } from 'zod';
import { env } from '../config.js';

export const OcrPageResultSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  language: z.string().optional(),
  isLowDensity: z.boolean().default(false),
});

export type OcrPageResult = z.infer<typeof OcrPageResultSchema>;

export const OcrExtractionResultSchema = z.object({
  success: z.boolean(),
  isOcrApplied: z.boolean(),
  provider: z.string(),
  pages: z.array(OcrPageResultSchema),
  error: z.string().optional(),
  errorCode: z.enum(['NONE', 'UNCONFIGURED', 'TIMEOUT', 'RATE_LIMITED', 'UNSUPPORTED_LANGUAGE', 'UNREADABLE_IMAGE', 'INTERNAL_ERROR']).default('NONE'),
  retryable: z.boolean().default(false),
  processingDurationMs: z.number().optional(),
});

export type OcrExtractionResult = z.infer<typeof OcrExtractionResultSchema>;

export interface IOcrProvider {
  readonly name: string;
  isConfigured(): boolean;
  processScannedPdf(buffer: Buffer, options?: { timeoutMs?: number; maxRetries?: number }): Promise<OcrExtractionResult>;
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
 * Fallback Unconfigured OCR Provider:
 * Transparently signals when cloud OCR credentials are not provided.
 */
export class FallbackOcrProvider implements IOcrProvider {
  public readonly name = 'unconfigured_ocr';

  public isConfigured(): boolean {
    return false;
  }

  public async processScannedPdf(_buffer: Buffer): Promise<OcrExtractionResult> {
    return {
      success: false,
      isOcrApplied: false,
      provider: this.name,
      pages: [],
      error: 'OCR Engine is not configured. Scanned raster PDFs require an active OCR provider or clean digital PDF upload.',
      errorCode: 'UNCONFIGURED',
      retryable: false,
    };
  }
}

/**
 * Mock OCR Provider:
 * Used for automated tests, CI, and local simulated scan processing without incurring cloud billing.
 */
export class MockOcrProvider implements IOcrProvider {
  public readonly name = 'mock_ocr';

  constructor(
    private simulatedPages?: Array<{ pageNumber: number; text: string; confidence: number }>,
    private shouldFail = false,
    private errorCode: OcrExtractionResult['errorCode'] = 'NONE'
  ) {}

  public isConfigured(): boolean {
    return true;
  }

  public async processScannedPdf(
    buffer: Buffer,
    _options?: { timeoutMs?: number; maxRetries?: number }
  ): Promise<OcrExtractionResult> {
    const start = Date.now();

    if (this.shouldFail) {
      return {
        success: false,
        isOcrApplied: true,
        provider: this.name,
        pages: [],
        error: 'Simulated mock OCR failure.',
        errorCode: this.errorCode,
        retryable: this.errorCode === 'RATE_LIMITED' || this.errorCode === 'TIMEOUT',
        processingDurationMs: Date.now() - start,
      };
    }

    const pages: OcrPageResult[] = this.simulatedPages
      ? this.simulatedPages.map(p => ({
          pageNumber: p.pageNumber,
          text: p.text,
          confidence: p.confidence,
          language: 'en',
          isLowDensity: false,
        }))
      : [
          {
            pageNumber: 1,
            text: 'SCANNED DOCUMENT OCR: Discharge summary confirmed emergency stenting procedure.',
            confidence: 0.94,
            language: 'en',
            isLowDensity: false,
          }
        ];

    return {
      success: true,
      isOcrApplied: true,
      provider: this.name,
      pages,
      errorCode: 'NONE',
      retryable: false,
      processingDurationMs: Date.now() - start,
    };
  }
}

/**
 * Cloud Vision / Textract OCR Adapter boundary:
 * Ready to receive external cloud credentials without altering application callers.
 */
export class CloudOcrAdapter implements IOcrProvider {
  public readonly name: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(providerName: 'cloud_vision' | 'textract') {
    this.name = providerName;
    this.apiKey = env.OCR_API_KEY;
    this.timeoutMs = env.OCR_TIMEOUT_MS;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async processScannedPdf(
    _buffer: Buffer,
    options?: { timeoutMs?: number; maxRetries?: number }
  ): Promise<OcrExtractionResult> {
    if (!this.isConfigured()) {
      return new FallbackOcrProvider().processScannedPdf(_buffer);
    }

    // Explicit boundary for Cloud Vision API / AWS Textract
    // If credentials are provided at deployment, the provider executes here
    return {
      success: false,
      isOcrApplied: true,
      provider: this.name,
      pages: [],
      error: `Cloud OCR provider ${this.name} configured with credentials, awaiting production cloud endpoint connection.`,
      errorCode: 'INTERNAL_ERROR',
      retryable: false,
    };
  }
}

let activeOcrProvider: IOcrProvider | null = null;

export function getOcrProvider(): IOcrProvider {
  if (activeOcrProvider) return activeOcrProvider;

  if (env.OCR_PROVIDER === 'mock') {
    activeOcrProvider = new MockOcrProvider();
  } else if (env.OCR_PROVIDER === 'cloud_vision' || env.OCR_PROVIDER === 'textract') {
    activeOcrProvider = new CloudOcrAdapter(env.OCR_PROVIDER);
  } else {
    activeOcrProvider = new FallbackOcrProvider();
  }

  return activeOcrProvider;
}

export function setOcrProvider(provider: IOcrProvider): void {
  activeOcrProvider = provider;
}

export const ocrProvider: IOcrProvider = getOcrProvider();
