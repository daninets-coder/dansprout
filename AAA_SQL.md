# Story Sprout SQL Debugging Guide

## pgAdmin Connection Details

Use these fields when creating a PostgreSQL server connection in pgAdmin. Do
not store the real password in this document or commit it to Git.

| pgAdmin field | Local development | Railway/production |
|---|---|---|
| Name | `Story Sprout Local` | `Story Sprout Production` |
| Host name/address | `localhost` | Use the private database host from Railway `DATABASE_URL` |
| Port | `5432` | Use the port from Railway `DATABASE_URL`, commonly `5432` |
| Maintenance database | `postgres` | Usually `postgres` unless Railway specifies another database |
| Username | The PostgreSQL username from `.env` | The username from Railway `DATABASE_URL` |
| Password | The password from your private `.env` | The password from Railway's private `DATABASE_URL` |
| SSL mode | `Prefer` for local development | Use the SSL setting required by Railway |

### Reading `DATABASE_URL`

The connection string usually follows this pattern:

```text
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

Copy each part into the matching pgAdmin field. Never paste the full connection
string into a public document, screenshot, support ticket, or chat message.

### Recommended setup

- Use a read-only PostgreSQL user for debugging whenever possible.
- Use local development data while learning SQL.
- Ask for approval before connecting pgAdmin to production.
- Do not share the password, even with support or collaborators.

This document contains read-only PostgreSQL queries for debugging Story Sprout functionality. Run these queries against the application database using a trusted administrator connection.

## Safety First

These queries are intended for debugging and reporting.

- Run them against a copy or read-only database user when possible.
- Never paste passwords, JWT tokens, reset tokens, API keys, or payment-card details into SQL.
- Replace placeholders such as `<account_uuid>` with real values before running.
- Keep child and learner data private.
- Use `DELETE` or `UPDATE` only through the application unless a controlled database repair is approved.
- Prefer `LIMIT` while investigating large tables.

The examples use PostgreSQL syntax.

## Useful psql Commands

```sql
-- Show the current database and user
SELECT current_database(), current_user;

-- Show all tables in the public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Show columns for a table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'learners'
ORDER BY ordinal_position;
```

## 1. Account Registration And Login

### List accounts without passwords

```sql
SELECT
    id,
    email,
    display_name,
    role,
    email_verified_at,
    ai_external_opt_in,
    privacy_policy_version,
    created_at,
    updated_at
FROM accounts
ORDER BY created_at DESC
LIMIT 100;
```

### Find one account by email

```sql
SELECT
    id,
    email,
    display_name,
    role,
    email_verified_at,
    ai_external_opt_in,
    privacy_policy_version,
    created_at,
    updated_at
FROM accounts
WHERE LOWER(email) = LOWER('<email_address>');
```

### Check whether an account is verified

```sql
SELECT
    email,
    email_verified_at,
    CASE
        WHEN email_verified_at IS NULL THEN 'not verified'
        ELSE 'verified'
    END AS verification_status
FROM accounts
WHERE LOWER(email) = LOWER('<email_address>');
```

### Count accounts by role

```sql
SELECT role, COUNT(*) AS account_count
FROM accounts
GROUP BY role
ORDER BY role;
```

### Recent consent records

```sql
SELECT
    account_id,
    event_type,
    policy_version,
    metadata,
    created_at
FROM consent_audit_log
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 100;
```

## 2. Email Verification And Password Reset

### Check verification token state without exposing the token

```sql
SELECT
    email,
    email_verification_expires_at,
    CASE
        WHEN email_verification_token_hash IS NULL THEN 'no active token'
        WHEN email_verification_expires_at <= NOW() THEN 'expired'
        ELSE 'active'
    END AS token_status
FROM accounts
WHERE id = '<account_uuid>';
```

### Check recent password-reset requests

Do not select `token_hash`.

```sql
SELECT
    id,
    account_id,
    expires_at,
    used_at,
    created_at,
    CASE
        WHEN used_at IS NOT NULL THEN 'used'
        WHEN expires_at <= NOW() THEN 'expired'
        ELSE 'active'
    END AS token_status
