ALTER TABLE accounts ADD COLUMN IF NOT EXISTS sibling_sharing_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS shared_from_story_id UUID REFERENCES stories(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sibling_story_copy ON stories(shared_from_story_id, learner_id) WHERE shared_from_story_id IS NOT NULL;
