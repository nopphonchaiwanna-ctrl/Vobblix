-- Deck submission + G3 stats (docs/superpowers/specs/2026-10-23-deck-stats-design.md).
-- JP D-Standard events can ask players for a Decklog deck; each
-- submission is a snapshot of the deck at that time (editing or
-- deleting the My deck original never changes it). The G3 ride line is
-- worked out from the 'ride' zone when read, never stored.

ALTER TABLE tournament_events
  ADD COLUMN IF NOT EXISTS deck_submission TEXT NOT NULL DEFAULT 'off'
    CHECK (deck_submission IN ('off', 'optional', 'required'));

CREATE TABLE IF NOT EXISTS event_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL UNIQUE REFERENCES tournament_players(id) ON DELETE CASCADE,
  decklog_code TEXT NOT NULL,
  source_locale TEXT NOT NULL,
  title TEXT NOT NULL,
  nation TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_decks_event_idx ON event_decks (event_id);

CREATE TABLE IF NOT EXISTS event_deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_deck_id UUID NOT NULL REFERENCES event_decks(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  decklog_card_number TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('main', 'ride', 'g_deck')),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS event_deck_cards_deck_idx ON event_deck_cards (event_deck_id);
