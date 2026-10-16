import React from 'react';
import { ShieldCheck, FileSearch, Scale, FileText, CheckCircle, ArrowRight, Lock, ExternalLink, HelpCircle, AlertCircle } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onExploreDemo: () => void;
  onViewGuidance: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExploreDemo, onViewGuidance }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-brand-50/60 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>India Health Insurance Assistance & Guidance</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Understand your claim. <br className="hidden sm:block" />
            <span className="text-brand-600">Know your next step.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload your health policy terms and claim decision letter to unpack the stated rejection, verify clause citations against extracted evidence, and draft grounded representations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition flex items-center justify-center space-x-2"
            >
              <span>Analyze My Claim</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onExploreDemo}
              className="w-full sm:w-auto px-6 py-3.5 text-base font-medium rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm transition flex items-center justify-center space-x-2"
            >
              <FileSearch className="w-5 h-5 text-slate-500" />
              <span>Explore Synthetic Demo Case</span>
            </button>
          </div>

          {/* Trust & Boundary Banner */}
          <div className="mt-12 inline-flex items-center space-x-2 text-xs text-slate-500 bg-white/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict Client-Side Privacy • Deterministic Citation Verification • No Legal/Adjudication Claims</span>
          </div>
        </div>
      </section>

      {/* Core Workflow Pillars */}
      <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How ClaimClarity Grounds Your Claim</h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto">
            Traditional AI chatbots hallucinate policy terms. ClaimClarity enforces verifiable evidence citations linked to your actual uploaded PDFs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">1. Page-Level Extraction</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We extract text from your policy wording, rejection notice, and hospital invoices preserving document coordinates and page numbers.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">2. Grounded Citation Engine</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every finding must map to an exact clause in the source text. If a citation doesn't match the page, our validator flags it as unverified.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">3. Actionable Next Steps</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Generate an evidence gap checklist and a neutral representation draft addressed to the Insurer's Grievance Redressal Officer (GRO).
            </p>
          </div>
        </div>
      </section>

      {/* Safety & Non-Negotiable Boundaries */}
      <section className="bg-white py-14 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-start space-x-4 bg-amber-50/70 border border-amber-200 p-6 rounded-2xl">
            <AlertCircle className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <h4 className="font-bold text-amber-950 mb-1">Important Informational Notice & Safety Boundaries</h4>
              <p className="leading-relaxed">
                ClaimClarity is an AI-assisted document preparation tool. We do not provide legal advice, medical adjudication, or guarantee that an insurer will reverse a repudiation. The platform does not automatically file grievances or contact your insurer. Always review generated drafts before submitting them through authorized IRDAI channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory Quick-View */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-900 text-white p-8 sm:p-10 rounded-3xl">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Need to escalate under IRDAI Guidelines?</h3>
            <p className="mt-2 text-slate-300 text-sm max-w-lg">
              Learn the 3-tier grievance process in India: Insurer GRO (15-day SLA), IRDAI Bima Bharosa portal, and the Insurance Ombudsman for disputes up to ₹50 Lakhs.
            </p>
          </div>
          <button
            onClick={onViewGuidance}
            className="flex-shrink-0 px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition flex items-center space-x-2"
          >
            <span>Read IRDAI Guidelines</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
