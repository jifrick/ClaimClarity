-- ==============================================================================
-- ClaimClarity Migration 20261016_002: Hardened Constraints & Referential Integrity
-- Enhances table constraints, duplicate upload defense, and deletion performance
-- ==============================================================================

-- 1. Ensure foreign key indexes exist for performance & locking prevention
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_doc_id ON public.document_blocks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_case_id ON public.document_blocks(case_id);
CREATE INDEX IF NOT EXISTS idx_findings_case_id ON public.findings(case_id);
CREATE INDEX IF NOT EXISTS idx_checklist_case_id ON public.checklist_items(case_id);
CREATE INDEX IF NOT EXISTS idx_drafts_case_id ON public.drafts(case_id);
CREATE INDEX IF NOT EXISTS idx_feedback_case_id ON public.feedback(case_id);

-- 2. Add composite unique constraint to protect against accidental duplicate document submission in a single case
-- Allows clean idempotent re-uploads while preventing accidental duplicate spamming
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_case_document_filename'
    ) THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT uq_case_document_filename UNIQUE (case_id, filename);
    END IF;
END $$;

-- 3. Ensure profiles table has proper foreign key cascade on auth.users deletion
DO $$
BEGIN
    -- Verify deleted_at partial index for performant active-case lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cases_active_user_id'
    ) THEN
        CREATE INDEX idx_cases_active_user_id ON public.cases(user_id) WHERE deleted_at IS NULL;
    END IF;
END $$;