FROM password_reset_tokens
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 20;
```

### Find accounts with active reset tokens

```sql
SELECT
    a.email,
    prt.expires_at,
    prt.created_at
FROM password_reset_tokens prt
JOIN accounts a ON a.id = prt.account_id
WHERE prt.used_at IS NULL
  AND prt.expires_at > NOW()
ORDER BY prt.created_at DESC;
```

## 3. Learner Profiles

### List all learners for one adult account

```sql
SELECT
    id,
    first_name,
    age_band,
    interests,
    topics_to_avoid,
    topics_to_avoid_options,
    created_at,
    updated_at
FROM learners
WHERE account_id = '<account_uuid>'
ORDER BY created_at;
```

### Find a learner and confirm ownership

```sql
SELECT
    l.id,
    l.first_name,
    l.age_band,
    l.interests,
    l.topics_to_avoid,
    l.topics_to_avoid_options,
    a.email AS adult_email
FROM learners l
JOIN accounts a ON a.id = l.account_id
WHERE l.id = '<learner_uuid>';
```

### List learner goals

```sql
SELECT
    l.first_name,
    g.goal
FROM learner_goals g
JOIN learners l ON l.id = g.learner_id
WHERE l.account_id = '<account_uuid>'
ORDER BY l.first_name, g.goal;
```

### Count learners by age band

```sql
SELECT age_band, COUNT(*) AS learner_count
FROM learners
GROUP BY age_band
ORDER BY age_band;
```

### Find learners missing interests or avoidance notes

```sql
SELECT
    id,
    first_name,
    age_band,
    interests,
    topics_to_avoid
FROM learners
WHERE account_id = '<account_uuid>'
  AND NULLIF(TRIM(interests), '') IS NULL
  AND NULLIF(TRIM(topics_to_avoid), '') IS NULL;
```

## 4. Add And Edit Learners

### Verify a learner update target belongs to an account

```sql
SELECT id, account_id, first_name, age_band, interests, topics_to_avoid, updated_at
FROM learners
WHERE id = '<learner_uuid>'
  AND account_id = '<account_uuid>';
```

### Review recently edited learner profiles

```sql
SELECT
    id,
    account_id,
    first_name,
    age_band,
    updated_at
FROM learners
ORDER BY updated_at DESC
LIMIT 50;
```

The application performs learner updates through:

```text
PATCH /api/learners/:learnerId
```

Use SQL here to inspect the result, not to bypass the account ownership check.

## 5. Story Generation

### List recent stories for an account

```sql
SELECT
    s.id,
    s.title,
    l.first_name AS learner_name,
    s.theme,
    s.learning_goal,
    s.created_by,
    s.completed_at,
    s.created_at
FROM stories s
JOIN learners l ON l.id = s.learner_id
WHERE l.account_id = '<account_uuid>'
ORDER BY s.created_at DESC
LIMIT 100;
```

### Inspect one story's metadata

```sql
SELECT
    id,
    title,
    theme,
    learning_goal,
    created_by,
    content->'meta' AS story_metadata,
    created_at,
    completed_at
FROM stories
WHERE id = '<story_uuid>';
```

### Check whether a story belongs to an adult account

```sql
SELECT
    s.id AS story_id,
    s.title,
    l.id AS learner_id,
    l.first_name,
    l.account_id
FROM stories s
JOIN learners l ON l.id = s.learner_id
WHERE s.id = '<story_uuid>'
  AND l.account_id = '<account_uuid>';
```

### Count stories by learner

```sql
SELECT
    l.id AS learner_id,
    l.first_name,
    COUNT(s.id) AS stories_created,
    COUNT(s.completed_at) AS stories_completed
FROM learners l
LEFT JOIN stories s ON s.learner_id = l.id
WHERE l.account_id = '<account_uuid>'
GROUP BY l.id, l.first_name
ORDER BY l.first_name;
```

### Find stories with missing content fields

```sql
SELECT
    id,
    title,
    content->'pages' IS NOT NULL AS has_pages,
    content->'questions' IS NOT NULL AS has_questions,
    content->'words' IS NOT NULL AS has_vocabulary,
    created_at
