import { env } from '../config.js';
import {
  LiveAIProviderAdapter,
  LiveAIProviderRequest,
  LiveAIProviderResponse,
  LLMAnalysisOutputSchema,
  LLMAnalysisOutput,
} from './aiProvider.types.js';

export class GeminiProviderAdapter implements LiveAIProviderAdapter {
  private apiKey?: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey?: string, model?: string, timeoutMs?: number) {
    this.apiKey = apiKey || env.GEMINI_API_KEY;
    this.model = model || env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.timeoutMs = timeoutMs || env.AI_TIMEOUT_MS || 30000;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async analyzeClaim(req: LiveAIProviderRequest): Promise<LiveAIProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const systemPrompt = `You are the grounded insurance claims document intelligence engine for ClaimClarity.
Your role is strictly to extract, cross-reference, and explain documented facts from health insurance policies and repudiation correspondence in India.
NON-NEGOTIABLE SAFETY RULES:
1. Every material finding MUST link to an exact quoted source excerpt from the provided document excerpts.
2. DO NOT fabricate policy clauses, waiting periods, dates, medical conditions, or insurer communications.
3. If an excerpt does not contain the answer, state that information is missing.
4. Separate document facts from interpretation. Do not declare rejections illegal or guarantee claim approval.
5. Return ONLY a valid JSON object matching the requested schema.`;

    const userPrompt = `Analyze the following case documents:
Case Title: ${req.caseTitle}
Insurer: ${req.insurerName}
Claim Reference: ${req.claimReference || 'N/A'}
Policy Number: ${req.policyNumber || 'N/A'}
Status: ${req.claimStatus}
User Notes: ${req.userNotes || 'None'}

DOCUMENT EXCERPTS:
${JSON.stringify(req.documentExcerpts, null, 2)}

Respond with JSON adhering to this exact schema:
{
  "findings": [
    {
      "category": "rejection_reason" | "deduction_reason" | "policy_clause" | "waiting_period" | "exclusion_clause" | "missing_evidence" | "contradiction" | "critical_date" | "clarification_needed",
      "source_statement": string,
      "source_document_id": string (UUID of excerpt) or null,
      "page_number": number or null,
      "source_excerpt": string (exact quote) or null,
      "user_document_facts": string,
      "interpretation": string,
      "confidence_label": "high_confidence" | "moderate_confidence" | "low_confidence" | "needs_verification",
      "missing_information": string or null,
      "suggested_question": string or null,
      "safety_note": string or null
    }
  ],
  "checklist": [
    {
      "item_text": string,
      "reason": string,
      "priority": "high" | "medium" | "low",
      "evidence_refs": string[]
    }
  ],
  "draft_body": string (neutral representation letter body),
  "draft_subject": string (subject line)
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const executeRequest = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        return await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: payload,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    let response: Response;
    try {
      response = await executeRequest();
      // Bounded retry for transient 500/503 server errors only (max 1 retry with 1500ms delay)
      if ((response.status === 500 || response.status === 503) && !response.ok) {
        await new Promise(res => setTimeout(res, 1500));
        response = await executeRequest();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Gemini API call timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error(
          'Gemini Free-Tier quota or rate limit exceeded (15 RPM / 1,500 RPD). Please wait 60 seconds before trying again.'
        );
      }
      if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
        throw new Error('Invalid GEMINI_API_KEY configured in backend environment.');
      }
      if (response.status === 404) {
        throw new Error(`Configured Gemini model '${this.model}' was not found or is unavailable on this API tier.`);
      }
      throw new Error(`Gemini API returned HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini API returned an empty completion.');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse Gemini JSON output: ${parseErr.message}`);
    }

    const validatedOutput = LLMAnalysisOutputSchema.parse(parsedJson);

    return {
      provider: 'gemini',
      model: this.model,
      output: validatedOutput,
      rawResponse: rawText,
    };
  }
}

export class OpenAIProviderAdapter implements LiveAIProviderAdapter {
  private apiKey?: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey?: string, model?: string, timeoutMs?: number) {
    this.apiKey = apiKey || env.OPENAI_API_KEY;
    this.model = model || env.OPENAI_MODEL || 'gpt-4o';
    this.timeoutMs = timeoutMs || env.AI_TIMEOUT_MS || 30000;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async analyzeClaim(req: LiveAIProviderRequest): Promise<LiveAIProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not configured on the server.');
    }

    const systemPrompt = `You are the grounded insurance claims document intelligence engine for ClaimClarity.
Your role is strictly to extract, cross-reference, and explain documented facts from health insurance policies and repudiation correspondence in India.
NON-NEGOTIABLE SAFETY RULES:
1. Every material finding MUST link to an exact quoted source excerpt from the provided document excerpts.
2. DO NOT fabricate policy clauses, waiting periods, dates, medical conditions, or insurer communications.
3. If an excerpt does not contain the answer, state that information is missing.
4. Separate document facts from interpretation. Do not declare rejections illegal or guarantee claim approval.
5. Return ONLY a valid JSON object adhering to the schema.`;

    const userPrompt = `Analyze the following case documents:
Case Title: ${req.caseTitle}
Insurer: ${req.insurerName}
Claim Reference: ${req.claimReference || 'N/A'}
Policy Number: ${req.policyNumber || 'N/A'}
Status: ${req.claimStatus}
User Notes: ${req.userNotes || 'None'}

DOCUMENT EXCERPTS:
${JSON.stringify(req.documentExcerpts, null, 2)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          temperature: 0.1,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API returned HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error('OpenAI API returned an empty completion.');
      }

      const parsedJson = JSON.parse(rawText);
      const validatedOutput = LLMAnalysisOutputSchema.parse(parsedJson);

      return {
        provider: 'openai',
        model: this.model,
        output: validatedOutput,
        rawResponse: rawText,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`OpenAI API call timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
