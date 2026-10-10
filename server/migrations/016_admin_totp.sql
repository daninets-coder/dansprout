-- Authenticator-app (TOTP) second step for the owner-only admin area.
-- Lost your phone? In SQL:  DELETE FROM admin_totp;   then enrol again from the admin page.
CREATE TABLE IF NOT EXISTS admin_totp (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  last_step BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
