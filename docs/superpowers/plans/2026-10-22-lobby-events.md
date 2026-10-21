# Lobby Events (Part 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Events get a start date/time that closes registration when it passes. Every match table becomes an online table. The lobby gets a searchable list of events from every published shop.

**Architecture:**
- Time rules live in a new pure module, `server/src/tournament/schedule.js`. It decides whether registration is open and computes the Bangkok today/week windows.
- `server/src/routes/tournaments.js` (mounted at `/events`) gains `startsAt` handling, a `check_in` edit branch and `GET /events/upcoming`, which is backed by one SQL query in `server/src/db/tournaments.js`.
- On the client, a self-contained `client/src/ui/lobbyEvents.js` renders into a container it is given. Its formatting helpers live in a pure `client/src/ui/events/listing.js`.

**Tech Stack:** Node 22, Express, Postgres (`pg`), vanilla JS + Vite, node:test.

**Spec:** `docs/superpowers/specs/2026-10-22-lobby-events-design.md` (Thai; binding)

## Global Constraints

- New migration `021_event_starts_at.sql`. Never edit 001–020.
- Server: every new behavior has a test. Run `cd server && npm run test:all` before calling a server task done.
- Client: `cd client && npm test` and `npm run build`, plus `node --check` on every touched JS file.
- UI copy is English. Never `window.confirm`/`prompt`.
- Don't assume Vanguard is the only game. Validate `game` against the server's `VALID_GAMES`, and build the client's dropdown from `GAME_LABELS`.
- Times are stored as UTC `TIMESTAMPTZ` and shown in the viewer's local time. "Today" and "this week" are computed in `Asia/Bangkok`, which is UTC+7 with no DST.
- Registration closes when `starts_at` passes. The event's `status` never changes because of time.
- Commit per task on `dev`. Never push.

## Review Focus

