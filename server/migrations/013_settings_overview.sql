-- A readable catalog of every setting (kept up to date by the server at startup) and a view that
-- shows, for each setting, the value in effect right now and where it comes from.
--
--   SELECT * FROM settings_overview;
--   -- change one (the live value updates within about 30 seconds):
--   INSERT INTO app_settings (key, value) VALUES ('free_story_limit', '8')
--     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
--   -- go back to the config file / built-in default:
--   DELETE FROM app_settings WHERE key = 'free_story_limit';
CREATE TABLE IF NOT EXISTS app_settings_catalog (
  key TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  help TEXT NOT NULL,
  type TEXT NOT NULL,
  choices JSONB,
  min_value INTEGER,
  max_value INTEGER,
  default_value JSONB NOT NULL,
  file_value JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW settings_overview AS
SELECT
  c.group_name AS "group",
  c.key,
  c.label,
  COALESCE(a.value, c.file_value, c.default_value) AS effective_value,
  CASE WHEN a.key IS NOT NULL THEN 'database' WHEN c.file_value IS NOT NULL THEN 'file' ELSE 'default' END AS source,
  a.value AS database_value,
  c.file_value,
  c.default_value AS built_in_default,
  c.type,
  c.min_value,
  c.max_value,
  c.choices,
  c.help,
  a.updated_by,
  a.updated_at
FROM app_settings_catalog c
LEFT JOIN app_settings a ON a.key = c.key
ORDER BY c.group_name, c.key;
