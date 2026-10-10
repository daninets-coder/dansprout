# admin_SQL.md: configure StoryAura Land with SQL

Run these in the Railway Postgres query console (Railway dashboard, Postgres service, Data/Query).
Changes apply to the live site within about 30 seconds. No deploy needed.

How settings are chosen (first one with a value wins):
1. the database table `app_settings` (what this file edits)
2. `config/settings.json` (project defaults, needs a deploy to change)
3. the built-in default in `server/modules/settings.js`

`value` is JSONB: numbers are plain (`8`), text needs JSON quotes (`'"marin"'`), email lists are JSON arrays (`'["a@b.com"]'`).
Out-of-range values are ignored by the server and the default is used.

## 1. See everything

```sql
SELECT * FROM settings_overview ORDER BY "group", key;     -- every setting, its current value and where it comes from
SELECT key, value, updated_at, updated_by FROM app_settings ORDER BY key;   -- only what you overrode
```

## 2. Set a value (copy the line you need, change the number)

```sql
-- Free trial
INSERT INTO app_settings (key, value) VALUES
  ('free_period_days',          '14'),   -- days of free access (1-365)
  ('free_story_limit',          '5'),    -- AI-written stories during the free period
  ('free_library_story_limit',  '10'),   -- ready-made library stories during the free period
  ('free_learner_limit',        '1')     -- learners on a free account
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Paid plans (learner limits, monthly story cap; 0 = unlimited)
INSERT INTO app_settings (key, value) VALUES
  ('learner_limit_individual',  '1'),
  ('learner_limit_family',      '5'),
  ('learner_limit_classroom',   '30'),
  ('paid_story_limit_monthly',  '0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Pricing page: 'default' (follow the server setting), 'on' (show "Coming soon"), 'off' (show real plans)
INSERT INTO app_settings (key, value) VALUES ('pricing_coming_soon', '"on"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Accounts that are never limited (the owner email always is)
INSERT INTO app_settings (key, value) VALUES ('plan_exempt_emails', '["friend@example.com","tester@example.com"]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Pictures and voice
INSERT INTO app_settings (key, value) VALUES
  ('illustrations_enabled', '"on"'),                 -- on / off
  ('image_style',          '"bright_cartoon"'),      -- bright_cartoon / soft_pastel / flat_vector / storybook_painting
  ('image_model',          '"gpt-image-2.5-flare"'),
  ('image_quality',        '"low"'),                 -- low / medium / high
  ('image_cost_usd',       '0'),                     -- 0 = estimate automatically; otherwise price per picture in USD
  ('narration_voice',      '"marin"')                -- marin / cedar / coral / nova / shimmer
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Limits and safeguards
INSERT INTO app_settings (key, value) VALUES
  ('ai_monthly_limit',          '100'),    -- AI actions per account per month
  ('story_requests_per_15min',  '30'),     -- story requests, whole site, per 15 minutes
  ('roster_import_max',         '100')     -- classroom CSV import: max learners
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

## 3. Go back to the default for one setting

```sql
DELETE FROM app_settings WHERE key = 'free_story_limit';
```

## 4. Ready-made story library

```sql
SELECT status, COUNT(*) FROM library_stories GROUP BY 1;                         -- how many approved / draft / rejected
SELECT slug, title, grade_level, status FROM library_stories ORDER BY slug;

UPDATE library_stories SET status = 'rejected', review_note = 'why' WHERE slug = 'lib-042';   -- hide one story
UPDATE library_stories SET status = 'approved' WHERE slug = 'lib-042';                        -- show it again
UPDATE library_stories SET status = 'rejected' WHERE grade_level = 'PreK';                    -- hide a whole grade
```

## 5. Reporting

```sql
SELECT COUNT(*) AS accounts FROM accounts;
SELECT COUNT(*) FROM stories WHERE created_at > NOW() - INTERVAL '7 days';
SELECT created_by, COUNT(*) FROM stories GROUP BY 1;                             -- AI vs ready-made ('library')
SELECT model, COUNT(*), ROUND(SUM(estimated_cost_usd)::numeric, 2) AS usd
  FROM ai_invocations GROUP BY 1 ORDER BY usd DESC NULLS LAST;                   -- what AI is costing you
SELECT created_at, actor_email, action, target FROM admin_audit_log ORDER BY created_at DESC LIMIT 50;   -- who changed what
```

Note: the admin page asks for your password on changes and writes an audit-log row. Plain SQL does neither, so SQL changes are not in the audit log.

## 6. Two-step login (authenticator app)

The admin area asks for a 6-digit authenticator code (good for 8 hours per browser session). First visit: the page walks you through setup.

```sql
DELETE FROM admin_totp;   -- lost your phone? clears the authenticator; the next admin visit offers setup again
SELECT created_at, action FROM admin_audit_log WHERE action LIKE 'twofactor%' ORDER BY created_at DESC LIMIT 20;
```

Anyone who can run SQL on the database can reset it, so keep Railway and GitHub locked down with their own two-step login.

## 7. Secret address for the admin page

```sql
-- admin page moves from /admin to dansprout.com/k7Qp-93xLmZt-aura  (12 to 64 letters, numbers, - or _)
INSERT INTO app_settings (key, value) VALUES ('admin_page_path', '"k7Qp-93xLmZt-aura"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

DELETE FROM app_settings WHERE key = 'admin_page_path';   -- back to /admin
```
