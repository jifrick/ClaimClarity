import {
  Case,
  DocumentRecord,
  DocumentBlock,
  Finding,
  ChecklistItem,
  RepresentationDraft,
  Feedback,
  AuditEvent
} from '@claimclarity/shared';

// Thread-safe in-memory store for development/demo mode when Supabase DB is offline
class MemoryStore {
  public cases: Map<string, Case> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();
  public documentBlocks: Map<string, DocumentBlock[]> = new Map(); // docId -> blocks
  public findings: Map<string, Finding[]> = new Map(); // caseId -> findings
  public checklistItems: Map<string, ChecklistItem[]> = new Map(); // caseId -> items
  public drafts: Map<string, RepresentationDraft[]> = new Map(); // caseId -> drafts
  public feedback: Feedback[] = [];
  public auditEvents: AuditEvent[] = [];

  constructor() {
    this.seedSyntheticDemo();
  }

  public seedSyntheticDemo() {
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const demoCaseId = '11111111-1111-1111-1111-111111111111';
    const docPolicyId = '22222222-2222-2222-2222-222222222221';
    const docRejectionId = '22222222-2222-2222-2222-222222222222';

    // 1. Synthetic Case: Acute Appendectomy Rejection (Alleged Pre-existing Exclusion 4.1)
    const demoCase: Case = {
      id: demoCaseId,
      user_id: demoUserId,
      title: 'Emergency Appendectomy Claim Rejection - Policy 2024/09',
      claim_type: 'reimbursement',
      insurer_name: 'Star Care General Insurance Co. Ltd.',
      claim_reference: 'CIR/2026/DEL/891244',
      status: 'rejected',
      policy_number: 'POL-HLT-9923841-A',
      user_notes: 'Admitted for sudden acute appendicitis on 14 Aug 2026. Claim of ₹1,42,000 rejected stating pre-existing condition waiting period, but policy has been active for 38 months.',
      consent_version: 'v1.0',
      created_at: new Date('2026-08-20T10:00:00Z').toISOString(),
      updated_at: new Date('2026-08-20T10:00:00Z').toISOString(),
      deleted_at: null,
    };
    this.cases.set(demoCaseId, demoCase);

    // 2. Synthetic Documents
    const docPolicy: DocumentRecord = {
      id: docPolicyId,
      case_id: demoCaseId,
      filename: 'StarCare_HealthOptima_PolicyWording.pdf',
      storage_path: `cases/${demoCaseId}/StarCare_HealthOptima_PolicyWording.pdf`,
      file_type: 'application/pdf',
      file_size_bytes: 482910,
      document_type: 'policy_wording',
      page_count: 24,
      extraction_status: 'extracted',
      extraction_error: null,
      created_at: new Date('2026-08-20T10:02:00Z').toISOString(),
    };

    const docRejection: DocumentRecord = {
      id: docRejectionId,
      case_id: demoCaseId,
      filename: 'Repudiation_Letter_CIR891244.pdf',
      storage_path: `cases/${demoCaseId}/Repudiation_Letter_CIR891244.pdf`,
      file_type: 'application/pdf',
      file_size_bytes: 142100,
      document_type: 'claim_rejection_letter',
      page_count: 2,
      extraction_status: 'extracted',
      extraction_error: null,
      created_at: new Date('2026-08-20T10:03:00Z').toISOString(),
    };

    this.documents.set(docPolicyId, docPolicy);
    this.documents.set(docRejectionId, docRejection);

    // 3. Document Blocks (Extracted Text)
    const policyBlocks: DocumentBlock[] = [
      {
        id: '33333333-3333-3333-3333-333333333301',
        document_id: docPolicyId,
        case_id: demoCaseId,
        page_number: 14,
        block_index: 0,
        text: 'Section 4.1: Pre-Existing Diseases (PED) Waiting Period - A waiting period of thirty-six (36) months of continuous coverage shall apply to all pre-existing medical conditions disclosed prior to inception.',
        extraction_confidence: 0.99,
        created_at: new Date().toISOString(),
      },
      {
        id: '33333333-3333-3333-3333-333333333302',
        document_id: docPolicyId,
        case_id: demoCaseId,
        page_number: 15,
        block_index: 1,
        text: 'Section 4.2: Specific Illness Waiting Period - Coverage for treatment of Benign Prostatic Hypertrophy, Hernia, Hydrocele, Congenital Internal Disease, and Fistula is subject to a twenty-four (24) months waiting period. Emergency acute surgical procedures like acute perforated or non-perforated appendicitis are NOT subject to Section 4.2 exclusions.',
        extraction_confidence: 0.98,
        created_at: new Date().toISOString(),
      }
    ];

    const rejectionBlocks: DocumentBlock[] = [
      {
        id: '33333333-3333-3333-3333-333333333303',
        document_id: docRejectionId,
        case_id: demoCaseId,
        page_number: 1,
        block_index: 0,
        text: 'We regret to inform you that your claim CIR/2026/DEL/891244 for hospitalization from 14/08/2026 to 17/08/2026 at Fortis Hospital is repudiated under Clause 4.1 (Pre-Existing Condition Waiting Period) as the symptoms indicate a pre-existing gastrointestinal complaint.',
        extraction_confidence: 0.97,
        created_at: new Date().toISOString(),
      }
    ];

    this.documentBlocks.set(docPolicyId, policyBlocks);
    this.documentBlocks.set(docRejectionId, rejectionBlocks);

    // 4. Source-Grounded Findings
    const caseFindings: Finding[] = [
      {
        id: '44444444-4444-4444-4444-444444444401',
        case_id: demoCaseId,
        category: 'rejection_reason',
        source_statement: 'Repudiation under Clause 4.1 (Pre-Existing Condition Waiting Period) as symptoms indicate a pre-existing gastrointestinal complaint.',
        source_document_id: docRejectionId,
        page_number: 1,
        block_id: '33333333-3333-3333-3333-333333333303',
        source_excerpt: '...claim CIR/2026/DEL/891244 for hospitalization from 14/08/2026 to 17/08/2026 at Fortis Hospital is repudiated under Clause 4.1 (Pre-Existing Condition Waiting Period)...',
        user_document_facts: 'Hospital discharge summary diagnoses acute onset appendicitis requiring emergency laparoscopic appendectomy on 14/08/2026.',
        interpretation: 'The insurer rejected the claim arguing appendicitis is a pre-existing gastrointestinal condition falling under Clause 4.1 waiting period.',
        confidence_label: 'high_confidence',
        missing_information: 'No previous medical history or prior treatment records were referenced or provided by the insurer to prove pre-existence.',
        suggested_question: 'Request the insurer to provide the clinical documentary proof or past consultation records on which they based the allegation of pre-existing disease.',
        safety_note: 'Informational finding: Insurer bears the initial evidentiary burden to show medical pre-existence under IRDAI Master Circular guidelines.',
        validation_status: 'verified_exact_match',
        model_version: 'gemini-1.5-pro',
        created_at: new Date().toISOString(),
      },
      {
        id: '44444444-4444-4444-4444-444444444402',
        case_id: demoCaseId,
        category: 'waiting_period',
        source_statement: 'Policy Section 4.1 mandates 36 months waiting period for pre-existing diseases. Policy Section 4.2 specifically states acute appendicitis is NOT excluded.',
        source_document_id: docPolicyId,
        page_number: 15,
        block_id: '33333333-3333-3333-3333-333333333302',
        source_excerpt: 'Emergency acute surgical procedures like acute perforated or non-perforated appendicitis are NOT subject to Section 4.2 exclusions.',
        user_document_facts: 'Policy inception date was 01 June 2023. At the time of surgery (August 2026), continuous coverage duration was 38 months, exceeding the 36-month PED waiting period regardless.',
        interpretation: 'Even if considered pre-existing, 38 months of continuous coverage satisfies the 36-month threshold. Furthermore, Section 4.2 expressly excludes acute appendicitis from general waiting period restrictions.',
        confidence_label: 'high_confidence',
        missing_information: null,
        suggested_question: 'Highlight to the Grievance Officer that continuous coverage (38 months) exceeds the 36-month PED period and cite Section 4.2 clause on emergency appendicitis.',
        safety_note: 'Ensure all renewal certificates/endorsements proving 38 months of uninterrupted coverage are attached.',
        validation_status: 'verified_exact_match',
        model_version: 'gemini-1.5-pro',
        created_at: new Date().toISOString(),
      }
    ];
    this.findings.set(demoCaseId, caseFindings);

    // 5. Checklist Items
    const caseChecklist: ChecklistItem[] = [
      {
        id: '55555555-5555-5555-5555-555555555501',
        case_id: demoCaseId,
        item_text: 'Collate continuous renewal certificates from June 2023 to 2026',
        reason: 'Proves 38 months of uninterrupted coverage, superseding the 36-month PED waiting limit under Section 4.1.',
        priority: 'high',
        evidence_refs: ['StarCare_HealthOptima_PolicyWording.pdf p.14'],
        status: 'pending',
        created_at: new Date().toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555502',
        case_id: demoCaseId,
        item_text: 'Obtain Treating Surgeon Certificate regarding acute emergency onset',
        reason: 'Certifies that acute appendicitis had sudden onset with no prior history or consultation.',
        priority: 'high',
        evidence_refs: ['Repudiation_Letter_CIR891244.pdf p.1'],
        status: 'completed',
        created_at: new Date().toISOString(),
      },
      {
        id: '55555555-5555-5555-5555-555555555503',
        case_id: demoCaseId,
        item_text: 'Send representation to Insurer Grievance Redressal Officer (GRO)',
        reason: 'Mandatory first step under IRDAI grievance redressal rules before escalating to Ombudsman.',
        priority: 'high',
        evidence_refs: ['IRDAI Grievance Redressal Mechanism'],
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    ];
    this.checklistItems.set(demoCaseId, caseChecklist);

    // 6. Representation Draft
    const caseDraft: RepresentationDraft = {
      id: '66666666-6666-6666-6666-666666666601',
      case_id: demoCaseId,
      draft_type: 'grievance_representation',
      recipient_name: 'Grievance Redressal Officer, Star Care General Insurance Co. Ltd.',
      subject: 'Representation against Repudiation of Claim Ref: CIR/2026/DEL/891244 (Policy: POL-HLT-9923841-A)',
      salutation: 'Respected Grievance Officer,',
      body: `I am writing to formally submit a representation against the repudiation letter dated 18/08/2026 concerning my emergency hospitalization at Fortis Hospital from 14/08/2026 to 17/08/2026 for acute appendectomy (Claim Ref: CIR/2026/DEL/891244).

Your repudiation letter cites Clause 4.1 (Pre-Existing Disease Waiting Period), stating that the symptoms represent a pre-existing gastrointestinal complaint. I respectfully request a review based on verified policy terms and factual records:

1. Continuous Coverage Exceeds Clause 4.1 Waiting Period:
My policy was originally incepted on 01/06/2023 and has been renewed without any lapse for 38 continuous months. Section 4.1 of the Policy Wording specifies a 36-month waiting period for pre-existing conditions. Therefore, even assuming without conceding that the condition were pre-existing, the 36-month waiting period stands completely completed.

2. Explicit Coverage under Policy Section 4.2:
Section 4.2 of your Policy Terms explicitly provides that "Emergency acute surgical procedures like acute perforated or non-perforated appendicitis are NOT subject to Section 4.2 exclusions." The attached Treating Surgeon's Certificate confirms acute, emergency surgical onset with no prior history.

3. Absence of Substantiating Evidence for Alleged Pre-Existence:
Under IRDAI (Protection of Policyholders' Interests) Regulations, repudiation on grounds of pre-existing condition requires credible medical records prior to policy inception. No such evidence has been cited in the repudiation letter.

In view of the above documented facts, I request you to reconsider and settle the claim amount of ₹1,42,000 at the earliest.`,
      referenced_facts: [
        'Hospitalization dates: 14/08/2026 to 17/08/2026 at Fortis Hospital',
        'Continuous coverage duration: 38 months (Inception 01/06/2023)',
        'Policy Section 4.1 (36-month PED period)',
        'Policy Section 4.2 (Acute appendicitis emergency exception)'
      ],
      supporting_documents_list: [
        'Repudiation letter dated 18/08/2026',
        'Continuous Policy renewal certificates (2023, 2024, 2025, 2026)',
        'Hospital Discharge Summary and Emergency Admission Notes',
        'Certificate of Acute Onset from Chief Operating Surgeon',
        'Itemized Hospital Bill and Payment Receipts'
      ],
      sign_off: 'Yours sincerely,',
      sender_name_placeholder: 'Rajesh Sharma',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.drafts.set(demoCaseId, [caseDraft]);
  }
}

export const memoryStore = new MemoryStore();
