-- Mandatory email verification + password reset. Both features share
-- the same shape: a random, single-use, short-lived token emailed to
-- the account's address, redeemed by one endpoint - see
-- server/src/db/tokens.js (issue/consume) and server/src/email.js
-- (how the email itself is sent).
--
-- Tokens are stored as a SHA-256 hash, not the raw value - same
-- reasoning as users.password_hash - so a database leak alone doesn't
-- hand out usable tokens. The raw token only ever exists in the
-- emailed link and the request that redeems it.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Grandfather in every account that existed before this migration as
-- already-verified - otherwise every existing tester would be locked
-- out of their own account the moment login starts requiring it.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id);
