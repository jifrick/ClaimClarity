import React, { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck, Clock, FileText, ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api';
import { RegulatoryEscalationStep } from '@claimclarity/shared';

export const RegulatoryGuidanceView: React.FC = () => {
  const [steps, setSteps] = useState<RegulatoryEscalationStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ steps: RegulatoryEscalationStep[] }>('/guidance/india')
      .then(res => setSteps(res.steps || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="bg-white rounded-[32px] sm:rounded-[44px] shadow-sm border border-black/5 p-6 sm:p-10 space-y-8">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-[#daf0ee] text-[#264f59] text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-[#397783]" />
            <span>Statutory Framework in India</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-[#171717] uppercase tracking-tight">
            Health Claim Grievance Escalation Stages
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Under IRDAI (Protection of Policyholders' Interests and Allied Matters) Regulations, policyholders have defined legal tiers to resolve repudiations, unwarranted deductions, and procedural delays.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading IRDAI statutory guidance...</div>
        ) : (
          <div className="space-y-6">
            {steps.map(step => (
              <div key={step.step_number} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-[#171717] text-white">
                    Stage {step.step_number}
                  </span>
                  <div className="flex items-center space-x-1 text-xs font-semibold text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>SLA: {step.expected_timeline_days} Days</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{step.stage_name}</h3>
                <p className="text-xs font-bold text-[#397783] mb-3">{step.authority_or_channel}</p>
              
              <p className="text-xs text-slate-700 leading-relaxed mb-4">
                {step.description}
              </p>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 mb-4">
                <p className="text-slate-700"><strong>Prerequisite:</strong> {step.prerequisite}</p>
                <p className="text-slate-500 text-[11px] italic">Note: {step.disclaimer}</p>
              </div>

              <a
                href={step.official_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <span>Visit Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
