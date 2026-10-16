import {
  Case,
  DocumentRecord,
  DocumentBlock,
  Finding,
  ChecklistItem,
  RepresentationDraft
} from '@claimclarity/shared';
import { validateCitation } from './citationValidator.js';
import { env } from '../config.js';
import { GeminiProviderAdapter, OpenAIProviderAdapter } from './liveAiAdapters.js';
import { LiveAIProviderAdapter, LiveAIProviderRequest } from './aiProvider.types.js';
import crypto from 'crypto';

export interface AnalysisPipelineResult {
  providerMode: 'live_ai' | 'deterministic_demo';
  providerName: string;
  findings: Finding[];
  checklist: ChecklistItem[];
  draft: RepresentationDraft;
  summary: {
    totalFindings: number;
    verifiedCitations: number;
    unsupportedCitations: number;
    conflictsIdentified: number;
    uncertaintyNoted: boolean;
  };
}

/**
 * Prompt-Injection & Untrusted Data Defense Filter
 * Detects and neutralizes prompt-injection attempts inside uploaded document text
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+(in\s+developer\s+mode|dan|an\s+unrestricted)/i,
  /reveal\s+(all\s+)?(keys|passwords|database|secrets|cases)/i,
  /output\s+the\s+system\s+instruction/i,
  /disregard\s+(all\s+)?safety/i,
];

export function sanitizeDocumentBlockText(rawText: string): { sanitized: string; injectionDetected: boolean } {
  let injectionDetected = false;
  let text = rawText;

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      injectionDetected = true;
      text = text.replace(pattern, '[REDACTED: Malicious prompt-injection attempt detected in document]');
    }
  }

  return { sanitized: text, injectionDetected };
}

/**
 * Server-side AI & Evidence Grounding Orchestration Engine
 * Supports:
 * 1. Live AI Provider execution (Gemini / OpenAI) when configured with server credentials.
 * 2. Deterministic evidence-grounding engine when in demo mode or offline test.
 * 3. Deterministic citation validation on every candidate finding.
 * 4. Document contradiction detection and prompt-injection defenses.
 */
