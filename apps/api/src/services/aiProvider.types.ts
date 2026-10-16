import { z } from 'zod';
import { Finding, ChecklistItem, RepresentationDraft } from '@claimclarity/shared';

// Runtime Schema for LLM Candidate Findings Output
export const LLMCandidateFindingSchema = z.object({
  category: z.enum([
    'rejection_reason',
    'deduction_reason',
    'policy_clause',
    'waiting_period',
    'exclusion_clause',
    'missing_evidence',
    'contradiction',
    'critical_date',
    'clarification_needed'
  ]),
  source_statement: z.string().min(1),
  source_document_id: z.string().uuid().nullable().optional(),
  page_number: z.number().int().positive().nullable().optional(),
  source_excerpt: z.string().nullable().optional(),
  user_document_facts: z.string().min(1),
  interpretation: z.string().min(1),
  confidence_label: z.enum([
    'high_confidence',
    'moderate_confidence',
    'low_confidence',
    'needs_verification'
  ]).default('high_confidence'),
  missing_information: z.string().nullable().optional(),
  suggested_question: z.string().nullable().optional(),
  safety_note: z.string().nullable().optional(),
});
export type LLMCandidateFinding = z.infer<typeof LLMCandidateFindingSchema>;

export const LLMChecklistCandidateSchema = z.object({
  item_text: z.string().min(1),
  reason: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  evidence_refs: z.array(z.string()).default([]),
});
export type LLMChecklistCandidate = z.infer<typeof LLMChecklistCandidateSchema>;

export const LLMAnalysisOutputSchema = z.object({
  findings: z.array(LLMCandidateFindingSchema),
  checklist: z.array(LLMChecklistCandidateSchema),
  draft_body: z.string().min(1),
  draft_subject: z.string().min(1),
});
export type LLMAnalysisOutput = z.infer<typeof LLMAnalysisOutputSchema>;

export interface LiveAIProviderRequest {
  caseTitle: string;
  claimType: string;
  insurerName: string;
  claimReference?: string | null;
  policyNumber?: string | null;
  claimStatus: string;
  userNotes?: string | null;
  documentExcerpts: Array<{
    documentId: string;
    filename: string;
    documentType: string;
    pageNumber: number;
    text: string;
  }>;
}

export interface LiveAIProviderResponse {
  provider: 'gemini' | 'openai' | 'anthropic' | 'demo';
  model: string;
  output: LLMAnalysisOutput;
  rawResponse?: string;
}

export interface LiveAIProviderAdapter {
  isConfigured(): boolean;
  analyzeClaim(req: LiveAIProviderRequest): Promise<LiveAIProviderResponse>;
}
