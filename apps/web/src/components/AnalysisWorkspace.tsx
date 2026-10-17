import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  FileCheck2, 
  HelpCircle, 
  Copy, 
  Check, 
  Trash2, 
  ShieldAlert, 
  Download,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { Finding, ChecklistItem, RepresentationDraft, Case, DocumentRecord } from '@claimclarity/shared';
import { apiRequest } from '../services/api';

interface AnalysisWorkspaceProps {
  claimCase: Case;
  documents: DocumentRecord[];
  findings: Finding[];
  checklist: ChecklistItem[];
  draft: RepresentationDraft | null;
  onRefresh: () => void;
  onDeleteCase: () => void;
}

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({
  claimCase,
  documents,
  findings,
  checklist,
  draft,
  onRefresh,
  onDeleteCase,
}) => {
  const [activeTab, setActiveTab] = useState<'findings' | 'checklist' | 'draft' | 'documents'>('findings');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(findings[0] || null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [editableDraft, setEditableDraft] = useState(draft?.body || '');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleCopyDraft = () => {
    if (draft) {
      navigator.clipboard.writeText(editableDraft || draft.body);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const handleToggleChecklist = async (item: ChecklistItem) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      await apiRequest(`/checklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update checklist item status', err);
    }
  };

  const [draftSaved, setDraftSaved] = useState(false);

  const handleSaveDraft = async () => {
    if (!draft) return;
    try {
      await apiRequest(`/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editableDraft }),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save draft', err);
    }
  };

  const handleFeedback = async (rating: 'helpful' | 'inaccurate') => {
    try {
      await apiRequest(`/cases/${claimCase.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          finding_id: selectedFinding?.id || null,
          rating,
          correction_text: 'User verified via interface',
        }),
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Case Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 uppercase tracking-wide">
                {claimCase.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Ref: {claimCase.claim_reference || 'N/A'}
              </span>
              {findings[0]?.model_version.includes('gemini') || findings[0]?.model_version.includes('gpt') ? (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Live AI Engine ({findings[0].model_version})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Deterministic Demo Engine
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{claimCase.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Insurer: <strong className="text-slate-700">{claimCase.insurer_name}</strong> • Policy No: <strong className="text-slate-700">{claimCase.policy_number || 'N/A'}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const reportContent = `CLAIMCLARITY AUDIT & EVIDENCE REPORT
Generated: ${new Date().toLocaleDateString()}
Case Title: ${claimCase.title}
Claim Reference: ${claimCase.claim_reference || 'N/A'}
Insurer: ${claimCase.insurer_name}
Policy Number: ${claimCase.policy_number || 'N/A'}
Claim Status: ${claimCase.status.toUpperCase()}

============================================================
1. GROUNDED FINDINGS (${findings.length})
============================================================
${findings.map((f, i) => `[Finding ${i+1}] ${f.category.toUpperCase()} (${f.validation_status})
Statement: ${f.source_statement}
Quoted Excerpt (Page ${f.page_number || 'N/A'}): "${f.source_excerpt || 'None'}"
User Facts: ${f.user_document_facts}
Plain Language: ${f.interpretation}
Suggested Question: ${f.suggested_question || 'N/A'}
`).join('\n')}

============================================================
2. ACTION CHECKLIST (${checklist.length})
============================================================
${checklist.map((item, i) => `[${item.status === 'completed' ? 'X' : ' '}] ${item.item_text} (${item.priority.toUpperCase()} priority)\n    Reason: ${item.reason}`).join('\n')}

============================================================
3. OFFICIAL REPRESENTATION DRAFT
============================================================
Subject: ${draft?.subject || 'N/A'}

${editableDraft || draft?.body || 'No draft generated'}

============================================================
DISCLAIMER: ClaimClarity is an informational preparation tool. Confirm official rules via IRDAI Bima Bharosa / Insurance Ombudsman before submission.
`;
                const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ClaimClarity_Report_${claimCase.claim_reference || 'Case'}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Report</span>
            </button>
            <button
              onClick={onDeleteCase}
              className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Case</span>
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mt-6 flex space-x-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('findings')}
            className={`pb-3 text-sm font-semibold border-b-2 px-3 transition flex items-center space-x-2 ${
              activeTab === 'findings'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Grounded Findings ({findings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 text-sm font-semibold border-b-2 px-3 transition flex items-center space-x-2 ${
              activeTab === 'checklist'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Action Checklist ({checklist.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('draft');
              if (draft) setEditableDraft(draft.body);
            }}
            className={`pb-3 text-sm font-semibold border-b-2 px-3 transition flex items-center space-x-2 ${
              activeTab === 'draft'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Representation Draft</span>
          </button>
        </div>
      </div>

      {/* Tab: Grounded Findings (Side-by-Side Evidence Viewer) */}
      {activeTab === 'findings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Findings List (Left Column) */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Validated Findings ({findings.length})
            </h3>
            {findings.map(finding => {
              const isSelected = selectedFinding?.id === finding.id;
              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {finding.category.replace('_', ' ')}
                    </span>
                    {finding.validation_status.includes('verified') ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified Citation</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Requires Verification</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                    {finding.source_statement}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Page {finding.page_number || 'N/A'} • {finding.confidence_label.replace('_', ' ')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Finding Deep Dive & Quoted Evidence (Right Column) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            {selectedFinding ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                      Evidence Details
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedFinding.category.replace('_', ' ').toUpperCase()}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFeedback('helpful')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      title="Helpful finding"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    {feedbackSent && (
                      <span className="text-[11px] text-emerald-600 font-medium">Feedback recorded</span>
                    )}
                  </div>
                </div>

                {/* Direct Quoted Passage */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Direct Quoted Source Excerpt (Page {selectedFinding.page_number || 'N/A'})
                  </label>
                  <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-brand-500 font-mono text-xs text-slate-800 leading-relaxed">
                    {selectedFinding.source_excerpt || 'No direct excerpt extracted for this finding.'}
                  </div>
                </div>

                {/* Plain-Language Interpretation */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Plain-Language Interpretation
                  </label>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedFinding.interpretation}
                  </p>
                </div>

                {/* User Document Facts */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Facts from Your Case Records
                  </label>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedFinding.user_document_facts}
                  </p>
                </div>

                {/* Clarifying Question / Next Action */}
                {selectedFinding.suggested_question && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h5 className="text-xs font-bold text-blue-900 mb-1">Suggested Question for Insurer:</h5>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      "{selectedFinding.suggested_question}"
                    </p>
                  </div>
                )}

                {/* Safety / Informational Boundary Note */}
                {selectedFinding.safety_note && (
                  <div className="flex items-start space-x-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{selectedFinding.safety_note}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select a finding on the left to inspect grounded citations and excerpts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Action Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Recommended Next Steps & Evidence Checklist</h3>
            <p className="text-xs text-slate-500">
              Track tasks and missing documentation required to build a strong factual representation.
            </p>
          </div>

          <div className="space-y-3">
            {checklist.map(item => (
              <div
                key={item.id}
                className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition"
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={item.status === 'completed'}
                    onChange={() => handleToggleChecklist(item)}
                    className="mt-1 h-4 w-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <div>
                    <p className={`text-sm font-semibold ${item.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {item.item_text}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
                    {item.evidence_refs && item.evidence_refs.length > 0 && (
                      <div className="flex items-center space-x-1.5 mt-2">
                        {item.evidence_refs.map((ref: string, idx: number) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  item.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.priority} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Representation Draft Editor */}
      {activeTab === 'draft' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Neutral Insurer Grievance Draft</h3>
              <p className="text-xs text-slate-500">
                Grounds your representation in cited policy clauses and verifiable facts. Edit and review before sending to the insurer's Grievance Redressal Officer (GRO).
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyDraft}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center space-x-1.5"
              >
                {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDraft ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition flex items-center space-x-1.5"
              >
                {draftSaved && <Check className="w-3.5 h-3.5 text-white" />}
                <span>{draftSaved ? 'Saved!' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {draftSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Grievance representation draft saved successfully to your case file.</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <strong>Verification Notice:</strong> Verify all dates, reference numbers, and personal details before sending. ClaimClarity never sends emails or files grievances automatically on your behalf.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              readOnly
              value={draft?.subject || ''}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-slate-50 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Representation Letter Body (Editable)
            </label>
            <textarea
              rows={14}
              value={editableDraft}
              onChange={e => setEditableDraft(e.target.value)}
              className="w-full p-4 text-xs font-mono rounded-xl border border-slate-300 leading-relaxed focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
