# Match History (Part 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A logged-in player opens "Match history" and sees every finished event they played: its rank, W-L-D record, and every round's opponent and result.

**Architecture:**
- The rules live in a new pure module, `server/src/tournament/history.js`. It turns raw rows into history entries: result from my side, record, drop round, disqualified flag, round labels and penalty placement.
- One new db function, `listMatchHistoryRows(userId)`, runs a fixed number of queries. The new route `GET /events/history` uses only `req.auth.userId`.
- On the client, pure label helpers go in `client/src/ui/events/history.js`. A new `client/src/ui/matchHistory.js` panel (`.dashboard-shell`) is reached at `/history` from the topbar menu and the in-shop HUD menu.

**Tech Stack:** Node 22, Express, Postgres (`pg`), vanilla JS + Vite, node:test.

**Spec:** `docs/superpowers/specs/2026-10-22-match-history-design.md` (Thai; binding)

## Global Constraints

- No new migration.
- Only the caller's own history: the route takes no user id, query string or param. Not logged in → 401 (existing `requireAuth`).
- History = player row with `entry_status = 'entered'`, `no_show = false`, at least one match in that event, and the event `status = 'completed'`. Newest `completed_at` first, at most 200.
- Never send opponents' user ids, emails or player ids. Send only their display name. A deleted account shows as `Deleted player`.
- Penalties: only status `recorded` or `confirmed`.
- `opponentDeck: null` on every match. Part 4 fills it, and the UI shows the column only when it has a value.
- UI copy is English. Use the `.dashboard-shell` layout. Add the new screen id to **every** hide-list. Respect `prefers-reduced-motion`.
- Server: `cd server && npm run test:all`. Client: `cd client && npm test && npm run build`. Run `node --check` on every touched JS file.
- Commit per task on `dev`. Never push.

## Review Focus

1. **A player who withdrew before the start** (row `entered`, `dropped = true`, no matches) must not show up. → Task 2 integration test "pre-start withdrawal is not listed".
2. **A player disqualified in top cut** keeps their `final_rank`/`final_label` *and* gets `disqualified: true`. → Task 1 unit test and Task 2 integration test.
3. **Player 2's view of a match.** `player1_win` means a loss for player 2. If this is flipped anywhere, every second row is wrong. → Task 1 unit test.
4. **Deleted opponent or bye.** The name is `Deleted player` / `Bye`, never null or a crash. → Task 2 integration test.
5. **A second user calling the endpoint** sees only their own events. → Task 2 integration test.

---

## File Map

Server
- Create `server/src/tournament/history.js`, `server/test/unit/history.test.js`, `server/test/integration/matchHistory.test.js`
- Modify `server/src/db/tournaments.js` (add `listMatchHistoryRows`), `server/src/routes/tournaments.js` (add `GET /history` before `GET /:id`)

Client
- Create `client/src/ui/events/history.js`, `client/test/eventHistory.test.js`, `client/src/ui/matchHistory.js`
- Modify `client/src/net/api.js`, `client/index.html` (menu button + `#history-panel` markup), `client/src/main.js` (menu handler, HUD item, route, hide-lists), `client/src/ui/ownerDashboard.js` and `client/src/ui/adminPanel.js` (hide-lists), `client/src/style.css`, `client/src/ui/icons.js` (if `history` icon missing)

---

### Task 1: Pure history rules

**Files:**
- Create: `server/src/tournament/history.js`
- Test: `server/test/unit/history.test.js`

**Interfaces:**
- Produces:
  - `resultForPlayer(match: {player1Id, player2Id, result}, myPlayerId: string) -> "win"|"loss"|"draw"|"double_loss"|"bye"|null`
  - `bracketRoundLabel(cutSize: number, round: number) -> string`. Players in the round = `cutSize / 2^(round-1)`. 2 → `"Final"`, 4 → `"Semifinal"`, otherwise `` `Top ${n}` ``.
  - `buildHistoryEntry({ event, me, matches, penalties, playedCount }) -> HistoryEntry`, where
    - `event`: `{ id, name, game, vanguard_region, vanguard_regulation, starts_at, started_at, effective_cut_size, shop_name, shop_code }`
    - `me`: `{ id, final_rank, final_label, dropped }`
    - `matches`: `[{ id, phase, round_number, player1_id, player2_id, result, opponent_name }]` (any order; `opponent_name` null for a bye)
    - `penalties`: `[{ match_id, level, reason, status }]` (mine only)
    - `HistoryEntry` = the JSON object in spec §8.1: `eventId, name, game, vanguardRegion, vanguardRegulation, shopName, shopCode, date, players, finalRank, finalLabel, dropped, dropRound, disqualified, record:{wins,losses,draws}, matches:[{phase, round, roundLabel, opponentName, result, opponentDeck:null, penalties:[{level,reason}]}], otherPenalties:[{level,reason}]`

