-- Two things the shop-review flow was missing (see README / project notes,
-- "Shop review history + persisted notifications"):
--
-- 1. shop_review_events - an append-only log of every review step a shop
--    went through. `shops` itself only keeps the *latest* review
--    (status/reviewed_by/reviewed_at/rejection_reason), and
--    updateOwnedShop() even wipes those when a rejected shop is
--    resubmitted - so there was no way to see "rejected twice, then
--    published" after the fact. Powers the admin panel's Review history tab.
--
-- 2. notifications - the topbar bell used to be an in-memory array in
--    the client, filled only by live socket pushes. An owner who wasn't
--    online at the moment their shop got rejected never heard about it.
--    Persisting them means the bell loads what you missed on login.

CREATE TABLE IF NOT EXISTS shop_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'resubmitted', 'published', 'rejected')),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_review_events_created_idx ON shop_review_events (created_at DESC);
CREATE INDEX IF NOT EXISTS shop_review_events_shop_idx ON shop_review_events (shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  target TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

-- Backfill history from what `shops` still remembers, so the tab isn't
-- empty for shops reviewed before this migration. Only owner-created
-- shops (central/admin shops never go through review).
INSERT INTO shop_review_events (shop_id, action, actor_user_id, created_at)
SELECT id, 'submitted', owner_user_id, created_at
FROM shops
WHERE owner_user_id IS NOT NULL AND NOT is_admin_shop;

INSERT INTO shop_review_events (shop_id, action, actor_user_id, reason, created_at)
SELECT id, status, reviewed_by,
       CASE WHEN status = 'rejected' THEN rejection_reason END,
       reviewed_at
FROM shops
WHERE owner_user_id IS NOT NULL AND NOT is_admin_shop
  AND reviewed_at IS NOT NULL AND status IN ('published', 'rejected');

-- Shops that are rejected right now: give the owner the notification
-- they may have missed, so it shows in their bell on next login.
INSERT INTO notifications (user_id, kind, message, target, created_at)
SELECT owner_user_id, 'shop_rejected',
       '"' || name || '" was rejected: ' || COALESCE(rejection_reason, ''),
       '/my-shop', COALESCE(reviewed_at, now())
FROM shops
WHERE owner_user_id IS NOT NULL AND NOT is_admin_shop AND status = 'rejected';
