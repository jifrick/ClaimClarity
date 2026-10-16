-- ==============================================================================
-- ClaimClarity Production Database Schema & Row Level Security (RLS)
-- Version 1.1 - Hardened Security, Private Storage & Strict Tenant Policies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. Cases Table
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    claim_type VARCHAR(50) NOT NULL DEFAULT 'reimbursement',
    insurer_name TEXT NOT NULL,
    claim_reference TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'rejected',
    policy_number TEXT,
    user_notes TEXT,
    consent_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own active cases"
    ON public.cases FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create their own cases"
    ON public.cases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases"
    ON public.cases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases"
    ON public.cases FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'other_evidence',
    page_count INT NOT NULL DEFAULT 1,
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    extraction_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents of their own cases"
    ON public.documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = documents.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can insert documents into their own cases"
    ON public.documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = documents.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can delete documents of their own cases"
    ON public.documents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = documents.case_id AND cases.user_id = auth.uid()
        )
    );

-- 4. Document Blocks Table (Extracted text segments per page)
CREATE TABLE IF NOT EXISTS public.document_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    block_index INT NOT NULL,
    text TEXT NOT NULL,
    extraction_confidence FLOAT NOT NULL DEFAULT 1.0,
    bounding_box_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_doc_blocks_case_id ON public.document_blocks(case_id);
CREATE INDEX IF NOT EXISTS idx_doc_blocks_doc_id_page ON public.document_blocks(document_id, page_number);

ALTER TABLE public.document_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document blocks of their own cases"
    ON public.document_blocks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = document_blocks.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

-- 5. Findings Table (AI-generated, source-grounded findings)
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    source_statement TEXT NOT NULL,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    page_number INT,
    block_id UUID REFERENCES public.document_blocks(id) ON DELETE SET NULL,
    source_excerpt TEXT,
    user_document_facts TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    confidence_label VARCHAR(50) NOT NULL DEFAULT 'high_confidence',
    missing_information TEXT,
    suggested_question TEXT,
    safety_note TEXT,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'verified_exact_match',
    model_version VARCHAR(50) NOT NULL DEFAULT 'gemini-1.5-pro',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_findings_case_id ON public.findings(case_id);

ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view findings of their own cases"
    ON public.findings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = findings.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

-- 6. Checklist Items Table
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    item_text TEXT NOT NULL,
    reason TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_checklist_case_id ON public.checklist_items(case_id);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist of their own cases"
    ON public.checklist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = checklist_items.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update checklist of their own cases"
    ON public.checklist_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = checklist_items.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

-- 7. Representation Drafts Table
CREATE TABLE IF NOT EXISTS public.drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    draft_type VARCHAR(50) NOT NULL DEFAULT 'grievance_representation',
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    salutation TEXT NOT NULL,
    body TEXT NOT NULL,
    referenced_facts JSONB DEFAULT '[]'::jsonb,
    supporting_documents_list JSONB DEFAULT '[]'::jsonb,
    sign_off TEXT NOT NULL,
    sender_name_placeholder TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_drafts_case_id ON public.drafts(case_id);

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and edit drafts of their own cases"
    ON public.drafts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = drafts.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

-- 8. Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    finding_id UUID REFERENCES public.findings(id) ON DELETE SET NULL,
    rating VARCHAR(50) NOT NULL,
    correction_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback for their own cases"
    ON public.feedback FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = feedback.case_id AND cases.user_id = auth.uid() AND cases.deleted_at IS NULL
        )
    );

-- 9. Audit Events Table (Strictly sanitized, no medical facts/PII)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_events(user_id);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
    ON public.audit_events FOR SELECT
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 10. Private Storage Bucket & Storage Security Policies
-- Bucket Name: "claim-documents" (Set to private: public = false)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'claim-documents',
    'claim-documents',
    false,
    15728640, -- 15MB strict limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf'];

-- RLS Policy: User can only upload to paths matching "cases/<case_id>/..." where they own the case
CREATE POLICY "Users can upload documents only to their own cases"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'claim-documents' AND
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id::text = (storage.foldername(name))[2]
              AND cases.user_id = auth.uid()
              AND cases.deleted_at IS NULL
        )
    );

-- RLS Policy: User can only read files for cases they own
CREATE POLICY "Users can download documents only from their own cases"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'claim-documents' AND
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id::text = (storage.foldername(name))[2]
              AND cases.user_id = auth.uid()
              AND cases.deleted_at IS NULL
        )
    );

-- RLS Policy: User can delete files only for cases they own
CREATE POLICY "Users can delete documents only from their own cases"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'claim-documents' AND
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id::text = (storage.foldername(name))[2]
              AND cases.user_id = auth.uid()
        )
    );