- [ ] **Step 1: Write the failing tests** in `server/test/unit/history.test.js` (node:test, `assert/strict`):
  - `resultForPlayer`: for `player1_win`, player1 gets `"win"` and player2 gets `"loss"`. For `player2_win` it is the reverse. `draw` → `"draw"` and `double_loss` → `"double_loss"` for both. A bye (`player2Id: null, result: "bye"`) → `"bye"`. `result: null` → `null`.
  - `bracketRoundLabel(8,1) === "Top 8"`, `(8,2) === "Semifinal"`, `(8,3) === "Final"`, `(4,1) === "Semifinal"`, `(16,1) === "Top 16"`.
  - `buildHistoryEntry`:
    - Matches come out Swiss rounds ascending, then bracket rounds ascending, whatever the input order. Swiss `roundLabel` is `"Round N"`. Bracket uses `bracketRoundLabel(event.effective_cut_size, n)`.
    - `record`: bye and win count as wins, loss and double_loss as losses, draw as a draw, and `null` is not counted. Example: win, bye, loss, double_loss, draw → `{wins:2, losses:2, draws:1}`.
    - `opponentName` is `"Bye"` for a bye, otherwise `opponent_name`.
    - `dropRound`: if `me.final_rank` is null and `me.dropped`, it is the highest Swiss `round_number` among my matches (example: rounds 1, 2 → `2`). Otherwise it is `null`.
    - `disqualified` is true only with a `disqualification` penalty whose status is `confirmed`. A `pending` one → false. With `final_rank: 3, final_label: "top4"` plus a confirmed DQ → `finalRank` 3, `finalLabel` `"top4"` and `disqualified` true.
    - Penalties: statuses `pending`/`rejected` are dropped. A penalty with `match_id` sits under that match. One with `match_id: null` goes in `otherPenalties`. Output has only `{level, reason}`.
    - `date` is `starts_at ?? started_at`, `players` is `playedCount`, and `opponentDeck` is `null` on every match.
    - The output has no `player1Id`/`player2Id`/user ids anywhere (`JSON.stringify` must not contain `me.id` or the opponent ids).

- [ ] **Step 2: Run to see it fail**
  Run: `cd server && node --test test/unit/history.test.js`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement the three exports** in `server/src/tournament/history.js`. These are pure functions with no db access. Add a header comment pointing to spec §5–§7.

- [ ] **Step 4: Run to see it pass**
  Run: `cd server && node --test test/unit/history.test.js && npm test`. Expected: all PASS.

- [ ] **Step 5: Commit**
  `git add server/src/tournament/history.js server/test/unit/history.test.js && git commit -m "feat(events): pure match-history rules"`

---

### Task 2: `GET /events/history`

**Files:**
- Modify: `server/src/db/tournaments.js`, `server/src/routes/tournaments.js` (register next to `GET /upcoming`, before `GET /:id`)
- Test: `server/test/integration/matchHistory.test.js`

**Interfaces:**
- Consumes: `buildHistoryEntry` from Task 1.
- Produces:
  - `listMatchHistoryRows(userId) -> { events: Array<event & { me, playedCount }>, matches: Array<match row + my_player_id>, penalties: Array<penalty row> }`. It uses three queries, not one per event.
    1. My qualifying player rows joined to `tournament_events` and `shops`. Apply the Global Constraints filter, `ORDER BY e.completed_at DESC LIMIT 200`. `playedCount` comes from a subquery counting that event's players who are `entered`, not `no_show`, and have at least one match.
    2. Every match where `player1_id` or `player2_id` is in those player ids. `opponent_name` = `CASE WHEN ou.deleted_at IS NOT NULL THEN 'Deleted player' ELSE ou.display_name END`, joining the *other* side's `tournament_players` → `users`.
    3. `event_penalties` where `player_id` is in those ids.
  - Route response: `{ events: HistoryEntry[] }`