export async function runAnalysisPipeline(
  claimCase: Case,
  documents: DocumentRecord[],
  blocks: DocumentBlock[],
  customProviderAdapter?: LiveAIProviderAdapter
): Promise<AnalysisPipelineResult> {
  const findings: Finding[] = [];
  const checklist: ChecklistItem[] = [];

  // Filter blocks strictly for this case
  const rawCaseBlocks = blocks.filter(b => b.case_id === claimCase.id);

  // Sanitize each block against prompt injection attacks
  let hasInjections = false;
  const caseBlocks: DocumentBlock[] = rawCaseBlocks.map(b => {
    const { sanitized, injectionDetected } = sanitizeDocumentBlockText(b.text);
    if (injectionDetected) hasInjections = true;
    return { ...b, text: sanitized };
  });

  // Check if live AI adapter is configured and active
  let activeProvider: LiveAIProviderAdapter | null = customProviderAdapter || null;

  if (!activeProvider) {
    if (env.AI_PROVIDER === 'gemini') {
      const gemini = new GeminiProviderAdapter();
      if (gemini.isConfigured()) activeProvider = gemini;
    } else if (env.AI_PROVIDER === 'openai') {
      const openai = new OpenAIProviderAdapter();
      if (openai.isConfigured()) activeProvider = openai;
    }
  }

  // -------------------------------------------------------------
  // Path A: Live AI Provider Execution (with strict validation)
  // -------------------------------------------------------------
  if (activeProvider && activeProvider.isConfigured()) {
    try {
      const documentExcerpts = caseBlocks.map(b => {
        const doc = documents.find(d => d.id === b.document_id);
        return {
          documentId: b.document_id,
          filename: doc ? doc.filename : 'Document.pdf',
          documentType: doc ? doc.document_type : 'other_evidence',
          pageNumber: b.page_number,
          text: b.text,
        };
      });

      const liveReq: LiveAIProviderRequest = {
        caseTitle: claimCase.title,
        claimType: claimCase.claim_type,
        insurerName: claimCase.insurer_name,
        claimReference: claimCase.claim_reference,
        policyNumber: claimCase.policy_number,
        claimStatus: claimCase.status,
        userNotes: claimCase.user_notes,
        documentExcerpts,
      };

      const aiResponse = await activeProvider.analyzeClaim(liveReq);

      // Validate each candidate finding from the model deterministically
      for (const candidate of aiResponse.output.findings) {
        const finding: Finding = {
          id: crypto.randomUUID(),
          case_id: claimCase.id,
          category: candidate.category,
          source_statement: candidate.source_statement,
          source_document_id: candidate.source_document_id || null,
          page_number: candidate.page_number || null,
          block_id: null,
          source_excerpt: candidate.source_excerpt || null,
          user_document_facts: candidate.user_document_facts,
          interpretation: candidate.interpretation,
          confidence_label: candidate.confidence_label,
          missing_information: candidate.missing_information || null,
          suggested_question: candidate.suggested_question || null,
          safety_note: candidate.safety_note || null,
          validation_status: 'verified_exact_match',
          model_version: aiResponse.model,
          created_at: new Date().toISOString(),
        };

        const val = validateCitation(finding, caseBlocks);
        finding.validation_status = val.status;
        findings.push(finding);
      }

      for (const item of aiResponse.output.checklist) {
        checklist.push({
          id: crypto.randomUUID(),
          case_id: claimCase.id,
          item_text: item.item_text,
          reason: item.reason,
          priority: item.priority,
          evidence_refs: item.evidence_refs,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }

      const verifiedCount = findings.filter(f => f.validation_status.startsWith('verified')).length;
      const unsupportedCount = findings.length - verifiedCount;

      const draft: RepresentationDraft = {
        id: crypto.randomUUID(),
        case_id: claimCase.id,
        draft_type: 'grievance_representation',
        recipient_name: `Grievance Redressal Officer, ${claimCase.insurer_name}`,
        subject: aiResponse.output.draft_subject,
        salutation: 'Respected Sir/Madam,',
        body: aiResponse.output.draft_body,
        referenced_facts: findings.map(f => f.user_document_facts).slice(0, 4),
        supporting_documents_list: documents.map(d => d.filename),
        sign_off: 'Yours sincerely,',
        sender_name_placeholder: '[Your Full Name]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        providerMode: 'live_ai',
        providerName: `${aiResponse.provider}:${aiResponse.model}`,
        findings,
        checklist,
        draft,
        summary: {
          totalFindings: findings.length,
          verifiedCitations: verifiedCount,
          unsupportedCitations: unsupportedCount,
          conflictsIdentified: findings.filter(f => f.category === 'contradiction').length,
          uncertaintyNoted: unsupportedCount > 0,
        },
      };
    } catch (err: any) {
      // Never silently fabricate an AI success on provider failure
      throw new Error(`Live AI Analysis failed (${activeProvider.constructor.name}): ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Path B: Deterministic Evidence-Grounding Engine (Demo / Fallback)
  // -------------------------------------------------------------
  const rejectionDocs = documents.filter(d => d.document_type === 'claim_rejection_letter' || d.document_type === 'settlement_letter');
  const policyDocs = documents.filter(d => d.document_type === 'policy_wording' || d.document_type === 'policy_schedule');

  let rejectionFinding: Finding | null = null;
  let policyFinding: Finding | null = null;

  // Step 1: Rejection Reason Extraction & Verification
  if (rejectionDocs.length > 0) {
    const primaryRejectionDoc = rejectionDocs[0];
    const rejBlocks = caseBlocks.filter(b => b.document_id === primaryRejectionDoc.id);

    const rejBlock = rejBlocks.find(b =>
      /repudiat|reject|deni|clause|waiting period|exclusion/i.test(b.text)
    ) || rejBlocks[0];

    if (rejBlock) {
      const excerpt = rejBlock.text.length > 250 ? rejBlock.text.substring(0, 250) + '...' : rejBlock.text;
      rejectionFinding = {
        id: crypto.randomUUID(),
        case_id: claimCase.id,
        category: 'rejection_reason',
        source_statement: `Insurer stated basis for repudiation/settlement in document ${primaryRejectionDoc.filename}`,
        source_document_id: primaryRejectionDoc.id,
        page_number: rejBlock.page_number,
        block_id: rejBlock.id,
        source_excerpt: excerpt,
        user_document_facts: `Claim reference: ${claimCase.claim_reference || 'N/A'}. Stated status: ${claimCase.status}.`,
        interpretation: `The insurer's decision appears based on specific exclusion or waiting period terms cited in ${primaryRejectionDoc.filename}.`,
        confidence_label: 'high_confidence',
        missing_information: 'Verify if any prior medical diagnostic records were submitted or relied upon.',
        suggested_question: 'Request the insurer to provide the specific medical records or clause details supporting this determination.',
        safety_note: 'Informational analysis only: ClaimClarity does not adjudicate whether the rejection is legally binding.',
        validation_status: 'verified_exact_match',
        model_version: 'deterministic-demo-engine',
        created_at: new Date().toISOString(),
      };

      const val = validateCitation(rejectionFinding, caseBlocks);
      rejectionFinding.validation_status = val.status;
      findings.push(rejectionFinding);
    }
  } else {
    findings.push({
      id: crypto.randomUUID(),
      case_id: claimCase.id,
      category: 'missing_evidence',
      source_statement: 'Official rejection or settlement letter has not been uploaded to this case.',
      source_document_id: null,
      page_number: null,
      block_id: null,
      source_excerpt: null,
      user_document_facts: `Current status provided by user: ${claimCase.status}.`,
      interpretation: 'Without the insurer\'s formal written repudiation/settlement letter, the exact legal or contractual grounds cited cannot be verified.',
      confidence_label: 'needs_verification',
      missing_information: 'Formal rejection letter, query letter, or settlement voucher with itemized deduction codes.',
      suggested_question: 'Upload the formal decision letter from the insurer or Third Party Administrator (TPA).',
      safety_note: 'Analysis is limited until official decision wording is provided.',
      validation_status: 'unsupported_citation',
      model_version: 'deterministic-demo-engine',
      created_at: new Date().toISOString(),
    });
  }

  // Step 2: Policy Clause & Waiting Period Extraction & Verification
  if (policyDocs.length > 0) {
    const policyDoc = policyDocs[0];
    const polBlocks = caseBlocks.filter(b => b.document_id === policyDoc.id);
    const clauseBlock = polBlocks.find(b =>
      /section|clause|waiting period|exclusion|ped|pre-existing/i.test(b.text)
    ) || polBlocks[0];

    if (clauseBlock) {
      const polExcerpt = clauseBlock.text.length > 250 ? clauseBlock.text.substring(0, 250) + '...' : clauseBlock.text;
      policyFinding = {
        id: crypto.randomUUID(),
        case_id: claimCase.id,
        category: 'policy_clause',
        source_statement: `Policy wording clause in ${policyDoc.filename} (Page ${clauseBlock.page_number})`,
        source_document_id: policyDoc.id,
        page_number: clauseBlock.page_number,
        block_id: clauseBlock.id,
        source_excerpt: polExcerpt,
        user_document_facts: `Insurer: ${claimCase.insurer_name}. Policy Number: ${claimCase.policy_number || 'Not supplied'}.`,
        interpretation: 'Policy terms stipulate specific definitions and waiting period conditions that govern claim eligibility.',
        confidence_label: 'high_confidence',
        missing_information: 'Confirm continuous uninterrupted policy tenure across renewal periods.',
        suggested_question: 'Check if renewal portability certificates apply if you ported from an earlier policy.',
        safety_note: 'Policy wording must be read alongside the Policy Schedule and endorsement riders.',
        validation_status: 'verified_exact_match',
        model_version: 'deterministic-demo-engine',
        created_at: new Date().toISOString(),
      };

      const val = validateCitation(policyFinding, caseBlocks);
      policyFinding.validation_status = val.status;
      findings.push(policyFinding);
    }
  }

  // Step 3: Conflict Detection between Policy & Rejection
  let conflictsCount = 0;
  if (rejectionFinding && policyFinding) {
    const rejText = (rejectionFinding.source_excerpt || '').toLowerCase();
    const polText = (policyFinding.source_excerpt || '').toLowerCase();

    const rejectionClaimsExclusion = rejText.includes('pre-existing') || rejText.includes('waiting period') || rejText.includes('clause 4') || rejText.includes('section 4') || rejText.includes('ped');
    const policyHasEmergencyWaiver = polText.includes('emergency') || polText.includes('not subject to') || polText.includes('exempt') || polText.includes('exception');

    if (rejectionClaimsExclusion && policyHasEmergencyWaiver) {
      conflictsCount++;
      const conflictFinding: Finding = {
        id: crypto.randomUUID(),
        case_id: claimCase.id,
        category: 'contradiction',
        source_statement: 'Potential document conflict between stated repudiation ground and policy exemption clause.',
        source_document_id: policyFinding.source_document_id,
        page_number: policyFinding.page_number,
        block_id: policyFinding.block_id,
        source_excerpt: policyFinding.source_excerpt,
        user_document_facts: 'Rejection letter cites general waiting period, whereas policy terms provide an explicit exception for emergency surgical care.',
        interpretation: 'Apparent contradiction identified between insurer repudiation premise and policy exclusion waiver.',
        confidence_label: 'high_confidence',
        missing_information: 'Treating surgeon certification of emergency onset.',
        suggested_question: 'Highlight Policy Clause emergency exception directly to the Grievance Redressal Officer.',
        safety_note: 'Contradiction flagged for human evaluation; confirm policy edition year with insurer.',
        validation_status: 'verified_exact_match',
        model_version: 'deterministic-demo-engine',
        created_at: new Date().toISOString(),
      };

      const val = validateCitation(conflictFinding, caseBlocks);
      conflictFinding.validation_status = val.status;
      findings.push(conflictFinding);
    }
  }

  // Step 4: Prompt-Injection Alert Finding
  if (hasInjections) {
    findings.push({
      id: crypto.randomUUID(),
      case_id: claimCase.id,
      category: 'clarification_needed',
      source_statement: 'Security Alert: Prompt-injection instructions detected in uploaded document.',
      source_document_id: null,
      page_number: null,
      block_id: null,
      source_excerpt: null,
      user_document_facts: 'One or more document blocks contained text attempting to manipulate AI system instructions.',
      interpretation: 'Document text was neutralized and sanitized to prevent system instruction overrides.',
      confidence_label: 'high_confidence',
      missing_information: null,
      suggested_question: null,
      safety_note: 'System guardrails protected document analysis integrity.',
      validation_status: 'verified_exact_match',
      model_version: 'deterministic-demo-engine',
      created_at: new Date().toISOString(),
    });
  }

  // Step 5: Actionable Evidence Checklist Items
  checklist.push({
    id: crypto.randomUUID(),
    case_id: claimCase.id,
    item_text: 'Verify exact repudiation clause against policy schedule',
    reason: 'Ensures the clause cited by the insurer actually exists in the specific policy edition issued to you.',
    priority: 'high',
    evidence_refs: policyDocs.map(d => d.filename),
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  checklist.push({
    id: crypto.randomUUID(),
    case_id: claimCase.id,
    item_text: 'Obtain Treating Doctor / Surgeon Certificate of Acute Onset',
    reason: 'Crucial for countering allegations of pre-existing condition when symptoms occurred acutely.',
    priority: 'high',
    evidence_refs: ['Hospital discharge summary'],
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  checklist.push({
    id: crypto.randomUUID(),
    case_id: claimCase.id,
    item_text: 'Prepare formal representation to Grievance Redressal Officer (GRO)',
    reason: 'Mandated first escalation step under IRDAI Policyholder Protection Guidelines before Ombudsman approach.',
    priority: 'medium',
    evidence_refs: ['IRDAI Bima Bharosa Guidelines'],
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  // Step 6: Neutral Representation Draft
  const verifiedCount = findings.filter(f => f.validation_status === 'verified_exact_match' || f.validation_status === 'verified_normalized_match').length;
  const draftBody = `I am writing to formally submit a representation against the claim decision for Claim Reference ${claimCase.claim_reference || '[Claim Reference]'} under Policy ${claimCase.policy_number || '[Policy Number]'}.

Having reviewed the stated grounds alongside my policy terms, I wish to submit the following points for your review:

1. Stated Basis of Decision:
The insurer's correspondence indicates reliance on exclusion or waiting period provisions. I request itemized clarification regarding the specific documentary or clinical records on which this conclusion was reached.

2. Policy Provisions and Documented Facts:
As per the relevant policy documentation and hospital admission records, the treatment received was medically necessary and certified by the attending physician. I have attached the relevant discharge documents and certificates for your verification.

3. Request for Reconsideration:
In accordance with IRDAI guidelines regarding objective grievance handling, I respectfully request a re-examination of the claim documents and settlement of the admissible expenses.

I look forward to your prompt response within the 15-day regulatory timeline.`;

  const draft: RepresentationDraft = {
    id: crypto.randomUUID(),
    case_id: claimCase.id,
    draft_type: 'grievance_representation',
    recipient_name: `Grievance Redressal Officer, ${claimCase.insurer_name}`,
    subject: `Representation regarding Claim Ref: ${claimCase.claim_reference || 'N/A'} (Policy: ${claimCase.policy_number || 'N/A'})`,
    salutation: 'Respected Sir/Madam,',
    body: draftBody,
    referenced_facts: [
      `Insurer: ${claimCase.insurer_name}`,
      `Claim Status: ${claimCase.status}`,
      `Verified document findings: ${verifiedCount} source-linked clauses`
    ],
    supporting_documents_list: documents.map(d => d.filename),
    sign_off: 'Yours sincerely,',
    sender_name_placeholder: '[Your Full Name]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const unsupportedCount = findings.length - verifiedCount;

  return {
    providerMode: 'deterministic_demo',
    providerName: 'ClaimClarity Deterministic Engine',
    findings,
    checklist,
    draft,
    summary: {
      totalFindings: findings.length,
      verifiedCitations: verifiedCount,
      unsupportedCitations: unsupportedCount,
      conflictsIdentified: conflictsCount,
      uncertaintyNoted: rejectionDocs.length === 0 || unsupportedCount > 0,
    },
  };
}
