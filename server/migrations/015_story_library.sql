-- Pre-made story library. Stories are written once (with name slots), reviewed by the owner, then reused for every family.
--   SELECT id, slug, title, grade_level, domain, theme, status, cost_usd FROM library_stories ORDER BY slug;
--   SELECT status, COUNT(*), ROUND(SUM(cost_usd), 4) FROM library_stories GROUP BY status;
CREATE TABLE IF NOT EXISTS library_stories (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  age_band TEXT NOT NULL,
  domain TEXT NOT NULL,
  theme TEXT NOT NULL,
  story_length TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  -- draft = written, waiting for the owner; approved = may be shown to families; rejected = never shown
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  -- { title, companion, defaultNames, solo: {pages}, duo: {pages}, questions, words, scene }
  content JSONB NOT NULL,
  -- { cover, pages: [...], questions: [...], words: { word: path } } as /library/... URLs
  assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- automatic checks: { moderation: {...}, attempts: N, topicCheck: 'clean' }
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  curriculum_standard TEXT,
  curriculum_objective TEXT,
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS library_stories_status_idx ON library_stories (status, slug);

-- One row per run of the library builder, so spend and failures can be seen afterwards.
CREATE TABLE IF NOT EXISTS library_build_runs (
  id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  requested INTEGER NOT NULL,
  created INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  budget_usd NUMERIC(10, 2) NOT NULL,
  image_model TEXT,
  image_style TEXT,
  note TEXT
);