- [ ] **Step 1: Write the failing integration tests** (`describe("match history", { skip: SKIP_REASON })`, same setup style as `lobbyEvents.test.js`). Seed rows directly with `withDb`: create the event through `POST /events`, then set `status = 'completed', completed_at = …, started_at = …` and `INSERT` the `tournament_players` / `tournament_matches` / `event_penalties` rows. That keeps results deterministic. Tests:
  - "a finished Swiss event lists every match in order with rank and record". A 4-player Swiss-only event, 2 rounds. Me: R1 win as player1, R2 loss as **player2**, `final_rank 2`. Expect `finalRank 2`, `players 4`, `record {1,1,0}`, results `["win","loss"]`, labels `["Round 1","Round 2"]`, opponent names correct.
  - "top cut follows Swiss, labelled by round". `effective_cut_size 4`, 1 Swiss round + bracket R1 win + R2 loss, `final_label 'runner_up'`. Expect labels `["Round 1","Semifinal","Final"]` and `finalLabel "runner_up"`.
  - "a Swiss drop shows the round they left". `dropped true`, `final_rank null`, matches in rounds 1–2 → `dropRound 2`, `finalRank null`.
  - "disqualified in top cut keeps the rank and is flagged". A confirmed `disqualification` penalty plus `final_label 'top4'` → `finalLabel "top4"`, `disqualified true`.
  - "not listed: cancelled, still running, waitlisted, no-show, pre-start withdrawal". Five events, each with my row in that state. The withdrawal is `entered`, `dropped true`, no matches, in a completed event. None appear.
  - "bye and deleted opponent". The bye match → `opponentName "Bye"`, `result "bye"`. Set the opponent's `users.deleted_at = now()` → `"Deleted player"`.
  - "penalties: confirmed/recorded shown, pending/rejected hidden; unlinked go to otherPenalties".
  - "only the caller's own history; 401 without login". User B, who has no events, gets `[]`. The response body for A doesn't contain B's or opponents' user ids. Calling with no token → 401.
  - "newest completed first". Two events with different `completed_at`.

- [ ] **Step 2: Run to see it fail**
  Run: `cd server && node --test --test-concurrency=1 test/integration/matchHistory.test.js`. Expected: FAIL. Before the route exists, `/events/history` hits `GET /:id`, which returns 404 or 500.

- [ ] **Step 3: Implement `listMatchHistoryRows(userId)`** in `server/src/db/tournaments.js`, using the three queries described above with `ANY($1::uuid[])` for the id lists.

- [ ] **Step 4: Add `tournamentsRouter.get("/history", …)`** right after `/upcoming`. Group the rows per event and map each through `buildHistoryEntry`. Respond `{ events }`.

- [ ] **Step 5: Run to see it pass**
  Run: `cd server && node --check src/db/tournaments.js src/routes/tournaments.js && npm run test:all`. Expected: all PASS.

- [ ] **Step 6: Commit**
  `git commit -m "feat(events): players see their own match history"` (stage the 3 files).

---

### Task 3: Client — Match history screen

