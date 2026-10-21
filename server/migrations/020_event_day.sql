-- Event day (docs/superpowers/specs/2026-10-21-event-day-design.md):
-- registration modes + waitlist, Vanguard region/regulation, a check-in
-- phase with organizer approval, table numbers, judges, judge calls,
-- penalties and per-event push consent.

ALTER TABLE tournament_events
  ADD COLUMN IF NOT EXISTS registration_mode TEXT NOT NULL DEFAULT 'first_come'
    CHECK (registration_mode IN ('first_come', 'lottery')),
  ADD COLUMN IF NOT EXISTS vanguard_region TEXT CHECK (vanguard_region IN ('th', 'jp')),
  ADD COLUMN IF NOT EXISTS vanguard_regulation TEXT CHECK (vanguard_regulation IN ('premium', 'd_standard')),
  ADD COLUMN IF NOT EXISTS lottery_drawn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_opened_at TIMESTAMPTZ;

-- New status between registration and the first round.
ALTER TABLE tournament_events DROP CONSTRAINT IF EXISTS tournament_events_status_check;
ALTER TABLE tournament_events ADD CONSTRAINT tournament_events_status_check
  CHECK (status IN ('registration', 'check_in', 'swiss', 'bracket', 'completed', 'cancelled'));

ALTER TABLE tournament_players
  -- entered = holds a spot; pending_draw = lottery not run yet;
  -- waitlisted = in the queue (waitlist_position, 1 = next up)
  ADD COLUMN IF NOT EXISTS entry_status TEXT NOT NULL DEFAULT 'entered'
    CHECK (entry_status IN ('entered', 'pending_draw', 'waitlisted')),
  ADD COLUMN IF NOT EXISTS waitlist_position INTEGER,
  ADD COLUMN IF NOT EXISTS check_in_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS no_show BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS table_number INTEGER,
  ADD COLUMN IF NOT EXISTS table_online BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS event_judges (
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS judge_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  called_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved')),
  claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS judge_calls_event_idx ON judge_calls (event_id, status);

CREATE TABLE IF NOT EXISTS event_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES tournament_players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('warning', 'match_loss', 'disqualification')),
  reason TEXT NOT NULL,
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('recorded', 'pending', 'confirmed', 'rejected')),
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS event_penalties_event_idx ON event_penalties (event_id, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS event_push_consent (
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
