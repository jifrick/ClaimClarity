# ClaimClarity: AI Health Insurance Claim Assistance Platform

> **Tagline**: Understand your claim. Know your next step.  
> **Market**: India Health Insurance (IRDAI Bima Bharosa & Insurance Ombudsman Framework).  
> **Architecture**: TypeScript Monorepo (Node.js/Express + React 18/Vite + Tailwind CSS + Supabase PostgreSQL & Storage).

---

## 1. System Overview

ClaimClarity is a production-oriented insurtech platform designed to help policyholders understand and contest health insurance repudiations, delayed settlements, and unwarranted deductions.

### Key Capabilities
- **Deterministic Citation Validation**: Every material finding is deterministically cross-referenced against extracted document text before display. Unsupported claims are flagged explicitly as `unsupported_citation`.
- **Multi-Provider AI Architecture**: Includes server-side provider adapters for **Google Gemini 1.5 Pro** and **OpenAI GPT-4o** using strict Zod runtime JSON schemas and prompt-injection defenses.
- **Local Deterministic Fallback**: Allows complete, full-fidelity offline testing and evaluation without paid API keys.
- **Document Processing**: Uses `pdf2json` with page segmentation, block indexing, and automatic low-density / scanned-PDF detection.
- **Security & Multi-Tenant Privacy**: Row Level Security (RLS) policies on database rows and private storage buckets, with support for complete hard-erasure (`?hard=true`).

---

## 2. Monorepo Structure

```
├── apps/
│   ├── api/             # Express + TypeScript backend (Auth, Ingestion, AI Adapters)
│   └── web/             # React 18 + Vite frontend (Evidence Workspace, Drafts, Review)
├── packages/
│   └── shared/          # Shared domain schemas (Zod), types, and IRDAI grievance data
├── supabase/
│   └── migrations/      # PostgreSQL migrations & Storage RLS policies
└── tests/
    ├── unit/            # Pipeline audit, citation validation, OCR reliability, and AI safety
    ├── security/        # Tenant isolation, BOLA/IDOR tests, and hard-erasure
    └── fixtures/        # Valid test PDFs and simulated policy documents
```

---

## 3. Local Development & Verification

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v10+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build All Workspaces
```bash
npm run build
```

### Step 3: Run the Complete Automated Test Suite (35 Tests)
```bash
npm test
```

### Step 4: Start Services Locally
In Terminal 1 (API Server on port 3001):
```bash
npm run dev:api
```

In Terminal 2 (Web Client on port 5173):
```bash
npm run dev:web
```

---

## 4. Final Setup & Deployment Checklist

All features are fully developed, wired, and tested locally. When you are ready to configure live cloud accounts, perform these manual steps:

### A. Live AI Provider Configuration (Google Gemini or OpenAI)
1. In `apps/api/.env`, choose your provider:
   ```env
   # Option 1: Google Gemini (Recommended)
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-pro

   # Option 2: OpenAI
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o
   ```
2. Restart the API server (`npm run dev:api`). The workspace header badge will automatically switch from `Deterministic Demo Engine` to `Live AI Engine (<model>)`.

### B. Hosted Supabase Database & Private Storage
1. Create a project at [supabase.com](https://supabase.com).
2. Retrieve your project URL, anon key, and service-role key from **Project Settings $\rightarrow$ API**.
3. In `apps/api/.env`:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_secret_service_role_key
   ```
4. In `apps/web/.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_public_anon_key
   ```
5. Apply the migration:
   - In Supabase SQL Editor, run [`supabase/migrations/20261015_001_initial_schema.sql`](file:///c:/Users/muhammed%20jifri%20ck/Documents/new%20one/supabase/migrations/20261015_001_initial_schema.sql).
   - This creates all 9 tables, activates Row Level Security, creates the private `claim-documents` storage bucket, and installs bucket RLS policies.

### C. Cloud OCR Provider (Optional for Scanned Invoices)
- Digital PDFs are extracted locally via `pdf2json`.
- For physical camera scans or non-selectable raster PDFs, plug your cloud OCR credentials (e.g. Google Cloud Vision API or AWS Textract) into [`apps/api/src/services/ocrProvider.ts`](file:///c:/Users/muhammed%20jifri%20ck/Documents/new%20one/apps/api/src/services/ocrProvider.ts).
- If OCR is unconfigured, ClaimClarity safely flags the document as `ocr_required` and processes all digital pages without crashing.

### D. Production Deployment
- **Frontend**: Deploy `apps/web` to Vercel or Cloudflare Pages (`npm run build`). Set `VITE_API_URL` to your production backend URL.
- **Backend API**: Deploy `apps/api` to Railway, Render, Fly.io, or an AWS container with Node.js 20+.
