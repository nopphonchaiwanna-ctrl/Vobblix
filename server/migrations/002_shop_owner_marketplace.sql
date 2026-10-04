-- Shop-owner accounts (admin-approved), owner-created/reviewed shops,
-- and a lightweight buy/sell marketplace with a persisted order chat.
-- See README's "Becoming a shop owner" / "Marketplace" sections.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'shop_owner', 'admin'));

-- A user applies once; an admin approves/rejects. Kept as its own table
-- (rather than a status column on users) so the application history and
-- rejection reasons survive even if the user re-applies later.
CREATE TABLE IF NOT EXISTS shop_owner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one pending application per user at a time - re-applying after a
-- rejection is fine, stacking up duplicates while pending isn't.
CREATE UNIQUE INDEX IF NOT EXISTS shop_owner_applications_one_pending_idx
  ON shop_owner_applications (user_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS shop_owner_applications_status_idx
  ON shop_owner_applications (status, created_at);

-- Pre-marketplace rows only ever had owner_user_id set as a side effect
-- of findOrCreateShop() (whoever happened to join a brand-new code first)
-- - not real ownership. Clear it before the column takes on real meaning
-- below, so the new "one shop per owner" constraint isn't tripped by
-- that old accidental data.
UPDATE shops SET owner_user_id = NULL;

-- Deliberately-created owner shops vs. the original "type any code to
-- get a room" ad-hoc shops (owner_user_id stays NULL for those from now
-- on too - see db/shops.js's findOrCreateShop). Ownership/review only
-- apply to the deliberate path.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'suspended')),
  ADD COLUMN IF NOT EXISTS layout_template_id TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS assets JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- One shop per owner for now (see README's "Becoming a shop owner") -
-- lift by dropping this index if/when multi-shop owners are supported.
CREATE UNIQUE INDEX IF NOT EXISTS shops_one_per_owner_idx
  ON shops (owner_user_id) WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS shops_status_idx ON shops (status);

-- ---------- Marketplace: listings + buy/sell order threads ----------
-- v1 has no real payment processing - a buyer opens an order (a
-- persisted chat thread) to arrange the sale with the owner, who marks
-- it fulfilled by hand. payment_provider/payment_reference are unused
-- for now but reserved so a future gateway integration (see README
-- roadmap) only needs to start writing to them, not add a migration.

CREATE TABLE IF NOT EXISTS shop_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'THB',
  photo_url TEXT,
  stock_qty INTEGER CHECK (stock_qty IS NULL OR stock_qty >= 0), -- NULL = not tracked
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_listings_shop_status_idx ON shop_listings (shop_id, status);

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES shop_listings(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_cents_snapshot INTEGER NOT NULL, -- listing price at the time of inquiry
  status TEXT NOT NULL DEFAULT 'inquiry'
    CHECK (status IN ('inquiry', 'confirmed', 'completed', 'cancelled')),
  payment_provider TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_orders_buyer_idx ON shop_orders (buyer_id, created_at);
CREATE INDEX IF NOT EXISTS shop_orders_seller_idx ON shop_orders (seller_id, created_at);

CREATE TABLE IF NOT EXISTS shop_order_messages (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_order_messages_order_idx ON shop_order_messages (order_id, created_at);
