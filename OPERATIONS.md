# Story Sprout Operations Runbook

## Health and Readiness

Use these endpoints for Railway health checks and uptime monitoring:

```text
GET /api/healthz
GET /api/readyz
```

`/api/healthz` confirms the service can reach PostgreSQL. `/api/readyz` is the deployment readiness probe. Monitor both from an external uptime provider and alert on non-2xx responses or sustained latency.

## Structured Logs and Errors

The server emits JSON logs containing:

- `timestamp`
- `level`
- `event`
- `requestId`
- HTTP method, path, status, and duration

Server errors are also persisted as operational events without storing child story prompts. Forward Railway logs to a log or error-monitoring provider before public launch.

## Owner Metrics

The site owner can request the last 24 hours of operational metrics:

```text
GET /api/ops/metrics
```

The endpoint reports HTTP error events, AI calls, token totals, approximate AI cost, and Stripe webhook receipt/failure counts. It requires `OWNER_EMAIL` and an authenticated owner session.

AI cost is an estimate based on the configured `gpt-4o-mini` rates in the server code. Reconcile it with the OpenAI billing dashboard before using it for invoices or accounting.

## AI Budget and Monitoring

Configure:

```env
AI_MONTHLY_INVOCATION_LIMIT=100
OPENAI_ENABLE_MODERATION=true
```

AI invocations store provider, model, token usage, and estimated cost. Child prompts are not stored in AI usage records. Safety blocks and user reports are recorded as minimal operational events.

## Database Backups

Use a managed PostgreSQL backup schedule in production. A manual PostgreSQL dump can be created with:

```powershell
pg_dump --format=custom --file=backups/story-sprout-$(Get-Date -Format yyyyMMdd-HHmm).dump $env:DATABASE_URL
```

Store backups outside the application host, encrypt them, restrict access, and test restoration regularly. Never commit backup files to Git.

## Migrations

Schema changes should be added as numbered files under `server/migrations/`.

Apply pending migrations explicitly:

```powershell
npm run db:migrate
```

`npm run db:init` remains available for local setup. The server also checks migrations during startup, but production deployment should run the migration command as a release step and review migration failures before starting traffic.

## Railway Deployment and Rollback

Before deployment:

1. Run syntax checks and database migration checks locally.
2. Deploy to a private environment first.
3. Confirm `/api/healthz` and `/api/readyz` return success.
4. Test Stripe webhook delivery and AI generation limits.

To roll back, use the Railway deployment history to redeploy the last known-good deployment. Do not use destructive database resets. Forward-only migrations must be backward-compatible with the application version during rollback.

## Stripe Webhook Monitoring

Stripe webhook events are recorded with their event ID, status, received time, processed time, and failure message. Monitor:

- Failed webhook count
- Duplicate delivery count
- Delayed processing
- Stripe Dashboard delivery failures

A duplicate event is acknowledged without applying the subscription change twice.
