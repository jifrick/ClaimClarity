import PDFParser from 'pdf2json';
import { DocumentBlock, ExtractionStatus } from '@claimclarity/shared';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { isScannedOrLowDensityPage, ocrProvider } from './ocrProvider.js';

export interface ExtractedPageResult {
  pageNumber: number;
  text: string;
  isScannedOrEmpty: boolean;
  blocks: DocumentBlock[];
}

export interface ExtractionResult {
  success: boolean;
  pageCount: number;
  status: ExtractionStatus;
  pages: ExtractedPageResult[];
  hasScannedPages: boolean;
  error?: string;
  notice?: string;
}

/**
 * Normalizes text for robust citation verification (strips extraneous whitespace and punctuation)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts text and segments into page-level blocks from a PDF buffer using pdf2json.
 * Detects empty/scanned pages and flags OCR requirements transparently.
 */
export async function extractPdfText(
  buffer: Buffer,
  documentId: string,
  caseId: string
): Promise<ExtractionResult> {
  const tempFilePath = path.join(os.tmpdir(), `claimclarity_${crypto.randomUUID()}.pdf`);

  return new Promise((resolve) => {
    try {
      fs.writeFileSync(tempFilePath, buffer);

      const pdfParser = new (PDFParser as any)(null, 1);

      const cleanup = () => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch {
          // Ignore temp cleanup errors
        }
      };

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        cleanup();
        resolve({
          success: false,
          pageCount: 0,
          status: 'failed',
          hasScannedPages: false,
          pages: [],
          error: errData.parserError || 'Failed to parse PDF document structure.',
        });
      });

      pdfParser.on('pdfParser_dataReady', async (pdfData: any) => {
        cleanup();
        const pages: ExtractedPageResult[] = [];
        const rawPages = pdfData.Pages || [];
        let scannedCount = 0;

        rawPages.forEach((page: any, idx: number) => {
          const pageNum = idx + 1;
          const pageText = (page.Texts || [])
            .map((t: any) => (t.R || []).map((r: any) => {
              try {
                return decodeURIComponent(r.T);
              } catch {
                return r.T || '';
              }
            }).join(''))
            .join(' ')
            .trim();

          const isScanned = isScannedOrLowDensityPage(pageText);
          if (isScanned) {
            scannedCount++;
          }

          const paragraphs = pageText
            .split(/\n\s*\n|\.\s+/)
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0);

          const blocks: DocumentBlock[] = paragraphs.length > 0
            ? paragraphs.map((p: string, blockIdx: number) => ({
                id: crypto.randomUUID(),
                document_id: documentId,
                case_id: caseId,
                page_number: pageNum,
                block_index: blockIdx,
                text: p,
                extraction_confidence: isScanned ? 0.3 : 0.98,
                bounding_box_json: null,
                created_at: new Date().toISOString(),
              }))
            : [{
                id: crypto.randomUUID(),
                document_id: documentId,
                case_id: caseId,
                page_number: pageNum,
                block_index: 0,
                text: pageText,
                extraction_confidence: isScanned ? 0.1 : 0.98,
                bounding_box_json: null,
                created_at: new Date().toISOString(),
              }];

          pages.push({
            pageNumber: pageNum,
            text: pageText,
            isScannedOrEmpty: isScanned,
            blocks,
          });
        });

        const hasScanned = scannedCount > 0;
        let finalStatus: ExtractionStatus = 'extracted';
        let notice: string | undefined;

        if (hasScanned) {
          if (ocrProvider.isConfigured()) {
            finalStatus = 'extracted';
          } else {
            finalStatus = 'ocr_required';
            notice = `${scannedCount} of ${pages.length} page(s) appear to be scanned images or non-selectable text. OCR is not configured; digital text from selectable pages was extracted.`;
          }
        }

        resolve({
          success: true,
          pageCount: pages.length,
          status: finalStatus,
          hasScannedPages: hasScanned,
          pages,
          notice,
        });
      });

      pdfParser.loadPDF(tempFilePath);
    } catch (err: any) {
      resolve({
        success: false,
        pageCount: 0,
        status: 'failed',
        hasScannedPages: false,
        pages: [],
        error: err.message || 'Fatal error during PDF processing.',
      });
    }
  });
}
