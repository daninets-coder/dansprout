ALTER TABLE learners
  ADD COLUMN IF NOT EXISTS child_username TEXT,
  ADD COLUMN IF NOT EXISTS child_password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_learners_child_username
  ON learners (LOWER(child_username))
  WHERE child_username IS NOT NULL;
