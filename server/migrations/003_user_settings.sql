-- User-settings additions: a profile picture (plain image URL, same
-- convention as shops.logo_url / shop_listings.photo_url - this app has
-- no file-upload storage) and a self-service "please delete my account"
-- request that an admin carries out by hand for now (no admin UI yet -
-- query the table directly; see routes/account.js).

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one open request per user at a time - matches the
-- one-pending-application pattern from migration 002.
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_one_pending_idx
  ON account_deletion_requests (user_id) WHERE status = 'pending';
