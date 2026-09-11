ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

-- Preserve access for existing QA and pilot accounts; new registrations remain unverified.
UPDATE accounts
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_email_verification_token
    ON accounts(email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;
