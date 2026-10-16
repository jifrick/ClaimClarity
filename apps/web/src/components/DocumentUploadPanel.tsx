import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, Eye, ArrowRight, Loader2 } from 'lucide-react';
import { DocumentRecord, DocumentType } from '@claimclarity/shared';
import { apiRequest } from '../services/api';

interface DocumentUploadPanelProps {
  caseId: string;
  documents: DocumentRecord[];
  onDocumentUploaded: () => void;
  onContinueToAnalysis: () => void;
}

export const DocumentUploadPanel: React.FC<DocumentUploadPanelProps> = ({
  caseId,
  documents,
  onDocumentUploaded,
  onContinueToAnalysis,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('claim_rejection_letter');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file.');
        setSelectedFile(null);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('File exceeds maximum size limit (15MB).');
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);

      await apiRequest(`/cases/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      });

      setSelectedFile(null);
      onDocumentUploaded();
    } catch (err: any) {
      setError(err.message || 'Upload or extraction failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">Upload Claim & Policy Documents</h3>
        <p className="text-xs text-slate-500 mb-4">
          Upload PDF documents such as your Insurer Repudiation Letter, Policy Terms/Schedule, or Hospital Invoices. Text will be segmented into page blocks with citation tracking.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Document Classification *
              </label>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="claim_rejection_letter">Claim Rejection / Repudiation Letter</option>
                <option value="settlement_letter">Settlement / Deduction Voucher</option>
                <option value="policy_wording">Policy Terms & Conditions Wording</option>
                <option value="policy_schedule">Policy Schedule / Certificate</option>
                <option value="discharge_summary">Hospital Discharge Summary</option>
                <option value="hospital_bill">Itemized Hospital Bill</option>
                <option value="other_evidence">Other Insurer Correspondence / Evidence</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Select PDF File *
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Text & Pages...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload & Extract</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Document Ingestion List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-900">
            Case Documents ({documents.length})
          </h4>
          {documents.length > 0 && (
            <button
              onClick={onContinueToAnalysis}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition flex items-center space-x-1.5"
            >
              <span>Run Grounded Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No documents uploaded yet. Add at least one PDF above to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map(doc => (
              <div key={doc.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{doc.filename}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span>{doc.page_count} page(s)</span>
                      <span>•</span>
                      <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {doc.extraction_status === 'extracted' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Extracted & Indexed</span>
                    </span>
                  )}
                  {doc.extraction_status === 'ocr_required' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200" title="Scanned raster images detected. OCR engine is not configured; digital pages extracted.">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Scanned (OCR Unconfigured)</span>
                    </span>
                  )}
                  {doc.extraction_status !== 'extracted' && doc.extraction_status !== 'ocr_required' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      <span>{doc.extraction_status}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
