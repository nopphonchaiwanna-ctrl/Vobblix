-- Optional per-round time limit, organizer's choice at event creation.
-- Purely informational/display (the countdown shown in the events
-- panel) - nothing server-side auto-resolves a match when it expires;
-- the organizer still decides via the existing draw_rule + override
-- flow. NULL = no timer for this event. Capped at 2 days (2880
-- minutes) per the organizer's explicit max.
ALTER TABLE tournament_events
  ADD COLUMN IF NOT EXISTS round_time_limit_minutes INTEGER
    CHECK (round_time_limit_minutes IS NULL OR (round_time_limit_minutes BETWEEN 1 AND 2880));
