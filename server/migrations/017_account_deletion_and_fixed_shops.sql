-- 017: account deletion is an anonymization, and join-shop stops
-- creating shops.
--
-- Account deletion (admin approves a request - see db/accountDeletion.js):
-- the users row stays so everyone else's history keeps pointing at
-- something (past event standings, order threads, review logs), but
-- every personal field is scrubbed and deleted_at marks it. Auth
-- (middleware/auth.js, the socket handshake) rejects a deleted user's
-- still-unexpired tokens by checking this column.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Who handled a request and when; decline_reason is shown to the user.
ALTER TABLE account_deletion_requests
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- join-shop now only enters shops that already exist (it used to insert
-- a row for any code typed in the lobby). The lobby's empty-code
-- fallback is "default", so make sure that one always exists.
INSERT INTO shops (code, name, scene_type, status)
VALUES ('default', 'default', 'default', 'published')
ON CONFLICT (code) DO NOTHING;
