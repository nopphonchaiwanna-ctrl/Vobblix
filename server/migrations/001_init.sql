-- VobbLiX - initial schema: accounts, shops, and persisted chat log.
-- Run via `npm run migrate` (server/scripts/migrate.js).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per card shop (identified by the join code players type in the
-- lobby). A shop's scene_type is set the first time it's created and
-- drives which server/src/scenes/*.js layout the room uses - see
-- getScene()/getShopSceneType() in server/src/index.js and rooms.js.
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scene_type TEXT NOT NULL DEFAULT 'default',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Persisted chat log. table_id NULL = shop-wide message; otherwise scoped
-- to one table (e.g. "table-1"), matching the ids in a scene's TABLES.
-- author_name is denormalized (captured at send time) so history still
-- reads correctly even if the account is later renamed or removed.
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  table_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_shop_table_created_idx
  ON chat_messages (shop_id, table_id, created_at);
