# ClaimClarity — Final Setup & Production Onboarding Checklist

This document consolidates **only** the actions and cloud authorizations that genuinely require external account access, personal credentials, or hosted deployment actions.

---

## 1. Supabase Project & Database Credentials

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
4. Place them into your server and client environment files:
   - In `apps/api/.env`:
     ```env
     STORAGE_MODE=supabase
     SUPABASE_URL=https://lfxjkptfxiakokeqkpop.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=<your_confidential_service_role_key>
     ```
   - In `apps/web/.env`:
     ```env
     VITE_SUPABASE_URL=https://lfxjkptfxiakokeqkpop.supabase.co
     VITE_SUPABASE_ANON_KEY=<your_public_anon_key>
     ```

---

## 2. Authentication & Google OAuth Configuration (Optional)

### Action Required
1. In Supabase Dashboard, navigate to **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Google**.
2. If enabling Google Sign-In:
   - Register OAuth credentials in [Google Cloud Console](https://console.cloud.google.com).
   - Enter your `Client ID` and `Client Secret` into Supabase.
   - Set Authorized Redirect URI to `https://lfxjkptfxiakokeqkpop.supabase.co/auth/v1/callback`.
3. To test immediately without OAuth, email/password authentication and the built-in synthetic demo user switcher work automatically out of the box.

---

## 3. Live AI Provider Configuration (Google Gemini or OpenAI)

### Action Required
1. Choose either Google Gemini (recommended) or OpenAI:
   - **Google Gemini**: Get an API key from [Google AI Studio](https://aistudio.google.com).
     In `apps/api/.env`:
     ```env
     AI_PROVIDER=gemini
     GEMINI_API_KEY=<your_gemini_api_key>
     GEMINI_MODEL=gemini-1.5-pro
     ```
   - **OpenAI**: Get an API key from [OpenAI Platform](https://platform.openai.com).
     In `apps/api/.env`:
     ```env
     AI_PROVIDER=openai
     OPENAI_API_KEY=<your_openai_api_key>
     OPENAI_MODEL=gpt-4o
     ```
2. When configured, restarting the backend automatically activates the `Live AI Engine` badge in the case workspace. If left as `demo`, the offline deterministic evidence verifier operates with zero cost.

---

## 4. Cloud OCR Engine (Optional for Physical Paper Camera Scans)

### Context
Digital PDFs (e.g. computer-generated repudiation letters, e-insurance policies, PDF discharge summaries) are parsed locally via `pdf2json` without requiring any cloud OCR fees.

### Action Required (Only if physical camera snapshots of paper receipts are needed)
1. In Google Cloud Console or AWS:
   - Enable **Google Cloud Vision API** or **AWS Textract**.
2. In `apps/api/.env`:
   ```env
   OCR_PROVIDER=cloud_vision   # or textract
   OCR_API_KEY=<your_ocr_api_key>
   ```
3. If unconfigured, the application detects scanned pages, extracts all digital pages safely, and displays an honest notice (`Scanned: OCR Unconfigured`) without crashing.

---

## 5. Hosting & Deployment Configuration

### Frontend Web (Vercel / Cloudflare Pages)
- **Root Directory**: `apps/web` (or Monorepo Root)
- **Build Command**: `npm run build` (Note: `apps/web` has an automated `prebuild` hook that builds `@claimclarity/shared` first if needed)
- **Output Directory**: `dist`
- **Environment Variables**:
  ```env
  VITE_API_URL=https://api.yourdomain.com/api/v1
  VITE_SUPABASE_URL=https://lfxjkptfxiakokeqkpop.supabase.co
  VITE_SUPABASE_ANON_KEY=<your_public_anon_key>
  ```

### Backend API (Railway / Render / Fly.io / AWS ECS)
- **Root Directory**: Monorepo root
- **Build Command**: `npm run build`
- **Start Command**: `node apps/api/dist/server.js`
- **Environment Variables**:
  ```env
  NODE_ENV=production
  PORT=3001
  FRONTEND_ORIGIN=https://claimclarity.yourdomain.com
  STORAGE_MODE=supabase
  SUPABASE_URL=https://lfxjkptfxiakokeqkpop.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
  AI_PROVIDER=gemini
  GEMINI_API_KEY=<your_key>
  ```

---

## 6. Production Security & Launch Verification

1. **Verify CORS**: Ensure `FRONTEND_ORIGIN` matches your exact frontend production domain.
2. **Review Supabase Auth URL Configuration**: Set **Site URL** and **Redirect URLs** in Supabase Auth settings to your production frontend URL.
3. **Push to Remote Git**:
   ```bash
   git push origin main
   ```
