-- Tournament/event system: Swiss rounds with an optional top-cut
-- single-elimination bracket (or Swiss-only). Spec lived in the
-- project doc ("Planned: tournament/event system") before this -
-- see that doc for the *why* behind every rule encoded here.

CREATE TABLE IF NOT EXISTS tournament_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Swiss-only = no cut at all. swiss_cut = Swiss rounds followed by a
  -- top-cut bracket (if the player-count threshold below is met).
  format TEXT NOT NULL DEFAULT 'swiss_only' CHECK (format IN ('swiss_only', 'swiss_cut')),

  -- Cut size is locked to a power of 2 the organizer picks at setup -
  -- this is what the bracket was *configured* for. `effective_cut_size`
  -- is what actually got used once the event started (may differ if the
  -- overflow rule below expanded it, or may be NULL if the 1.5x
  -- threshold wasn't met and the event got auto-forced to Swiss-only).
  configured_cut_size INTEGER CHECK (configured_cut_size IS NULL OR configured_cut_size IN (4, 8, 16, 32, 64)),
  effective_cut_size INTEGER CHECK (effective_cut_size IS NULL OR effective_cut_size IN (4, 8, 16, 32, 64)),
  cut_enabled BOOLEAN, -- decided once at event start; NULL until then

  -- Per-event choice: does an unresolved/timed-out match count as a
  -- draw (both get 1 point) or a double loss (both get 0)?
  draw_rule TEXT NOT NULL DEFAULT 'double_loss' CHECK (draw_rule IN ('draw', 'double_loss')),

  status TEXT NOT NULL DEFAULT 'registration'
    CHECK (status IN ('registration', 'swiss', 'bracket', 'completed', 'cancelled')),
  current_phase TEXT NOT NULL DEFAULT 'swiss' CHECK (current_phase IN ('swiss', 'bracket')),
  round_count INTEGER, -- total Swiss rounds; computed once registration closes
  current_round INTEGER NOT NULL DEFAULT 0, -- within current_phase

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tournament_events_shop_idx ON tournament_events (shop_id, created_at);

CREATE TABLE IF NOT EXISTS tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  dropped BOOLEAN NOT NULL DEFAULT false,
  had_bye BOOLEAN NOT NULL DEFAULT false, -- so byes rotate to whoever hasn't had one yet
  match_points INTEGER NOT NULL DEFAULT 0,

  -- Set once the event completes. final_label is null for a Swiss-only
  -- event's players (their final_rank already says everything) and for
  -- anyone who didn't make the cut in a swiss_cut event.
  final_rank INTEGER,
  final_label TEXT CHECK (final_label IN ('champion', 'runner_up', 'top4', 'top8', 'top16', 'top32', 'top64')),

  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tournament_players_event_user_idx
  ON tournament_players (event_id, user_id);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('swiss', 'bracket')),
  round_number INTEGER NOT NULL, -- 1-based, scoped to its own phase

  player1_id UUID NOT NULL REFERENCES tournament_players(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES tournament_players(id) ON DELETE CASCADE, -- NULL = bye for player1

  -- Each player reports what they believe the result was; the match is
  -- only final (`result` set) once both claims agree, or an admin
  -- overrides directly. A bye match is created with result='bye'
  -- already set (nothing to report).
  player1_claim TEXT CHECK (player1_claim IN ('player1_win', 'player2_win', 'draw', 'double_loss')),
  player2_claim TEXT CHECK (player2_claim IN ('player1_win', 'player2_win', 'draw', 'double_loss')),
  result TEXT CHECK (result IN ('player1_win', 'player2_win', 'draw', 'double_loss', 'bye')),
  confirmed_at TIMESTAMPTZ,
  admin_override_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournament_matches_round_idx
  ON tournament_matches (event_id, phase, round_number);
CREATE INDEX IF NOT EXISTS tournament_matches_player1_idx ON tournament_matches (player1_id);
CREATE INDEX IF NOT EXISTS tournament_matches_player2_idx ON tournament_matches (player2_id);
