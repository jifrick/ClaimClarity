import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  FileSearch, 
  Scale, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  Lock, 
  ExternalLink, 
  HelpCircle, 
  AlertCircle,
  FileCheck2,
  FileSignature,
  FileSpreadsheet,
  AlertOctagon,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onExploreDemo: () => void;
  onViewGuidance: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onExploreDemo, onViewGuidance }) => {
  const [selectedTag, setSelectedTag] = useState<'REJECTION' | 'DEDUCTION' | 'PED_DISPUTE' | 'DELAY'>('REJECTION');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = containerRef.current?.querySelectorAll('.reveal-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8">
      {/* =========================================================================
          MAIN EDITORIAL CONTAINER (White surface with generous rounded corners)
          ========================================================================= */}
      <div className="bg-white rounded-[32px] sm:rounded-[44px] shadow-sm border border-black/5 overflow-hidden p-3 sm:p-6 lg:p-8">
        
        {/* =======================================================================
            HERO SECTION: Deep Teal Sculpted Canvas with 3D Illustration & Headline
            ======================================================================= */}
        <section className="relative rounded-[28px] sm:rounded-[36px] bg-[#397783] text-white overflow-hidden min-h-[480px] sm:min-h-[540px] lg:min-h-[600px] flex flex-col justify-between p-6 sm:p-10 lg:p-14">
          
          {/* Background 3D Composition Image with gentle float */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40 sm:opacity-50 lg:opacity-60 mix-blend-luminosity animate-float">
            <img 
              src="/hero-3d.jpg" 
              alt="Healthcare Claim Visual Composition" 
              className="w-full h-full object-cover object-center scale-105"
            />
          </div>
          {/* Radial gradient overlay for ultra-crisp typography contrast */}
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#20444c]/90 via-[#397783]/60 to-transparent pointer-events-none" />

          {/* Top Sub-Bar inside Hero */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>INDIA HEALTH INSURANCE ADVOCACY & CITATION GROUNDING</span>
            </div>

            {/* Pill Filter Tags matching reference */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button 
                onClick={() => setSelectedTag('REJECTION')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition ${
                  selectedTag === 'REJECTION' 
                    ? 'bg-white text-[#20444c] border-white shadow-sm' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
                }`}
              >
                REJECTION
              </button>
              <button 
                onClick={() => setSelectedTag('DEDUCTION')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition ${
                  selectedTag === 'DEDUCTION' 
                    ? 'bg-white text-[#20444c] border-white shadow-sm' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
                }`}
              >
                DEDUCTIONS
              </button>
              <button 
                onClick={() => setSelectedTag('PED_DISPUTE')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition ${
                  selectedTag === 'PED_DISPUTE' 
                    ? 'bg-white text-[#20444c] border-white shadow-sm' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
                }`}
              >
                PED CLAUSES
              </button>
              <button 
                onClick={() => setSelectedTag('DELAY')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full border transition ${
                  selectedTag === 'DELAY' 
                    ? 'bg-white text-[#20444c] border-white shadow-sm' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
                }`}
              >
                DELAYS
              </button>
            </div>
          </div>

          {/* Center / Lower Hero: Oversized Display Typography & CTAs */}
          <div className="relative z-10 my-auto py-8 lg:py-12 max-w-4xl">
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight text-white leading-[0.95] drop-shadow-sm">
              YOUR HEALTH CLAIM. <br />
              <span className="text-[#daf0ee]">CLEARLY EXPLAINED.</span>
            </h1>

            <p className="mt-6 text-sm sm:text-base lg:text-lg text-white/90 max-w-2xl leading-relaxed font-normal">
              Extract rejected policy clauses, cross-reference exact source page citations, identify missing hospital evidence, and draft grounded representations for your insurer's Grievance Redressal Officer.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={onStart}
                className="px-8 py-3.5 rounded-full bg-white text-[#171717] hover:bg-[#daf0ee] font-bold text-sm tracking-wide shadow-lg shadow-black/10 transition flex items-center justify-center space-x-2"
              >
                <span>Analyze My Claim</span>
                <ArrowRight className="w-4 h-4 text-[#397783]" />
              </button>

              <button
                onClick={onExploreDemo}
                className="px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-semibold text-sm border border-white/25 transition flex items-center justify-center space-x-2"
              >
                <FileSearch className="w-4 h-4 text-[#daf0ee]" />
                <span>Explore Synthetic Demo Case</span>
              </button>
            </div>
          </div>

          {/* Bottom Hero Trust Micro-Row */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-white/80">
            <div className="flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Strict Document Privacy • No Foundation Model Training • Multi-Tenant Isolated</span>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
              <span>Deterministic Citation Validation (No Hallucinated Entitlements)</span>
            </div>
          </div>
        </section>

        {/* =======================================================================
            LOWER EDITORIAL GRID: Left Card Showcase + Right Benefit Rows
            ======================================================================= */}
        <section className="pt-8 sm:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Asymmetrical Card Showcase (Inspired by reference left photo card) */}
          <div className="lg:col-span-5 space-y-4 reveal-on-scroll reveal-delay-1">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#397783]">
                GROUNDED RESOLUTION
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-[#171717] uppercase tracking-tight mt-1 leading-snug">
                UNDERSTAND WHY YOUR CLAIM WAS REJECTED
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Different insurers apply different waiting periods, proportionate deductions, and reasonable & customary caps. Choose your case facts and know where you stand.
              </p>
            </div>

            {/* Visual Mini-Card with Hospital Illustration */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 bg-slate-50 group transition duration-300 hover:shadow-lg hover:-translate-y-1">
              <img 
                src="/card-hospital.jpg" 
                alt="Hospital Invoices & Evidence" 
                className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                      DOCUMENT EVIDENCE
                    </span>
                    <h3 className="text-sm font-bold mt-0.5">Discharge Summaries & Invoices</h3>
                  </div>
                  <button 
                    onClick={onStart}
                    className="w-8 h-8 rounded-full bg-white text-[#171717] flex items-center justify-center shadow-md hover:bg-[#daf0ee] transition"
                    title="Upload Documents"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onViewGuidance}
                className="px-5 py-2.5 rounded-full border border-black/10 hover:border-black/30 text-xs font-bold uppercase tracking-wider text-[#171717] transition hover:bg-black/5 flex items-center space-x-2"
              >
                <span>IRDAI GRIEVANCE PROCESS</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#397783]" />
              </button>
            </div>
          </div>

          {/* Right Column: Benefits You Can Get By Using ClaimClarity */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border-b border-slate-200 pb-4 reveal-on-scroll">
              <h2 className="font-display text-2xl sm:text-3xl font-black text-[#171717] uppercase tracking-tight">
                CAPABILITIES FOR POLICYHOLDERS
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Factual assistance built around the official IRDAI Ombudsman & Bima Bharosa framework.
              </p>
            </div>

            {/* Benefit Row 1 */}
            <div className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition duration-300 hover:translate-x-1.5 reveal-on-scroll reveal-delay-1">
              <div className="w-12 h-12 rounded-2xl bg-[#daf0ee] text-[#264f59] flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#171717]">
                  PAGE-LEVEL POLICY CLAUSE EXTRACTION
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  We parse your PDF policy schedule, rejection notice, and hospital invoices, preserving exact page coordinates and paragraph blocks so every statement is backed by verifiable facts.
                </p>
              </div>
            </div>

            {/* Benefit Row 2 */}
            <div className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition duration-300 hover:translate-x-1.5 reveal-on-scroll reveal-delay-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Scale className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#171717]">
                  DETERMINISTIC CITATION VALIDATION
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Every finding must match an exact verbatim excerpt from your uploaded documents. If an AI model hallucinates an entitlement, our validator immediately flags it as unsupported.
                </p>
              </div>
            </div>

            {/* Benefit Row 3 */}
            <div className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition duration-300 hover:translate-x-1.5 reveal-on-scroll reveal-delay-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                <FileSignature className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#171717]">
                  NEUTRAL REPRESENTATION DRAFTING
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Generate structured representation letters formatted for your insurer's Grievance Redressal Officer (GRO), complete with evidence checklists, copy-to-clipboard, and text report export.
                </p>
              </div>
            </div>

            {/* Safety Disclaimer Callout */}
            <div className="p-4 rounded-2xl bg-[#daf0ee]/40 border border-[#b7d2d0] text-xs text-[#20444c] flex items-start space-x-3 reveal-on-scroll reveal-delay-4">
              <AlertCircle className="w-4 h-4 text-[#397783] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Informational Boundary:</strong> ClaimClarity is an informational preparation tool. We do not provide legal advice or guarantee insurance reversals. Review all drafts before official submission through IRDAI channels.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
