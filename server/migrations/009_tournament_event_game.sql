-- Which card game an event is for. Scoped to this platform's growing
-- game catalog - Vanguard is the only one supported right now; adding
-- another game later means appending it to this CHECK list (and to
-- the client's create-event dropdown), nothing structural. NOT NULL
-- (every event needs one) with a Vanguard default so this backfills
-- cleanly for any event created before this migration.
ALTER TABLE tournament_events
  ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'vanguard'
    CHECK (game IN ('vanguard'));
