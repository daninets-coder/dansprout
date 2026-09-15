ALTER TABLE stories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_stories_active_created ON stories(learner_id, created_at DESC) WHERE deleted_at IS NULL;
