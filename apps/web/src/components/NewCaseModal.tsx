import React, { useState } from 'react';
import { Shield, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { apiRequest } from '../services/api';
import { CreateCaseInput } from '@claimclarity/shared';

interface NewCaseModalProps {
  onCaseCreated: (caseId: string) => void;
  onCancel: () => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({ onCaseCreated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [insurerName, setInsurerName] = useState('Star Care General Insurance Co. Ltd.');
  const [claimReference, setClaimReference] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [status, setStatus] = useState<'rejected' | 'partially_settled' | 'delayed' | 'query_raised'>('rejected');
  const [claimType, setClaimType] = useState<'reimbursement' | 'cashless' | 'critical_illness'>('reimbursement');
  const [userNotes, setUserNotes] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAgreed) {
      setError('You must review and accept the document processing consent.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: CreateCaseInput = {
        title: title || `${insurerName} Health Claim - ${status.replace('_', ' ')}`,
        claim_type: claimType,
        insurer_name: insurerName,
        claim_reference: claimReference || undefined,
        policy_number: policyNumber || undefined,
        status,
        preferred_language: 'en',
        user_notes: userNotes || undefined,
        consent_agreed: true,
      };

      const res = await apiRequest<{ case: { id: string } }>('/cases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onCaseCreated(res.case.id);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize case. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#171717]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[32px] sm:rounded-[40px] max-w-xl w-full border border-black/10 shadow-2xl p-6 sm:p-8 my-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#397783] text-white flex items-center justify-center shadow-inner">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#397783]">
              NEW REPRESENTATION
            </span>
            <h2 className="text-xl font-bold text-slate-900">Create New Claim Case</h2>
            <p className="text-xs text-slate-500">Provide basic claim identifiers to initialize source-grounded analysis.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Case Title / Brief Summary *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fortis Hospital Appendectomy Rejection"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Insurer Name *
              </label>
              <input
                type="text"
                required
                value={insurerName}
                onChange={e => setInsurerName(e.target.value)}
                placeholder="e.g. Star Health, HDFC ERGO, Niva Bupa"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Claim Status *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="rejected">Repudiated / Rejected</option>
                <option value="partially_settled">Partially Settled / Deductions</option>
                <option value="query_raised">Query / Additional Docs Requested</option>
                <option value="delayed">Delayed Beyond 30 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Claim Reference Number
              </label>
              <input
                type="text"
                value={claimReference}
                onChange={e => setClaimReference(e.target.value)}
                placeholder="e.g. CIR/2026/DEL/891244"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Policy Number
              </label>
              <input
                type="text"
                value={policyNumber}
                onChange={e => setPolicyNumber(e.target.value)}
                placeholder="e.g. POL-HLT-9923841-A"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Brief Context / Stated Rejection Reason (Optional)
            </label>
            <textarea
              rows={3}
              value={userNotes}
              onChange={e => setUserNotes(e.target.value)}
              placeholder="e.g. The insurer denied cashless coverage claiming acute appendicitis was a pre-existing condition, but I had 38 months of continuous policy coverage."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Privacy Consent Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAgreed}
                onChange={e => setConsentAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                <strong>Explicit Privacy & Processing Consent:</strong> I confirm that I am authorized to upload these insurance and medical documents. I understand ClaimClarity will process documents solely for evidence extraction and preparation, and that documents will remain isolated to my authenticated user account.
              </span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#397783] hover:bg-[#2B5E68] disabled:opacity-50 rounded-full shadow-sm transition flex items-center space-x-1.5"
            >
              <span>{isSubmitting ? 'Creating Case...' : 'Continue to Documents'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
