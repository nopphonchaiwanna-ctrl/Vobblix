-- Lobby events (docs/superpowers/specs/2026-10-22-lobby-events-design.md):
-- an event's start date/time. Registration closes once it passes; NULL
-- (events created before this) never closes on its own.

ALTER TABLE tournament_events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

-- The lobby's upcoming-events list filters and sorts on it.
CREATE INDEX IF NOT EXISTS tournament_events_starts_at_idx
  ON tournament_events (starts_at)
  WHERE status IN ('registration', 'check_in', 'swiss', 'bracket');
