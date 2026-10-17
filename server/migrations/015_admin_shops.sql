-- Lets an admin create and own more than one shop at once - a "central"/
-- official shop, as opposed to the one-shop-per-owner limit a regular
-- shop_owner has (shops_one_per_owner_idx, from migration 002). An admin
-- shop publishes immediately on creation instead of going through
-- pending_review - the creating admin already *is* the reviewer, so a
-- separate self-approval step would be pure busywork. See
-- db/shops.js's createAdminShop().
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS is_admin_shop BOOLEAN NOT NULL DEFAULT false;

-- Re-create the one-shop-per-owner index so it only applies to regular
-- owned shops - an admin's own personal shop (if they ever make one the
-- normal way) is still capped at one, but that's tracked separately from
-- however many admin/central shops the same admin account creates.
DROP INDEX IF EXISTS shops_one_per_owner_idx;
CREATE UNIQUE INDEX shops_one_per_owner_idx
  ON shops (owner_user_id) WHERE owner_user_id IS NOT NULL AND NOT is_admin_shop;

CREATE INDEX IF NOT EXISTS shops_admin_shop_idx ON shops (is_admin_shop) WHERE is_admin_shop;