1. **Search text with `%`, `_` or `\`.** `q=100%` must match literally, not act as a wildcard. → Task 3 integration test "q is matched literally".
2. **A start time in the past on create, or garbage like `"tomorrow"`.** Expect 400 with a clear message, never a stored NULL or Invalid Date. → Task 1 integration test.
3. **Bangkok day boundaries.** An event at 23:30 Bangkok time on day D must count as "today" on day D, not D+1, even though it is 16:30 UTC. → Task 3 unit test for `upcomingWindow`.
4. **The organizer pushes the start time later after registration closed.** Registering works again. → Task 1 integration test.
5. **An event still running past its start time plus 24h.** It stays listed because it is live. A stale event that never started is hidden. → Task 3 integration test.

---

## File Map

Server
- Create `server/migrations/021_event_starts_at.sql`, `server/src/tournament/schedule.js`, `server/test/unit/schedule.test.js`, `server/test/integration/lobbyEvents.test.js`
- Modify `server/src/routes/tournaments.js`, `server/src/db/tournaments.js`, `server/src/tournament/tables.js`, `server/test/unit/tables.test.js`, `server/test/integration/helpers.js` and every integration file that does `api.post("/events", …)`: `judging`, `accountDeletion`, `events`, `tournament`, `eventTables`, `eventDay`

Client
- Create `client/src/ui/lobbyEvents.js`, `client/src/ui/events/listing.js`, `client/test/eventListing.test.js`
- Modify `client/src/ui/events/eventForm.js`, `client/src/ui/events/common.js`, `client/src/ui/events/state.js`, `client/src/ui/events/playerView.js`, `client/src/ui/eventsPanel.js`, `client/src/net/api.js`, `client/src/main.js`, `client/index.html`, `client/src/style.css`, `client/test/eventState.test.js`

Docs: `README.md` (Events section and the "Known limit" line), `CLAUDE.md` (open item: Neon must run 021)

---

### Task 1: Start time, closing registration, check-in edits (server)

**Files:**
- Create: `server/migrations/021_event_starts_at.sql`, `server/src/tournament/schedule.js`, `server/test/unit/schedule.test.js`
- Modify: `server/src/routes/tournaments.js` (`parseEventSettings`, `publicEvent`, `POST /`, `PATCH /:id`, `POST /:id/register`), `server/src/db/tournaments.js` (`createEvent`, `updateEventSettings`, new `updateEventCheckInBasics`), `server/test/integration/helpers.js`, the 6 integration files listed above, `server/test/integration/eventDay.test.js` (new tests)

**Interfaces:**
- Produces:
  - `parseStartsAt(raw) -> Date | null | undefined` in `schedule.js`. `null`/`""`/missing → `null`. A parseable ISO string → `Date`. Anything else → `undefined` (invalid).
  - `isPastStart(startsAt: Date|string|null, now: Date) -> boolean` in `schedule.js`. Returns false when `startsAt` is null.
  - `registrationOpen(event /* DB row */, now: Date) -> boolean`: true when `status ∈ {registration, check_in}` and `!isPastStart(event.starts_at, now)`.
  - `publicEvent` gains `startsAt` (ISO or null) and `registrationOpen` (computed with `new Date()`).
  - `FUTURE_START` exported from `test/integration/helpers.js`: an ISO string 7 days from now.

- [ ] **Step 1: Write the migration**
`ALTER TABLE tournament_events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;` plus `CREATE INDEX IF NOT EXISTS tournament_events_starts_at_idx ON tournament_events (starts_at) WHERE status IN ('registration','check_in','swiss','bracket');`. Run `cd server && npm run migrate` against the test DB (`TEST_DATABASE_URL`, never Neon). Expected: `021_event_starts_at.sql` applied.

- [ ] **Step 2: Write failing unit tests** in `server/test/unit/schedule.test.js`
  - `parseStartsAt("2026-11-01T06:00:00.000Z")` returns a Date equal to that instant. `parseStartsAt("")` → `null`. `parseStartsAt(undefined)` → `null`. `parseStartsAt("tomorrow")` → `undefined`. `parseStartsAt(12)` → `undefined` (only strings count).
  - `isPastStart(null, now)` → false. Exactly at start → true. 1 ms before → false.
  - `registrationOpen({ status: "check_in", starts_at: future }, now)` → true. With past `starts_at` → false. `{ status: "swiss", starts_at: null }` → false.

- [ ] **Step 3: Run** `cd server && npm test`. Expected: the new tests FAIL (module missing).

- [ ] **Step 4: Implement `schedule.js`** with the three functions above. Then run `npm test`. Expected: PASS.

> **Split (user-approved):** Task 1a = Steps 1–5 plus the "create needs a future start time" test, `startsAt` on create, and `startsAt`/`registrationOpen` in `publicEvent`. Commit as `feat(events): events have a start time`. Task 1b = the rest of Steps 6–10.

- [ ] **Step 5: Update the integration test fixtures first.** Add `FUTURE_START` to `helpers.js`, then add `startsAt: FUTURE_START` to every `api.post("/events", …)` body in the 6 files. `grep -rn 'post("/events"' server/test/integration` must show every one covered.

- [ ] **Step 6: Write failing integration tests** in `eventDay.test.js`
  - "create needs a future start time": no `startsAt` → 400 `"Choose the event's start date and time."`. `startsAt: "tomorrow"` → 400 with the same message. A past ISO → 400 `"The start time must be in the future."`. A valid one → 201 and `event.startsAt` equals it.
  - "registration closes at the start time; entrants can still check in": create with `FUTURE_START`, then register players 0–1. Set `starts_at` 1 minute into the past directly in SQL, using `withDb` from helpers, because the API refuses past times on create. The event then reports `registrationOpen === false`. Player 2 registering gets 409 `"Registration is closed for this event."`. Open check-in; player 0 `POST /check-in` → 200.
  - "pushing the start later reopens registration": in that past state, owner PATCH with `startsAt: FUTURE_START` → 200. Player 2 registering then gets 201.
  - "check-in edits: name, round time and start time only": in `check_in`, PATCH `{ name: "Renamed", roundTimeLimitMinutes: 30, startsAt: FUTURE_START }` → 200 with all three changed. `maxPlayers` in the same body is ignored (unchanged).

- [ ] **Step 7: Run** `npm run test:integration`. Expected: the new tests FAIL. The existing tests still pass apart from those.

- [ ] **Step 8: Implement**
  - `POST /`: `parseStartsAt(req.body.startsAt)`. `null` or `undefined` → 400 `"Choose the event's start date and time."`. `<= now` → 400 `"The start time must be in the future."`. Pass `startsAt` to `db.createEvent`.
  - `PATCH` `registration` branch: an invalid `startsAt` → 400 with the "Choose…" message. Missing or `null` keeps the current value, so editing an old NULL event doesn't force one. Past values are allowed on edit.
  - New `check_in` branch: name, round time and `startsAt` with the same validation, via `db.updateEventCheckInBasics(id, { name, roundTimeLimitMinutes, startsAt })` guarded by `WHERE status = 'check_in'` (null → 409 `"This event has just started - reload and try again."`). When `startsAt` is omitted the column stays as it is (`COALESCE`).
  - `POST /:id/register`: after the existing status check, `if (!registrationOpen(event, new Date()))` → 409 with the existing message `"Registration is closed for this event."`.

- [ ] **Step 9: Run** `npm run test:all`. Expected: all PASS.

- [ ] **Step 10: Commit** `feat(events): start time that closes registration, check-in edits`

### Task 2: Every match on an online table

**Files:**
- Modify: `server/src/tournament/tables.js`, `server/src/routes/tournaments.js` (`withTables`, the start route around line 668–692, remove the now-unused `resolveScene` import if nothing else uses it), `server/test/unit/tables.test.js`, `server/test/integration/eventDay.test.js:166-174`, `server/test/integration/eventTables.test.js`

**Interfaces:**
- Produces: `assignTables(pairings) -> pairings with { tableNumber, tableOnline }`. The second parameter is gone. Every non-bye gets `tableOnline: true`, numbered 1..n by `seedPoints` desc, with input order breaking ties.

- [ ] **Step 1: Rewrite the unit tests**
  - "every pair gets an online table, top points first": numbers `g=1, c=2, e=3, i=4, a=5` from the existing fixture, and every `tableOnline === true`.
  - The bye test and the tie-order test stay, without the second argument.

- [ ] **Step 2: Update the integration tests**
  - In `eventDay`, rename the round-1 test to "round 1 gets online table numbers 1..n" and assert `m.tableOnline === true`.
  - In `eventTables`, replace "a player goes to their in-shop table…" with "a match plays at an online table; the shop's own tables stay free". Table 1's player gets `go.online === true` and `go.tableId === \`event:${event.id}:t1\``, joins and gets role `"speaker"`.
  - In the same test, a bystander standing at the scene's first table (`table-1`: walk to its coordinates as the old test did with `go.x/go.y`, reading the position from the shop's scene) joins its call and gets `role !== "spectator"`, and `enable-video` is not refused with `reason: "spectator"`.
  - Keep the online-table spectator test. Its table number may change from 5 to any number, since all are online now.

