import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  ExternalLink, 
  Calendar, 
  ArrowRight, 
  ShieldCheck, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { Case, DocumentRecord, Finding, ChecklistItem, RepresentationDraft } from '@claimclarity/shared';
import { apiRequest } from '../services/api';
import { DocumentUploadPanel } from '../components/DocumentUploadPanel';
import { AnalysisWorkspace } from '../components/AnalysisWorkspace';
import { NewCaseModal } from '../components/NewCaseModal';

export const DashboardView: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [draft, setDraft] = useState<RepresentationDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ cases: Case[] }>('/cases');
      setCases(res.cases || []);
      if (res.cases && res.cases.length > 0) {
        setActiveCaseId((prev) => {
          if (prev && res.cases.some(c => c.id === prev)) return prev;
          return res.cases[0].id;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseDetails = async (caseId: string) => {
    try {
      const [caseRes, docsRes, findingsRes, checklistRes, draftsRes] = await Promise.all([
        apiRequest<{ case: Case }>(`/cases/${caseId}`),
        apiRequest<{ documents: DocumentRecord[] }>(`/cases/${caseId}/documents`),
        apiRequest<{ findings: Finding[] }>(`/cases/${caseId}/findings`),
        apiRequest<{ items: ChecklistItem[] }>(`/cases/${caseId}/checklist`),
        apiRequest<{ drafts: RepresentationDraft[] }>(`/cases/${caseId}/drafts`),
      ]);

      setCurrentCase(caseRes.case);
      setDocuments(docsRes.documents || []);
      setFindings(findingsRes.findings || []);
      setChecklist(checklistRes.items || []);
      setDraft(draftsRes.drafts?.[0] || null);
    } catch (err) {
      console.error('Failed to load case details', err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (activeCaseId) {
      loadCaseDetails(activeCaseId);
    }
  }, [activeCaseId]);

  const handleRunAnalysis = async () => {
    if (!activeCaseId) return;
    try {
      setIsAnalyzing(true);
      await apiRequest(`/cases/${activeCaseId}/analysis`, { method: 'POST' });
      await loadCaseDetails(activeCaseId);
    } catch (err: any) {
      alert(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!activeCaseId || !confirm('Are you sure you want to delete this case and wipe associated document extracts?')) return;
    try {
      await apiRequest(`/cases/${activeCaseId}`, { method: 'DELETE' });
      setActiveCaseId(null);
      setCurrentCase(null);
      fetchCases();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar with Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Claim Management</h1>
          <p className="text-xs text-slate-500">Track and prepare evidence-grounded representations for your health claims.</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition flex items-center space-x-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Claim Case</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Cases List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Your Cases ({cases.length})</span>
          </div>

          {cases.map(c => {
            const isActive = c.id === activeCaseId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCaseId(c.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  isActive
                    ? 'border-brand-500 bg-white ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {c.claim_reference || 'No Ref'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{c.insurer_name}</p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Case Workspace or Upload Stage */}
        <div className="lg:col-span-8">
          {currentCase ? (
            <div className="space-y-6">
              {/* If no findings yet and documents exist, show run analysis CTA */}
              {findings.length === 0 && (
                <div className="bg-brand-50 border border-brand-200 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-brand-900">Run Grounded Claim Analysis</h3>
                    <p className="text-xs text-brand-700 mt-0.5">
                      Extract structured clauses, cross-reference policy wording, and validate citations.
                    </p>
                  </div>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || documents.length === 0}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing & Validating...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Analyze Documents</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Document Upload Drawer */}
              <DocumentUploadPanel
                caseId={currentCase.id}
                documents={documents}
                onDocumentUploaded={() => loadCaseDetails(currentCase.id)}
                onContinueToAnalysis={handleRunAnalysis}
              />

              {/* Evidence Workspace */}
              {findings.length > 0 && (
                <AnalysisWorkspace
                  claimCase={currentCase}
                  documents={documents}
                  findings={findings}
                  checklist={checklist}
                  draft={draft}
                  onRefresh={() => loadCaseDetails(currentCase.id)}
                  onDeleteCase={handleDeleteCase}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select or create a claim case to view documents and grounded analysis.
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewCaseModal
          onCaseCreated={newId => {
            setShowNewModal(false);
            setActiveCaseId(newId);
            fetchCases();
          }}
          onCancel={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
};
