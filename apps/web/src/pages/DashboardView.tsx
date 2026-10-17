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
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-white rounded-[32px] sm:rounded-[44px] shadow-sm border border-black/5 overflow-hidden p-4 sm:p-8 lg:p-10 space-y-8">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#397783]">
              ACTIVE PORTFOLIO
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#171717] uppercase tracking-tight mt-0.5">
              Health Claim Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track and prepare evidence-grounded representations for your health insurance claims.
            </p>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full bg-[#171717] hover:bg-black text-white shadow-sm transition flex items-center space-x-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Claim Case</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
                      ? 'border-[#397783] bg-[#daf0ee]/30 ring-2 ring-[#397783]/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
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
                  <div className="bg-[#daf0ee]/60 border border-[#b7d2d0] p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#20444c] uppercase tracking-wide">
                        Run Grounded Claim Analysis
                      </h3>
                      <p className="text-xs text-[#264f59] mt-1">
                        Extract structured clauses, cross-reference policy wording, and validate citations against source pages.
                      </p>
                    </div>
                    <button
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing || documents.length === 0}
                      className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full bg-[#397783] hover:bg-[#2B5E68] text-white shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-300" />
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
    </div>
  );
};
