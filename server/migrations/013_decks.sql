-- Deck system, phase 1: import a deck from Bushiroad's official
-- Decklog site via its public deck code, rather than building a
-- from-scratch deck builder (that's postponed - see project doc,
-- marketplace card-linking was pulled behind this on request).
--
-- Decklog is actually THREE separate sites/deployments sharing the
-- "Decklog" name, each its own deck-code namespace - confirmed by
-- hand (separate JS bundles, separate /conf/const.js, separate API
-- hosts):
--   - decklog_en       -> decklog-en.bushiroad.com, "ENGLISH EDITION"
--                         section - cards are English-edition prints
--   - decklog_en_ja    -> decklog-en.bushiroad.com, "JAPANESE EDITION"
--                         section (same domain, /ja/ path, API base
--                         /system/app-ja/api/) - for players outside
--                         Japan who use Japanese-print cards
--   - decklog_jp       -> decklog.bushiroad.com (no "-en" - a
--                         genuinely separate deployment, own
--                         /conf/const.js, own API at
--                         /system/app/api/ on its own domain) - the
--                         actual Japan-domestic Decklog site
-- A deck code only resolves its card list on whichever of the three
-- it was actually created on - hit another one and you get back bare
-- metadata with no cards (or an empty array), no error. There's no
-- reliable way to tell which from the code alone, so the user tells
-- us which one (decks.source_locale) and services/decklogImport.js
-- calls the matching API directly instead of guessing.
--
-- IMPORTANT: only decklog_en's card_number values carry a literal
-- "EN" suffix Decklog appends to English-edition prints (e.g.
-- "DZ-BT15/001EN") - decklog_en_ja and decklog_jp both already use
-- the plain JP format our own cards table (migration 010, sourced
-- from the Japanese cf-vanguard.com site) uses ("DZ-BT15/001").
-- decklogImport.js strips the EN suffix only for decklog_en, so
-- deck_cards.card_number is always in the same JP format as
-- cards.card_number and a plain equality join works regardless of
-- which of the three sites a deck came from. decklog_card_number
-- keeps the raw, unconverted value Decklog actually returned (for
-- debugging/display - e.g. showing the user the original EN code
-- next to the JP one we matched it to).
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT NOT NULL DEFAULT 'vanguard' CHECK (game IN ('vanguard')),

  title TEXT NOT NULL,
  memo TEXT,

  source TEXT NOT NULL DEFAULT 'decklog' CHECK (source IN ('decklog')),
  source_locale TEXT NOT NULL CHECK (source_locale IN ('decklog_en', 'decklog_en_ja', 'decklog_jp')),
  decklog_code TEXT NOT NULL,
  nation TEXT, -- raw Japanese value from Decklog (e.g. 'ドラゴンエンパイア'), same convention as cards.nation

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decks_user_idx ON decks (user_id);

-- One row per (deck, zone, card). Not a plain card_id FK on purpose:
-- a deck can reference a card we haven't imported into our own
-- catalog yet (a brand new set, an EN-exclusive promo, etc.) and we
-- still want to store the full deck rather than silently dropping
-- cards we don't recognize - db/decks.js LEFT JOINs against cards
-- when reading a deck back, so an unmatched card just comes back with
-- no name/image/Thai translation instead of breaking the import.
CREATE TABLE IF NOT EXISTS deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,

  card_number TEXT NOT NULL, -- normalized (JP-format), matches cards.card_number
  decklog_card_number TEXT NOT NULL, -- raw value Decklog returned, pre-normalization

  zone TEXT NOT NULL CHECK (zone IN ('main', 'ride', 'g_deck')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deck_cards_deck_idx ON deck_cards (deck_id);
CREATE INDEX IF NOT EXISTS deck_cards_cardnumber_idx ON deck_cards (card_number);
