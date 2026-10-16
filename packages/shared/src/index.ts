import { z } from 'zod';

// ==========================================
// User & Auth Types
// ==========================================
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1),
  preferred_language: z.enum(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn']).default('en'),
  consent_given: z.boolean().default(false),
  consent_timestamp: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ==========================================
// Case Types
// ==========================================
export const ClaimStatusSchema = z.enum([
  'rejected',
  'partially_settled',
  'delayed',
  'query_raised',
  'under_review',
  'other'
]);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export const ClaimTypeSchema = z.enum([
  'cashless',
  'reimbursement',
  'critical_illness',
  'accidental_care',
  'other'
]);
export type ClaimType = z.infer<typeof ClaimTypeSchema>;

export const CaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  claim_type: ClaimTypeSchema.default('reimbursement'),
  insurer_name: z.string().min(1),
  claim_reference: z.string().optional().nullable(),
  status: ClaimStatusSchema.default('rejected'),
  policy_number: z.string().optional().nullable(),
  user_notes: z.string().optional().nullable(),
  consent_version: z.string().default('v1.0'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional().nullable(),
});
export type Case = z.infer<typeof CaseSchema>;

export const CreateCaseInputSchema = z.object({
  title: z.string().min(2, 'Case title must be at least 2 characters'),
  claim_type: ClaimTypeSchema.default('reimbursement'),
  insurer_name: z.string().min(2, 'Insurer name is required'),
  claim_reference: z.string().optional(),
  status: ClaimStatusSchema.default('rejected'),
  policy_number: z.string().optional(),
  preferred_language: z.string().default('en'),
  user_notes: z.string().optional(),
  consent_agreed: z.literal(true, {
    errorMap: () => ({ message: 'You must provide consent to process documents.' })
  }),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

// ==========================================
// Document Types
// ==========================================
export const DocumentTypeSchema = z.enum([
  'policy_wording',
  'policy_schedule',
  'claim_rejection_letter',
  'settlement_letter',
  'hospital_bill',
  'discharge_summary',
  'insurer_query',
  'claim_form',
  'other_evidence'
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const ExtractionStatusSchema = z.enum([
  'pending',
  'extracting',
  'extracted',
  'ocr_required',
  'failed',
  'unsupported'
]);
export type ExtractionStatus = z.infer<typeof ExtractionStatusSchema>;

export const DocumentRecordSchema = z.object({
  id: z.string().uuid(),
  case_id: z.string().uuid(),
  filename: z.string(),
  storage_path: z.string(),
  file_type: z.string(),
  file_size_bytes: z.number().int().nonnegative(),
  document_type: DocumentTypeSchema.default('other_evidence'),
  page_count: z.number().int().nonnegative().default(1),
  extraction_status: ExtractionStatusSchema.default('pending'),
  extraction_error: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
});
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;

export const DocumentBlockSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  case_id: z.string().uuid(),
  page_number: z.number().int().positive(),
  block_index: z.number().int().nonnegative(),
  text: z.string(),
  extraction_confidence: z.number().min(0).max(1).default(1.0),
  bounding_box_json: z.record(z.any()).optional().nullable(),
  created_at: z.string().datetime().optional(),
});
export type DocumentBlock = z.infer<typeof DocumentBlockSchema>;

// ==========================================
// AI & Grounded Analysis Types
// ==========================================
export const FindingCategorySchema = z.enum([
  'rejection_reason',
  'deduction_reason',
  'policy_clause',
  'waiting_period',
  'exclusion_clause',
  'missing_evidence',
  'contradiction',
  'critical_date',
  'clarification_needed'
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const ConfidenceLabelSchema = z.enum([
  'high_confidence',
  'moderate_confidence',
  'low_confidence',
  'needs_verification'
]);
export type ConfidenceLabel = z.infer<typeof ConfidenceLabelSchema>;

export const ValidationStatusSchema = z.enum([
  'verified_exact_match',
  'verified_normalized_match',
  'unsupported_citation',
  'page_missing',
  'unverified_ocr'
]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const FindingSchema = z.object({
  id: z.string().uuid(),
  case_id: z.string().uuid(),
  category: FindingCategorySchema,
  source_statement: z.string(),
  source_document_id: z.string().uuid().optional().nullable(),
  page_number: z.number().int().positive().optional().nullable(),
  block_id: z.string().uuid().optional().nullable(),
  source_excerpt: z.string().optional().nullable(),
  user_document_facts: z.string(),
  interpretation: z.string(),
  confidence_label: ConfidenceLabelSchema.default('high_confidence'),
  missing_information: z.string().optional().nullable(),
  suggested_question: z.string().optional().nullable(),
  safety_note: z.string().optional().nullable(),
  validation_status: ValidationStatusSchema.default('verified_exact_match'),
  model_version: z.string().default('gemini-1.5-pro'),
  created_at: z.string().datetime().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ==========================================
// Checklist & Draft Types
// ==========================================
export const ChecklistStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'not_applicable'
]);
export type ChecklistStatus = z.infer<typeof ChecklistStatusSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string().uuid(),
  case_id: z.string().uuid(),
  item_text: z.string(),
  reason: z.string(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  evidence_refs: z.array(z.string()).default([]),
  status: ChecklistStatusSchema.default('pending'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const DraftTypeSchema = z.enum([
  'clarification_request',
  'reconsideration_letter',
  'ombudsman_escalation_notes',
  'grievance_representation'
]);
export type DraftType = z.infer<typeof DraftTypeSchema>;

export const RepresentationDraftSchema = z.object({
  id: z.string().uuid(),
  case_id: z.string().uuid(),
  draft_type: DraftTypeSchema.default('grievance_representation'),
  recipient_name: z.string().default('Claims Grievance Redressal Officer (GRO)'),
  subject: z.string(),
  salutation: z.string().default('Respected Sir/Madam,'),
  body: z.string(),
  referenced_facts: z.array(z.string()).default([]),
  supporting_documents_list: z.array(z.string()).default([]),
  sign_off: z.string().default('Yours sincerely,'),
  sender_name_placeholder: z.string().default('[Your Full Name]'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type RepresentationDraft = z.infer<typeof RepresentationDraftSchema>;

// ==========================================
// Feedback & Audit Types
// ==========================================
export const FeedbackSchema = z.object({
  id: z.string().uuid(),
  case_id: z.string().uuid(),
  finding_id: z.string().uuid().optional().nullable(),
  rating: z.enum(['helpful', 'inaccurate', 'confusing', 'incomplete']),
  correction_text: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  case_id: z.string().uuid().optional().nullable(),
  event_type: z.string(),
  metadata_json: z.record(z.any()).default({}),
  created_at: z.string().datetime().optional(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

// ==========================================
// Regulatory Guidance Data (India-Specific)
// ==========================================
export interface RegulatoryEscalationStep {
  step_number: number;
  stage_name: string;
  authority_or_channel: string;
  description: string;
  official_url: string;
  expected_timeline_days: number;
  prerequisite: string;
  disclaimer: string;
}

export const INDIA_HEALTH_GRIEVANCE_GUIDANCE: RegulatoryEscalationStep[] = [
  {
    step_number: 1,
    stage_name: 'Insurer Grievance Redressal Officer (GRO)',
    authority_or_channel: 'Internal Grievance Cell of the Insurance Company',
    description: 'Every registered insurer in India has a mandated Grievance Redressal Officer (GRO) and customer care escalation matrix. Submit your written representation citing claim reference and policy number.',
    official_url: 'https://bimabharosa.irdai.gov.in/',
    expected_timeline_days: 15,
    prerequisite: 'Official claim rejection letter or settlement voucher received.',
    disclaimer: 'The insurer must resolve or respond to the grievance within 15 days under IRDAI Protection of Policyholders\' Interests regulations.'
  },
  {
    step_number: 2,
    stage_name: 'IRDAI Bima Bharosa Portal',
    authority_or_channel: 'Insurance Regulatory and Development Authority of India (IRDAI)',
    description: 'If the insurer does not resolve your grievance within 15 days or rejects your representation, you can register a formal complaint on the IRDAI Bima Bharosa portal (Toll Free: 155255 / 1800 4254 732).',
    official_url: 'https://bimabharosa.irdai.gov.in/',
    expected_timeline_days: 30,
    prerequisite: 'Prior written complaint made to insurer GRO at least 15 days prior.',
    disclaimer: 'IRDAI facilitates resolution and tracks insurer response times; it does not directly adjudicate medical disputes.'
  },
  {
    step_number: 3,
    stage_name: 'Office of the Insurance Ombudsman',
    authority_or_channel: 'Council for Insurance Ombudsmen (CIO)',
    description: 'For claim disputes up to ₹50 Lakhs (including total/partial rejection, delay in settlement, or dispute over premium paid), you can approach the territorial Insurance Ombudsman within 1 year of insurer rejection.',
    official_url: 'https://www.cioins.co.in/',
    expected_timeline_days: 90,
    prerequisite: 'Written complaint made to insurer, which was rejected or unanswered for 30+ days; no pending civil/consumer court proceeding on the same matter.',
    disclaimer: 'Ombudsman award is binding on the insurer, but if dissatisfied, the insured can still pursue consumer court/legal avenues.'
  }
];