- [ ] **Step 3: Run** `npm run test:all`. Expected: those tests FAIL.

- [ ] **Step 4: Implement**
  - Drop the parameter from `assignTables`, and replace the file's header comment to say every match table is online (spec §5).
  - `withTables` no longer loads the shop.
  - The start route stops computing `physicalTables`.
  - Leave `eventTables.js`'s `table_online ? null : scene.TABLES[...]` mapping alone, because old rows may still have `table_online = false`. Do update its header comment.

- [ ] **Step 5: Run** `npm run test:all`. Expected: PASS.

- [ ] **Step 6: Commit** `feat(events): play every match at an online table`

### Task 3: `GET /events/upcoming`

**Files:**
- Modify: `server/src/tournament/schedule.js`, `server/test/unit/schedule.test.js`, `server/src/db/tournaments.js` (new `listUpcomingEvents`), `server/src/routes/tournaments.js` (new route, registered **before** `GET /:id`)
- Create: `server/test/integration/lobbyEvents.test.js`

**Interfaces:**
- Consumes: `registrationOpen` and `publicEvent` from Task 1.
- Produces:
  - `upcomingWindow(when: "today"|"week"|"all", now: Date) -> { from: Date, to: Date } | null` (null for `all`). `from` = 00:00 Bangkok of `now`'s Bangkok day; `to` = `from` + 1 day (`today`) or + 7 days (`week`).
  - `db.listUpcomingEvents({ q, game, window, userId, now }) -> rows`. Each row = `tournament_events.*` plus `shop_name`, `shop_code`, `shop_logo_url`, `entered_count` (int), `my_entry_status`, `my_waitlist_position`, `my_dropped`.
  - Response `{ events: [ { ...publicEvent(row), shop: { name, code, logoUrl }, enteredCount, myEntry: null | { entryStatus, waitlistPosition } } ] }`. `myEntry` is null when the viewer has no row, dropped, or is a no-show.

