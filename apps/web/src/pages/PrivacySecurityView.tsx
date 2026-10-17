import React from 'react';
import { ShieldCheck, Lock, Trash2, Database, AlertCircle, FileText } from 'lucide-react';

export const PrivacySecurityView: React.FC = () => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-white rounded-[32px] sm:rounded-[44px] shadow-sm border border-black/5 p-6 sm:p-10 space-y-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#daf0ee] text-[#264f59] text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-[#397783]" />
            <span>Data Governance & Client Safety</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-[#171717] uppercase tracking-tight">
            Privacy, Security & Data Lifecycle
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            ClaimClarity operates under strict medical and financial confidentiality standards designed for Indian policyholders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#daf0ee] text-[#264f59] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Multi-Tenant Isolation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All claim documents, extracted text blocks, and findings inherit strict Row Level Security (RLS) policies keyed directly to your authenticated UUID. Cross-user access is rejected at both the API and database levels.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Model Training</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Uploaded policy documents and medical invoices are never used to train public foundation models. Only isolated case excerpts are provided during active extraction.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Right to Complete Erasure</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You retain complete control over your data. Deleting a case wipes the database record, unlinks associated findings, expunges extracted page blocks, and deletes the representation draft.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Deterministic Citation Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every material finding is verified deterministically against extracted text before display. Findings that fail citation checks are marked unverified, eliminating hallucinations.
            </p>
          </div>
        </div>

        <div className="bg-[#daf0ee]/40 border border-[#b7d2d0] p-6 rounded-3xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-[#397783] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#20444c] space-y-1">
            <h4 className="font-bold text-amber-950">Statutory Notice under Digital Personal Data Protection (DPDP) Act</h4>
            <p className="leading-relaxed">
              By uploading documents to ClaimClarity, you confirm that you are the insured policyholder, nominee, or authorized family caregiver. ClaimClarity is an informational preparation tool and does not provide legal representation or medical opinions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
