-- Story privacy checkpoint: generated stories start as drafts until a parent confirms.
-- Existing stories stay 'saved'. The audit table stores ids and timestamps only, never story content.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'saved';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS review_confirmed_at TIMESTAMPTZ;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS review_confirmed_by UUID;
CREATE INDEX IF NOT EXISTS idx_stories_status_created ON stories(status, created_at);

CREATE TABLE IF NOT EXISTS story_deletion_audit (
    id UUID PRIMARY KEY,
    story_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL
);