FROM stories
WHERE content->'pages' IS NULL
   OR content->'questions' IS NULL
   OR content->'words' IS NULL
ORDER BY created_at DESC;
```

## 6. AI Usage, Cost, And Limits

### Recent AI calls for an account

```sql
SELECT
    id,
    story_id,
    provider,
    model,
    input_tokens,
    output_tokens,
    estimated_cost_usd,
    created_at
FROM ai_invocations
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 100;
```

### Current-month AI invocation count

```sql
SELECT
    COUNT(*) AS monthly_ai_calls,
    COALESCE(SUM(estimated_cost_usd), 0) AS estimated_monthly_cost_usd,
    COALESCE(SUM(input_tokens), 0) AS input_tokens,
    COALESCE(SUM(output_tokens), 0) AS output_tokens
FROM ai_invocations
WHERE account_id = '<account_uuid>'
  AND created_at >= DATE_TRUNC('month', NOW());
```

### AI usage for all accounts this month

```sql
SELECT
    a.email,
    COUNT(ai.id) AS ai_calls,
    COALESCE(SUM(ai.estimated_cost_usd), 0) AS estimated_cost_usd,
    COALESCE(SUM(ai.input_tokens), 0) AS input_tokens,
    COALESCE(SUM(ai.output_tokens), 0) AS output_tokens
FROM accounts a
LEFT JOIN ai_invocations ai
    ON ai.account_id = a.id
   AND ai.created_at >= DATE_TRUNC('month', NOW())
GROUP BY a.id, a.email
ORDER BY estimated_cost_usd DESC;
```

### AI safety events

```sql
SELECT
    event_type,
    account_id,
    metadata,
    created_at
FROM ai_safety_events
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 100;
```

Common safety events include:

- `input_blocked`
- `output_blocked`
- `ai_budget_blocked`
- `safety_reported`

## 7. Assessments And Story Checks

### List assessment results for a learner

```sql
SELECT
    ra.id,
    s.title,
    ra.score,
    ra.mastered,
    ra.review_status,
    ra.confidence,
    ra.standards_evidence,
    ra.created_at,
    ra.reviewed_at
FROM reading_assessments ra
JOIN stories s ON s.id = ra.story_id
WHERE ra.learner_id = '<learner_uuid>'
ORDER BY ra.created_at DESC;
```

### Get the latest assessment for every learner in an account

```sql
SELECT DISTINCT ON (ra.learner_id)
    l.first_name,
    s.title,
    ra.score,
    ra.review_status,
    ra.confidence,
    ra.created_at
FROM reading_assessments ra
JOIN learners l ON l.id = ra.learner_id
JOIN stories s ON s.id = ra.story_id
WHERE l.account_id = '<account_uuid>'
ORDER BY ra.learner_id, ra.created_at DESC;
```

### Find assessments awaiting adult review

```sql
SELECT
    ra.id,
    l.first_name,
    s.title,
    ra.score,
    ra.review_status,
    ra.created_at
FROM reading_assessments ra
JOIN learners l ON l.id = ra.learner_id
JOIN stories s ON s.id = ra.story_id
WHERE ra.review_status = 'pending'
ORDER BY ra.created_at ASC;
```

### Compare completion with assessments

```sql
SELECT
    l.first_name,
    COUNT(DISTINCT s.id) AS stories_created,
    COUNT(DISTINCT s.id) FILTER (WHERE s.completed_at IS NOT NULL) AS stories_completed,
    COUNT(ra.id) AS story_checks
FROM learners l
LEFT JOIN stories s ON s.learner_id = l.id
LEFT JOIN reading_assessments ra ON ra.story_id = s.id
WHERE l.account_id = '<account_uuid>'
GROUP BY l.id, l.first_name;
```

Remember: a story-check score measures understanding of that story's questions. It is not a complete reading assessment or automatic proof of overall mastery.

## 8. Vocabulary

### See vocabulary stored in one story

```sql
SELECT
    id,
    title,
    content->'words' AS vocabulary
FROM stories
WHERE id = '<story_uuid>';
```

### Find stories with no vocabulary

```sql
SELECT id, title, created_at
FROM stories
WHERE content->'words' IS NULL
   OR jsonb_array_length(content->'words') = 0
