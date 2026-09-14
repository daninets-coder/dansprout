ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS child_mode_pin_hash TEXT;
