import React from 'react';
import { ShieldCheck, Lock, Trash2, Database, AlertCircle, FileText } from 'lucide-react';

export const PrivacySecurityView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Data Governance & Client Safety</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Privacy, Security & Data Lifecycle</h2>
        <p className="text-sm text-slate-600 mt-1">
          ClaimClarity operates under strict medical and financial confidentiality standards designed for Indian policyholders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Multi-Tenant Isolation</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            All claim documents, extracted text blocks, and findings inherit strict Row Level Security (RLS) policies keyed directly to your authenticated UUID. Cross-user access is rejected at both the API and database levels.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Model Training</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Uploaded policy documents and medical invoices are never used to train public foundation models. Only isolated case excerpts are provided during active extraction.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Right to Complete Erasure</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            You retain complete control over your data. Deleting a case wipes the database record, unlinks associated findings, expunges extracted page blocks, and deletes the representation draft.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Deterministic Citation Verification</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every material finding is verified deterministically against extracted text before display. Findings that fail citation checks are marked unverified, eliminating hallucinations.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <h4 className="font-bold text-amber-950">Statutory Notice under Digital Personal Data Protection (DPDP) Act</h4>
          <p className="leading-relaxed">
            By uploading documents to ClaimClarity, you confirm that you are the insured policyholder, nominee, or authorized family caregiver. ClaimClarity is an informational preparation tool and does not provide legal representation or medical opinions.
          </p>
        </div>
      </div>
    </div>
  );
};
