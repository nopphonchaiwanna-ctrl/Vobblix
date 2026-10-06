-- Optional registration cap for events: organizer picks a power-of-two
-- limit (1-64) at creation time. NULL means no cap - only possible for
-- events created before this migration, since the create-event form
-- always sends one going forward.
ALTER TABLE tournament_events
  ADD COLUMN IF NOT EXISTS max_players INTEGER
    CHECK (max_players IS NULL OR max_players IN (1, 2, 4, 8, 16, 32, 64));