- [ ] **Step 1: Write failing unit tests for `upcomingWindow`**
  - `now = 2026-10-22T16:30:00Z` (23:30 Bangkok on Oct 22): today = `2026-10-21T17:00:00Z` … `2026-10-22T17:00:00Z`.
  - `now = 2026-10-22T17:00:00Z` (00:00 Bangkok on Oct 23): today starts `2026-10-22T17:00:00Z`.
  - `week.to - week.from === 7 days`. `all` → null. An unknown value → null.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL. **Implement**, run again. Expected: PASS.

- [ ] **Step 3: Write failing integration tests** in `lobbyEvents.test.js`

  Setup:
  - Two published shops: "Dragon Den" with code `dragonden`, and "Cafe 100% Fun" with code `cafe100`.
  - One draft shop, created without admin approval.
  - Events created via the API with `FUTURE_START`. Where a test needs other times, adjust `starts_at` / `status` with `withDb`.

  Tests:
  - "lists open, check-in and live events from published shops only": a completed event, a cancelled event and the draft shop's event are absent.
  - "sorts live first, then soonest start, then undated": compare `events.map(e => e.name)` with the expected order. Undated means `starts_at = NULL`, set via SQL.
  - "hides events left unstarted for over 24h past their start, keeps live ones": a `registration` event with `starts_at = now() - 25h` is absent. One at `now() - 2h` is present with `registrationOpen === false`. A `swiss` event at `now() - 3 days` is present.
  - "q matches shop or event name, case-insensitive": `q=dragon` returns only Dragon Den's events. Matching on the event name works too.
  - "q is matched literally": `q=100%` matches Cafe 100% Fun only, and `q=_` matches nothing unless a name contains `_`.
  - "game filter": `game=vanguard` returns all. `game=pokemon` → 400 `"Choose a supported game."`.
  - "when=today and week": with times set via SQL to today+2h, now+3 days and now+10 days (all Bangkok-safe), `today` → first only, `week` → first two, and `all` → all three plus the undated one.
  - "carries my entry and the entered count": after the viewer registers, `myEntry.entryStatus === "entered"` and `enteredCount === 1`. A waitlisted viewer gets `waitlistPosition`. After dropping, `myEntry === null`.
  - "needs a login": no token → 401.
  - "at most 50": insert 55 events via SQL → length 50.

- [ ] **Step 4: Run** `npm run test:integration`. Expected: FAIL.

- [ ] **Step 5: Implement `listUpcomingEvents`** as one query: join `shops` (`status = 'published'`), a grouped subquery for `entered_count` (`entry_status = 'entered' AND NOT dropped`), and a `LEFT JOIN` to the viewer's `tournament_players` row.

  WHERE:
  - `e.status IN ('registration','check_in','swiss','bracket')`
  - `AND (e.status IN ('swiss','bracket') OR e.starts_at IS NULL OR e.starts_at > $now - interval '24 hours')`
  - an optional `ILIKE` on `s.name` or `e.name`, with `%`, `_` and `\` escaped and `ESCAPE '\'`
  - an optional `e.game = $game`
  - an optional window: `(live OR (e.starts_at >= $from AND e.starts_at < $to))`

  `ORDER BY (e.status IN ('swiss','bracket')) DESC, e.starts_at ASC NULLS LAST, e.created_at DESC LIMIT 50`.

  Route: trim `q` to 80 chars, treat an empty `q` as no filter, validate `game` against `VALID_GAMES`, and map rows to the response shape above.

