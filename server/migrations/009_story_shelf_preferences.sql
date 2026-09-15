CREATE TABLE IF NOT EXISTS story_preferences (
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    bookmarked_page INTEGER NOT NULL DEFAULT 0 CHECK (bookmarked_page >= 0),
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (story_id, account_id, learner_id)
);
CREATE INDEX IF NOT EXISTS idx_story_preferences_account_favorite ON story_preferences(account_id, is_favorite, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_preferences_story_rating ON story_preferences(story_id, rating) WHERE rating IS NOT NULL;
