-- Lets a user hide another user's chat messages (shop chat + table
-- chat) from themselves - see routes/account.js's block/unblock/list
-- endpoints and client/src/ui/chat.js's client-side filtering. This is
-- a one-way, per-user mute: it only affects what the blocker sees in
-- chat, not the blocked person's ability to use the app, and it's not
-- mutual (A blocking B doesn't block A from B's point of view).

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id <> blocked_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS blocked_users_pair_idx
  ON blocked_users (user_id, blocked_user_id);