- [ ] **Step 6: Run** `npm run test:all`. Expected: PASS.

- [ ] **Step 7: Commit** `feat(events): list upcoming events across published shops`

### Task 4: Client — start time in the form and event views

**Files:**
- Create: `client/src/ui/events/listing.js`, `client/test/eventListing.test.js`
- Modify: `client/src/ui/events/eventForm.js`, `client/src/ui/eventsPanel.js:160-225`, `client/src/ui/events/common.js` (`badgesHtml`), `client/src/ui/events/state.js` (`playerAction`), `client/src/ui/events/playerView.js`, `client/test/eventState.test.js`

**Interfaces:**
- Consumes: `startsAt` and `registrationOpen` on events (Task 1).
- Produces:
  - `formatStartsAt(iso: string|null, locale?: string, timeZone?: string) -> string` in `listing.js`: `"Date TBA"` for null, otherwise weekday + day + month + `·` + 24h time, e.g. `"Sat 25 Oct · 13:00"` for `"2026-10-25T06:00:00Z"` with `("en-GB", "Asia/Bangkok")`. Defaults to the viewer's locale/zone.
  - `toLocalInputValue(iso) -> "YYYY-MM-DDTHH:mm"` and `fromLocalInputValue(str) -> ISO string | null` (local time ↔ UTC for `<input type="datetime-local">`).
  - `eventFormHtml({ ..., mode })`: `mode` replaces `basicsOnly` and is one of `"full" | "checkin" | "basics"`. `checkin` shows name + start time + round time; `basics` shows name + round time. `bindEventForm` puts `startsAt` in `fields` whenever the start field is rendered.
  - `playerAction` returns `{ kind: "closed" }` for a non-entrant when `event.registrationOpen === false` during `registration`/`check_in`. `undefined` counts as open, so old fixtures keep passing.

- [ ] **Step 1: Write failing tests**
  - `eventListing.test.js`: the `formatStartsAt` example above, `formatStartsAt(null) === "Date TBA"`, and a round trip `fromLocalInputValue(toLocalInputValue(iso)) === iso` for a minute-aligned ISO.
  - `eventState.test.js`: "a non-entrant sees registration closed after the start time" → `playerAction(view({ registrationOpen: false }), "u9").kind === "closed"`. An entrant in `check_in` with `registrationOpen: false` still gets `"check_in"`.

- [ ] **Step 2: Run** `cd client && npm test`. Expected: FAIL.

- [ ] **Step 3: Implement**
  - `listing.js` uses `Intl.DateTimeFormat`.
  - The form gets a `Start date & time` `datetime-local` field, `required` in create (`full` mode with no `values.id`), with `min` = now.
  - `eventsPanel` chooses the mode by status: `registration` → `full`, `check_in` → `checkin`, `swiss`/`bracket` → `basics`. Update the hint text at line 218 to match each mode.
  - `badgesHtml` adds `formatStartsAt(event.startsAt)` as the first pill.
  - `playerView` renders `closed` as a card `"Registration closed"` with the hint `"The event's start time has passed."`.

- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS / build OK.

- [ ] **Step 5: Commit** `feat(client): event start time in the form and event views`

### Task 5: Client — the lobby Events card

**Files:**
- Create: `client/src/ui/lobbyEvents.js`
- Modify: `client/src/ui/events/listing.js` (+ `client/test/eventListing.test.js`), `client/src/net/api.js`, `client/index.html` (new card above Published shops, inside `#lobby`), `client/src/main.js` (init + call from `refreshLobbyExtras()`), `client/src/style.css`

