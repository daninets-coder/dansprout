CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error')),
    request_id TEXT,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_events_created ON ops_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_events_type_created ON ops_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received ON stripe_webhook_events(received_at DESC);

ALTER TABLE ai_invocations ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE ai_invocations ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE ai_invocations ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10,6);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_account ON password_reset_tokens(account_id, created_at DESC);
