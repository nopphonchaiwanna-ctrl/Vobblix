-- Local card catalog: Phase 1 of "bring real card game data into the
-- system" (see the project doc's "Game selector on events" section for
-- the earlier, event-label-only step). This is what Phase 2
-- (marketplace: pick a card instead of typing a free-text listing
-- title) and Phase 3 (event decklists) will both reference.
--
-- Source of truth is the official Japanese card database
-- (cf-vanguard.com/cardlist), per explicit instruction - not the
-- English site. Images are NOT re-hosted (deliberately, unlike
-- avatars/shop logos): image_url points straight at cf-vanguard.com's
-- own image, since Vanguard alone has tens of thousands of printings
-- and re-hosting all of them as data URLs would bloat Postgres badly.
-- This does mean a card's image breaks if Bushiroad ever reorganizes
-- their image paths - acceptable tradeoff for this phase.
--
-- Scoped per-game from the start (see tournament_events.game, migration
-- 009) even though only Vanguard exists today, so a second game's
-- catalog doesn't collide with Vanguard's card numbers.
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL DEFAULT 'vanguard' CHECK (game IN ('vanguard')),
  card_number TEXT NOT NULL, -- e.g. 'DZ-BT17/001' (set code / number)
  set_code TEXT NOT NULL, -- card_number's prefix before the '/' (e.g. 'DZ-BT17')

  name TEXT NOT NULL, -- Japanese name (source of truth, per explicit instruction)
  name_reading TEXT, -- furigana reading shown alongside the name on the official site

  -- Raw Japanese values as the official site shows them (e.g.
  -- card_type = 'ノーマルユニット', nation = 'ドラゴンエンパイア') rather than
  -- translated/normalized enums - there's no official English mapping
  -- to key off yet, and translating loses information a JP-fluent
  -- admin/organizer would want to see verbatim anyway.
  card_type TEXT,
  nation TEXT,
  grade INTEGER,
  power INTEGER,
  shield INTEGER,
  skill_text TEXT,

  image_url TEXT, -- links straight to cf-vanguard.com, not re-hosted
  detail_url TEXT, -- the official site's own card detail page, for anything not captured above (clan/rarity/trigger - see "Known outstanding items")

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cards_game_cardnumber_idx ON cards (game, card_number);
CREATE INDEX IF NOT EXISTS cards_game_name_idx ON cards (game, name);
CREATE INDEX IF NOT EXISTS cards_game_setcode_idx ON cards (game, set_code);
