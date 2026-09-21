CREATE TABLE IF NOT EXISTS reading_sessions (
 id UUID PRIMARY KEY,
 story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
 account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds BETWEEN 0 AND 7200),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reading_observations (
 story_id UUID PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
 account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 assistance TEXT NOT NULL CHECK (assistance IN ('independent', 'some_help', 'read_together', 'not_observed')),
 note TEXT NOT NULL DEFAULT '',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_story ON reading_sessions(story_id);

ALTER TABLE learners ADD COLUMN IF NOT EXISTS reading_level TEXT NOT NULL DEFAULT '2';
