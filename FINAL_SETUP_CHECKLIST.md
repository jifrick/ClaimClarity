# ClaimClarity — Final Setup & Production Onboarding Checklist

This document consolidates **only** the actions and cloud authorizations that genuinely require external account access, personal credentials, or hosted deployment actions.

---

## 1. Google Gemini API Integration (Free Tier Controlled Testing)

### Important Free-Tier Terms & Privacy Notice
> [!CAUTION]
> **Data Privacy Warning on Free Tier**: Under the Google Gemini API Free-of-Charge Terms of Service (Google AI Studio), submitted prompts, document excerpts, and responses may be reviewed by human annotators and used to train Google machine learning models.
> - **DO NOT submit real patient PHI, live health documents, or unredacted insurance records to the free tier.**
> - Use only **synthetic, anonymized, or redacted test documents** during free-tier testing.
> - Transition to Google Cloud Vertex AI or a paid Gemini billing account if real health records must be processed without model training.

### Free-Tier Quota & Rate Limits (Flash Family)
- **Model**: `gemini-1.5-flash` (or `gemini-2.5-flash`)
- **Requests Per Minute (RPM)**: 15 RPM
- **Requests Per Day (RPD)**: 1,500 RPD
- **Tokens Per Minute (TPM)**: 1,000,000 TPM
- **Input Context Window**: Up to 1,000,000 tokens
- **Rate Limit Reset**: Daily quotas reset at midnight Pacific Time (PT).
- **Quota Tracking Console**: [Google AI Studio Rate Limits](https://aistudio.google.com/rate-limit)

### Step-by-Step API Key Creation
1. Go to [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google Account.
3. Click **Get API key** in the left sidebar navigation.
4. Click **Create API key** (choose an existing Google Cloud project or create a new project).
5. Copy the generated secret key string.
6. **Security Mandate**: Never paste or commit this key to frontend code, Git repositories, Vite `.env`, or browser-accessible configs. It must reside exclusively in backend environment variables.

---

## 2. Supabase Project & Database Credentials

### Status
- **PostgreSQL Database Connection**: Verified & Connected.
- **DDL Migrations Applied**: Both migrations (`20261015_001_initial_schema.sql` and `20261016_002_hardened_constraints.sql`) were executed against your cluster at `aws-0-ap-southeast-2.pooler.supabase.com:5432`.
- **Private Storage Bucket**: `claim-documents` created with 15MB file size limit and strict PDF MIME constraints.

### Action Required
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard/project/lfxjkptfxiakokeqkpop).
2. Navigate to **Project Settings** $\rightarrow$ **API**.
3. Copy:
   - **Project URL** (e.g., `https://lfxjkptfxiakokeqkpop.supabase.co`)
   - **anon / public key**
   - **service_role / secret key**

---

## 3. Hosting & Deployment Environment Variables

### A. Frontend Web (Vercel)
The ClaimClarity frontend is deployed on Vercel. In your Vercel Project Dashboard $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**, configure:

| Variable Name | Environment | Value / Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | Production, Preview | Public HTTPS URL of the deployed backend API (e.g. `https://api.yourdomain.com/api/v1` or `https://claimclarity-api.up.railway.app/api/v1`) |
| `VITE_SUPABASE_URL` | Production, Preview | `https://lfxjkptfxiakokeqkpop.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Your public Supabase anon key (`eyJhbGciOi...`) |

> [!IMPORTANT]
> **Why Vercel alone is not the whole system**: Vercel serves the static React SPA frontend. Because `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to browser clients, document analysis and database operations happen via the backend Express API (`apps/api`). `VITE_API_URL` must point to your hosted backend for live AI and persistent cases to work from the Vercel site.

### B. Backend API Hosting (Railway / Render / Fly.io / AWS)
Deploy the monorepo root or `apps/api` container with Node.js 18+. In the hosting provider's dashboard, configure the following exact server environment variables:

| Variable Name | Value / Description | Confidential |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | No |
| `PORT` | `3001` (or provider `$PORT`) | No |
| `FRONTEND_ORIGIN` | Your Vercel domain (e.g., `https://claimclarity.vercel.app`) | No |
| `STORAGE_MODE` | `supabase` (or `memory` for temporary stateless testing) | No |
| `SUPABASE_URL` | `https://lfxjkptfxiakokeqkpop.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your_confidential_service_role_key>` | **CRITICAL SECRET** |
| `AI_PROVIDER` | `gemini` (or `demo` for offline deterministic verification) | No |
| `GEMINI_API_KEY` | `<your_gemini_api_key_from_ai_studio>` | **CRITICAL SECRET** |
| `GEMINI_MODEL` | `gemini-1.5-flash` | No |
| `AI_TIMEOUT_MS` | `30000` | No |

- **Build Command**: `npm run build`
- **Start Command**: `node apps/api/dist/server.js`

---

## 4. Distinguishing Demo Mode vs Live AI Engine

ClaimClarity makes provider status fully explicit in the UI and response payloads:

1. **In the Case Workspace UI**:
   - **Live AI Mode**: A green badge displays `Live AI Engine (gemini:gemini-1.5-flash)`.
   - **Demo Mode**: A soft teal badge displays `Deterministic Demo Engine`.
2. **In API Responses (`POST /api/v1/cases/:id/analysis`)**:
   - `providerMode: "live_ai"` with `providerName: "gemini:gemini-1.5-flash"`.
   - In demo mode: `providerMode: "deterministic_demo"` with `providerName: "offline_deterministic_verifier"`.
3. **If Live AI Fails / Quota Exceeded**:
   - The API will never silently generate fake findings. It returns an explicit error message (e.g., `Gemini Free-Tier quota or rate limit exceeded... Please wait 60 seconds`) so users and developers know exactly what occurred.

---

## 5. Safe Synthetic-Document Smoke Test Procedure

Run this controlled test after configuring `GEMINI_API_KEY`:

1. Open the ClaimClarity application in your browser.
2. Click **New Claim Case**.
   - **Case Title**: `Synthetic Daycare Chemotherapy Test`
   - **Claim Type**: `Reimbursement`
   - **Insurer**: `Care Health Insurance`
   - **Policy Number**: `CARE-SYNTH-2026-001`
   - **Claim Reference**: `CIR/2026/SYNTH-88`
   - **Status**: `Partially Settled / Repudiated`
3. Upload a synthetic test PDF containing:
   - *Insurer note*: "Claim deducted ₹45,000 because daycare chemotherapy did not involve 24 hours hospitalization."
   - *Policy wording excerpt*: "Section 3.4 Day Care Procedures: Medical advancements allow chemotherapy without 24 hours hospitalization. Day care treatments listed in Annexure A are payable up to Sum Insured."
4. Click **Run Evidence-Grounded Analysis**.
5. **Verify Output**:
   - Confirm the badge shows `Live AI Engine (gemini:gemini-1.5-flash)`.
   - Confirm Findings include `Section 3.4` with **Verified Citation** (`verified_exact_match`).
   - Confirm Action Checklist and Grievance Representation draft are populated with quotes from the synthetic document.

---

## 6. Optional OCR Engine (Camera Scans of Physical Receipts)
- Digital PDFs (e-policies, computerized hospital summaries) are parsed locally via `pdf2json` with zero OCR costs.
- If physical paper camera photos must be processed, configure:
  ```env
  OCR_PROVIDER=cloud_vision   # or textract
  OCR_API_KEY=<your_ocr_api_key>
  ```
- If unconfigured, scanned pages display an honest notice: `Scanned: OCR Unconfigured`.