ORDER BY created_at DESC;
```

## 9. Progress And Welcome Back Data

### Account progress summary

```sql
SELECT
    l.id,
    l.first_name,
    COUNT(DISTINCT s.id) AS stories_created,
    COUNT(DISTINCT s.id) FILTER (WHERE s.completed_at IS NOT NULL) AS stories_completed,
    COUNT(DISTINCT ra.id) AS assessments_completed,
    COALESCE(ROUND(AVG(ra.score))::int, 0) AS average_score
FROM learners l
LEFT JOIN stories s ON s.learner_id = l.id
LEFT JOIN reading_assessments ra ON ra.learner_id = l.id
WHERE l.account_id = '<account_uuid>'
GROUP BY l.id, l.first_name
ORDER BY l.first_name;
```

### Latest story activity for one learner

```sql
SELECT
    s.id,
    s.title,
    s.learning_goal,
    s.completed_at,
    s.created_at,
    s.content->'meta'->>'curriculumObjective' AS objective,
    s.content->'words' AS vocabulary
FROM stories s
WHERE s.learner_id = '<learner_uuid>'
ORDER BY s.created_at DESC
LIMIT 1;
```

## 10. Privacy, Export, And Deletion

### Check data that belongs to an account

```sql
SELECT
    (SELECT COUNT(*) FROM learners WHERE account_id = '<account_uuid>') AS learners,
    (SELECT COUNT(*) FROM stories s JOIN learners l ON l.id = s.learner_id WHERE l.account_id = '<account_uuid>') AS stories,
    (SELECT COUNT(*) FROM reading_assessments ra JOIN learners l ON l.id = ra.learner_id WHERE l.account_id = '<account_uuid>') AS assessments,
    (SELECT COUNT(*) FROM consent_audit_log WHERE account_id = '<account_uuid>') AS consent_records;
```

### Check learner cascade children before deletion

```sql
SELECT
    l.id AS learner_id,
    l.first_name,
    (SELECT COUNT(*) FROM learner_goals WHERE learner_id = l.id) AS goals,
    (SELECT COUNT(*) FROM stories WHERE learner_id = l.id) AS stories,
    (SELECT COUNT(*) FROM reading_assessments WHERE learner_id = l.id) AS assessments
FROM learners l
WHERE l.id = '<learner_uuid>'
  AND l.account_id = '<account_uuid>';
```

### Check pending account-deletion confirmation requests

Do not select `token_hash`.

```sql
SELECT
    account_id,
    expires_at,
    used_at,
    created_at,
    CASE
        WHEN used_at IS NOT NULL THEN 'used'
        WHEN expires_at <= NOW() THEN 'expired'
        ELSE 'active'
    END AS status
FROM account_deletion_tokens
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC;
```

### Check pending subscription-cancellation requests

```sql
SELECT
    account_id,
    reason,
    expires_at,
    used_at,
    created_at,
    CASE
        WHEN used_at IS NOT NULL THEN 'used'
        WHEN expires_at <= NOW() THEN 'expired'
        ELSE 'active'
    END AS status
FROM subscription_cancellation_tokens
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC;
```

## 11. Subscriptions And Billing

### Current subscription

```sql
SELECT
    account_id,
    plan,
    status,
    provider_customer_id,
    provider_subscription_id,
    created_at,
    updated_at
FROM subscriptions
WHERE account_id = '<account_uuid>'
ORDER BY updated_at DESC;
```

### Find canceled subscriptions

```sql
SELECT
    a.email,
    s.plan,
    s.status,
    s.provider_subscription_id,
    s.updated_at
FROM subscriptions s
JOIN accounts a ON a.id = s.account_id
WHERE s.status = 'canceled'
ORDER BY s.updated_at DESC
LIMIT 100;
```

### Find subscription records missing Stripe IDs

```sql
SELECT
    account_id,
    plan,
    status,
    provider_customer_id,
    provider_subscription_id
FROM subscriptions
WHERE status = 'active'
  AND (provider_customer_id IS NULL OR provider_subscription_id IS NULL);