**Interfaces:**
- Consumes:
  - `GET /events/upcoming` (Task 3)
  - `formatStartsAt` (Task 4)
  - `GAME_LABELS`, `REGION_LABELS` and `REGULATION_LABELS` from `events/common.js`
- Produces:
  - `upcomingEvents(token, { q, game, when }) -> Promise<{ events }>` in `api.js`. Omit empty params.
  - `entryBadge(myEntry) -> string|null` in `listing.js`: `"Registered"`, `"Entered draw"`, `"Waitlist #N"` or null.
  - `statusBadge(event) -> "Open" | "Check-in" | "Live" | "Closed"`. It is `Live` for swiss/bracket, `Closed` when `registrationOpen === false` and not live, and otherwise `Check-in` / `Open` by status.
  - `initLobbyEvents({ container, getToken, openEvent }) -> { refresh(): Promise<void> }`. It renders only inside `container` and keeps `{ q, game, when }` in module state, so a refresh keeps the filters.

- [ ] **Step 1: Write failing tests**
  - `entryBadge`: `{ entryStatus: "entered" }` → `"Registered"`, `pending_draw` → `"Entered draw"`, `{ entryStatus: "waitlisted", waitlistPosition: 2 }` → `"Waitlist #2"`, `null` → `null`.
  - `statusBadge`: one assertion per value.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL. **Implement** the helpers, run again. Expected: PASS.

- [ ] **Step 3: Build the card**

  Markup in `index.html`: a `<div class="lobby-card wide-card">` with an `h2.panel-subhead` reading "Events" (trophy icon, the same inline-Lucide markup as the shops heading) and the hint `"Upcoming events at every shop - open one to see details or register."`. It contains an empty `<div id="lobby-events"></div>`. `lobbyEvents.js` renders everything inside that div:
  - a search `<input type="search" placeholder="Search shop or event">`, debounced 300 ms
  - a game `<select>` with "All games" plus `GAME_LABELS`
  - three toggle buttons, `Today` / `This week` / `All`, each with `aria-pressed`
  - the list, using the `.row` markup of Published shops (logo or store-icon fallback, `row-title` = event name, `row-meta` = shop name · `formatStartsAt` · game/region/regulation · `"N / max players"`, then status and entry badges). Each row is a `<button>` or carries `role="link"` and `tabindex="0"`, and Enter or click calls `openEvent(id)`.

  States:
  - loading: `"Loading events…"`
  - empty: `"No events match - try another shop name or All dates."`
  - error: `"Couldn't load events right now."`

  A response that arrives after a newer request must not overwrite it, so ignore stale responses with a request counter.

- [ ] **Step 4: Wire it in `main.js`**
  - `const lobbyEvents = initLobbyEvents({ container: document.getElementById("lobby-events"), getToken, openEvent: (id) => navigate(`/events/${id}`) })`
  - Call `lobbyEvents.refresh()` inside `refreshLobbyExtras()`, without awaiting it before the shops load. Its own errors render inside the card.
  - CSS: the controls wrap with `flex-wrap`, nothing scrolls horizontally at 360px wide, and the pressed toggle is styled with the existing button tokens.

- [ ] **Step 5: Verify**
  - Run `npm test && npm run build`. Expected: PASS.
  - Run `npm run dev` from the root and click through as `shop1@test.local` and `user1@test.local`:
    1. create an event, find it in the lobby, search for it and filter it
    2. open it, register, press Back → back in the lobby with the filters kept and the "Registered" badge showing
    3. set `starts_at` into the past via SQL → the row shows "Closed" and registering is refused
    4. start the event → Go to table opens an online table, and the shop's own table still lets a bystander talk
  - Check phone landscape width in devtools.

- [ ] **Step 6: Update the docs**
  - README Events section: the start time, auto-close, all-online tables and the lobby Events card. Delete the "Known limit … share table numbers" sentence.
  - CLAUDE.md open item 1: Neon must also run 021. Part 2 is done; next is part 3.

- [ ] **Step 7: Commit** `feat(client): find events from the lobby`