**Files:**
- Create: `client/src/ui/events/history.js`, `client/test/eventHistory.test.js`, `client/src/ui/matchHistory.js`
- Modify: `client/src/net/api.js`, `client/index.html`, `client/src/main.js`, `client/src/ui/ownerDashboard.js`, `client/src/ui/adminPanel.js`, `client/src/style.css`, `client/src/ui/icons.js` (only if `history` isn't registered)

**Interfaces:**
- Consumes: `GET /events/history` → `{ events: HistoryEntry[] }` (Task 2).
- Produces:
  - `api.js`: `getMatchHistory(token) -> Promise<{ events }>` (same `request()` style as the upcoming-events call).
  - `ui/events/history.js` (pure):
    - `placementText(entry) -> string`: `PLACEMENT_LABELS[finalLabel]` if set; else `` `#${finalRank} of ${players}` ``; else `` `Dropped after round ${dropRound}` ``, or `"Disqualified"` instead when `disqualified`. With a rank *and* `disqualified`, append `" · Disqualified"`. With nothing at all, return `"Unranked"`.
    - `recordText(record) -> "W-L-D"` e.g. `"3-1-0"`.
    - `RESULT_LABELS = { win: "Win", loss: "Loss", draw: "Draw", double_loss: "Double loss", bye: "Bye" }`, and `resultText(r)` returns `"No result"` for null.
  - `initMatchHistory({ getToken, onBack, openEvent }) -> { open() }`.

- [ ] **Step 1: Write the failing tests** in `client/test/eventHistory.test.js`. Cover every `placementText` branch above, including `{finalLabel:"top4", disqualified:true}` → `"Top 4 · Disqualified"` (whatever `PLACEMENT_LABELS.top4` is). Also cover `recordText({wins:3,losses:1,draws:0}) === "3-1-0"`, `resultText(null) === "No result"` and `resultText("double_loss") === "Double loss"`.

- [ ] **Step 2: Run to see it fail.** Run: `cd client && node --test test/eventHistory.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement `ui/events/history.js`.** Import `PLACEMENT_LABELS` from `./common.js`. Then run `cd client && npm test`. Expected: PASS.

- [ ] **Step 4: Build the screen.**
  - `index.html`: add `#topbar-menu-history` after `#topbar-menu-mydeck`, using the same markup and Lucide `history` icon with the label "Match history". Add a `<div id="history-panel" hidden>` that copies the `#decks-panel` shell: sidebar title "Match history", a back button `#history-panel-back`, and one `data-dashboard-panel="history"` holding `#history-panel-error` and `#history-panel-body`.
  - `ui/matchHistory.js`: `open()` hides the other screens the way `decksPanel` does and shows `#history-panel`. It shows `Loading…`, then the list. On failure it shows the error in `#history-panel-error` and keeps a retry button. When empty it shows `"No finished events yet."` and a button that goes back to the lobby (`onBack`). Each event is a `<details class="history-event">`. The `<summary>` holds name, `shopName · date` (`formatStartsAt` from `listing.js`), the game (`GAME_LABELS` + region/regulation as in `lobbyEvents.js`) and pills for `placementText` and `recordText`. The body lists matches as `roundLabel · opponentName · resultText`, with a result pill class per result. The `opponentDeck` column renders only if any match in that event has a non-null value. Each match's penalties sit under it, and `otherPenalties` come after the list (`PENALTY_LABELS`). The body ends with a "View event" button → `openEvent(eventId)`. Escape every string with the existing `escapeHtml`.
  - `main.js`: make `initMatchHistory({ getToken, onBack: returnToMainScreen, openEvent: (id) => navigate(`/events/${id}`) })`. Wire the menu click → `navigate("/history")`. Add `{ id: "history", label: "History", icon: "history", onSelect: () => navigate("/history") }` after the HUD `decks` item. Add `route("/history", …)`, guarded by login like `/mydeck`.
  - Add `#history-panel` to **every** `querySelectorAll("#auth, #lobby, …")` hide-list. Check with `grep -n '#decks-panel' client/src/*.js client/src/ui/*.js`: every line printed must also contain `#history-panel`.
  - `style.css`: minimal styles for `.history-event` and the result pills, reusing the existing `.row`/`.status-pill` tokens. The `<details>` open animation (if any) goes under `@media (prefers-reduced-motion: no-preference)`. It must work at phone width.

- [ ] **Step 5: Verify**
  Run: `cd client && node --check src/ui/matchHistory.js src/ui/events/history.js src/main.js && npm test && npm run build`. Expected: PASS, build OK.
  Then run `grep -n '#decks-panel' client/src/*.js client/src/ui/*.js | grep -v '#history-panel'`. Expected: no output.

- [ ] **Step 6: Click-test.** Run `npm run dev` and log in as `user1@test.local`. Complete a small event as `shop1@test.local`, or seed one. Check that the menu reaches Match history, the list and expansion are right, "View event" works, and the empty state shows for a user with no events. Check phone width.

- [ ] **Step 7: Commit**
  `git commit -m "feat(client): match history screen"` (stage the client files).
