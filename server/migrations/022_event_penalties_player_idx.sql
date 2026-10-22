-- Match history (docs/superpowers/specs/2026-10-22-match-history-design.md):
-- a player's history loads their penalties by player_id across every
-- event they played; only (event_id, created_at) was indexed.

CREATE INDEX IF NOT EXISTS event_penalties_player_idx
  ON event_penalties (player_id);