```

### Billing webhook events

```sql
SELECT
    event_id,
    event_type,
    status,
    received_at,
    processed_at,
    error_message
FROM stripe_webhook_events
ORDER BY received_at DESC
LIMIT 100;
```

## 12. Reminders

### Reminder preference for an account

```sql
SELECT
    account_id,
    weekly_email_enabled,
    updated_at
FROM reminder_preferences
WHERE account_id = '<account_uuid>';
```

### Count enabled reminder accounts

```sql
SELECT COUNT(*) AS enabled_weekly_reminders
FROM reminder_preferences
WHERE weekly_email_enabled = TRUE;
```

## 13. Teacher Classroom Workflows

### Imported classroom records

```sql
SELECT
    id,
    account_id,
    imported_count,
    created_at
FROM classroom_imports
WHERE account_id = '<teacher_account_uuid>'
ORDER BY created_at DESC;
```

### Teacher roster

```sql
SELECT
    l.id,
    l.first_name,
    l.age_band,
    l.interests,
    l.created_at
FROM learners l
WHERE l.account_id = '<teacher_account_uuid>'
ORDER BY l.created_at;
```

## 14. Support And Operations

### Recent operational errors

```sql
SELECT
    event_type,
    severity,
    request_id,
    message,
    metadata,
    created_at
FROM ops_events
WHERE severity IN ('warn', 'error')
ORDER BY created_at DESC
LIMIT 100;
```

### Recent support-related server requests

```sql
SELECT
    event_type,
    severity,
    request_id,
    message,
    created_at
FROM ops_events
WHERE event_type ILIKE '%support%'
ORDER BY created_at DESC
LIMIT 100;
```

### Recent growth events

```sql
SELECT
    a.email,
    ge.event_name,
    ge.metadata,
    ge.created_at
FROM growth_events ge
JOIN accounts a ON a.id = ge.account_id
ORDER BY ge.created_at DESC
LIMIT 100;
```

## 15. Health And Readiness

These checks are HTTP endpoints rather than SQL queries:

```text
GET /api/healthz
GET /api/readyz
```

For database-only checking, use:

```sql
SELECT NOW() AS database_time;
SELECT 1 AS database_is_reachable;
```

## 16. Common Debugging Questions

### Why can a user not see a learner?

Check:

```sql
SELECT id, account_id, first_name
FROM learners
WHERE id = '<learner_uuid>';
```

Then compare `account_id` with the signed-in account ID. The API intentionally hides records that belong to another account.

### Why did story generation stop?

Check:

```sql
SELECT COUNT(*) AS calls_this_month
FROM ai_invocations
WHERE account_id = '<account_uuid>'
  AND created_at >= DATE_TRUNC('month', NOW());
```

Then inspect safety events:

```sql
SELECT event_type, metadata, created_at
FROM ai_safety_events
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 20;
```

Also check the Railway environment variables for `OPENAI_API_KEY` and AI opt-in status.

### Why did a support email not arrive?

Check these areas:

1. `SUPPORT_EMAIL` points to a real receiving mailbox.
2. Resend shows the message as delivered instead of bounced.
3. `EMAIL_FROM` uses the verified sending domain.
4. The support mailbox spam folder is checked.
5. Railway logs show no `Support email is not configured yet` error.

### Why did a password-reset email not arrive?

Check:

```sql
SELECT expires_at, used_at, created_at
FROM password_reset_tokens
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 5;
```

Then inspect Resend email logs and Railway environment variables.

### Why did subscription cancellation not complete?

Check:

```sql
SELECT account_id, reason, expires_at, used_at, created_at
FROM subscription_cancellation_tokens
WHERE account_id = '<account_uuid>'
ORDER BY created_at DESC
LIMIT 5;
```

The parent must enter the current password and open the newest email link before cancellation completes.

## 17. Safe Debugging Habits

- Start with `SELECT` queries.
- Add `LIMIT` to exploratory queries.
- Never display password hashes or token hashes in a support message.
- Never copy learner story content into public tickets.
- Use account and learner UUIDs carefully.
- Confirm the account owner before investigating private data.
- Keep production database credentials private.
- Record approved manual repairs.
- Prefer application routes over direct database edits.
