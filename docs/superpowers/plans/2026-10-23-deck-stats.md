# Deck Submission + G3 Stats (Part 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players in JP D-Standard Vanguard events submit a Decklog deck. Organizers can make it optional or required. The system reads each deck's grade-3 ride line from the Ride Deck and turns it into stats: per event for the shop owner, across events with a date range for admin, and the opponent's G3 in match history.

**Architecture:**
- Pure rules live in `server/src/tournament/deckStats.js`: which events take decks, the G3 group of a ride deck, the stats table and the Bangkok date range.
- Migration 023 adds `tournament_events.deck_submission` and the snapshot tables `event_decks` / `event_deck_cards`.
- Server work spans three files:
  - `server/src/db/eventDecks.js` holds the db functions.
  - `server/src/routes/tournaments.js` gets the deck, event-stats and approve rules.
  - `server/src/routes/admin.js` gets the all-events stats.
- Client work:
  - The deck box and dialog go in the event views.
  - A shared stats table serves the organizer and admin.
  - Match history renders `opponentDeck`.

**Tech Stack:** Node 22, Express, Postgres (`pg`), vanilla JS + Vite, node:test.

**Spec:** `docs/superpowers/specs/2026-10-23-deck-stats-design.md` (Thai; binding)

## Global Constraints

- Decks only exist for `game = 'vanguard' AND vanguard_region = 'jp' AND vanguard_regulation = 'd_standard'`. Every other event is forced to `deck_submission = 'off'`.
- `deck_submission ∈ {'off','optional','required'}`, default `'off'`. It is editable only while `status = 'registration'`. A PATCH without `deckSubmission` keeps the current value.
- Submit, replace or withdraw is allowed only in `registration` / `check_in`. Withdraw is allowed only when the event is `optional`.
- A deck is rejected only when its Ride Deck is empty: 400 `"This deck has no ride deck - submit a D Standard deck."`.
- A G3 group is the distinct names of grade-3 ride cards found in `cards`, sorted and joined with `" / "`. If none are found, the group is `"Unknown"`. Groups are computed at read time and never stored.
- Players never see another player's deck or G3 through any API, except `opponentDeck` in their own `/events/history` after the event completed.
- Event stats: shop owner or admin only (judges get 403), completed events only. All-events stats: admin only.
- Integration tests never call the real Decklog. They submit with `{ deckId }` from decks seeded by SQL.
- New migration `023_event_decks.sql`. Never edit 001–022.
- Server: `cd server && npm run test:all`. Client: `cd client && npm test && npm run build`. Run `node --check` on touched JS. UI copy is English. Use `<dialog>`, never `window.confirm`/`prompt`.
- Commit per task on `dev`. Never push.

## Review Focus

1. **A player probing other decks.** `GET /events/:id` must carry no `deckG3`/`deckSubmitted` for non-staff, and `GET /events/:id/decks/:playerId` must return 403 for a player. → Task 3 integration test "players never see other decks".
2. **Editing or deleting My deck after submitting** must not change the event's copy. → Task 3 integration test.
3. **Required deck + auto check-in.** A player in the shop without a deck is skipped and named, and players with decks are approved. → Task 3 integration test.
4. **Mirror and Unknown matches.** A same-group mirror is excluded from Win %. Unknown vs Unknown is counted. Byes are never counted. → Task 2 unit tests.
5. **Bangkok day boundary on the admin range.** An event completed at `2026-10-31T17:30:00Z` (01 Nov 00:30 Bangkok) is excluded from `to=2026-10-31` and included in `from=2026-11-01`. → Task 2 unit test + Task 4 integration test.

---

## File Map

Server
- Create `server/migrations/023_event_decks.sql`, `server/src/tournament/deckStats.js`, `server/src/db/eventDecks.js`, `server/src/services/deckImport.js`, `server/test/unit/deckStats.test.js`, `server/test/integration/eventDecks.test.js`, `server/test/integration/deckStats.test.js`
- Modify `server/src/routes/tournaments.js`, `server/src/db/tournaments.js`, `server/src/routes/decks.js`, `server/src/routes/admin.js`, `server/src/tournament/history.js`, `server/test/unit/history.test.js`, `server/test/integration/matchHistory.test.js`

Client
- Create `client/src/ui/decklogInput.js`, `client/src/ui/events/deckStats.js`, `client/src/ui/deckStatsTable.js`, `client/src/ui/events/deckDialog.js`, `client/test/decklogInput.test.js`, `client/test/deckStats.test.js`
- Modify `client/src/ui/decksPanel.js`, `client/src/ui/events/eventForm.js`, `client/src/ui/events/playerView.js`, `client/src/ui/events/organizerView.js`, `client/src/ui/eventsPanel.js`, `client/src/ui/adminPanel.js`, `client/index.html`, `client/src/ui/matchHistory.js`, `client/src/net/api.js`, `client/src/style.css`

---

### Task 1: Event setting `deck_submission`

**Files:**
- Create: `server/migrations/023_event_decks.sql`, `server/src/tournament/deckStats.js` (only `takesDecks` / `normalizeDeckSubmission` in this task)
- Modify: `server/src/routes/tournaments.js` (`parseEventSettings`, create, PATCH registration branch, `publicEvent`), `server/src/db/tournaments.js` (`createEvent`, `updateEventSettings`), `client/src/ui/events/eventForm.js`
- Test: `server/test/unit/deckStats.test.js`, `server/test/integration/eventDecks.test.js`

**Interfaces:**
- Produces:
  - Migration 023:
    - `tournament_events.deck_submission TEXT NOT NULL DEFAULT 'off' CHECK (IN ('off','optional','required'))`
    - `event_decks(id uuid pk, event_id fk cascade, player_id fk tournament_players cascade UNIQUE, decklog_code, source_locale, title, nation, submitted_at, updated_at)`
    - `event_deck_cards(id, event_deck_id fk cascade, card_number, decklog_card_number, zone CHECK ('main','ride','g_deck'), quantity > 0)` with an index on `event_deck_id`
  - `takesDecks(event: {game, vanguard_region, vanguard_regulation}) -> boolean` (accepts snake_case rows).
  - `normalizeDeckSubmission(fields: {game, vanguardRegion, vanguardRegulation}, raw: any, current = "off") -> "off"|"optional"|"required"`. Returns `"off"` when the event can't take decks. `raw === undefined` → `current`. Any other value outside the set → `"off"`.
  - `publicEvent(...).deckSubmission`
  - eventForm: `#events-form-deck-submission` select (Off / Optional / Required), shown only when game = vanguard, region = jp, regulation = d_standard. It is sent as `deckSubmission`.

- [ ] **Step 1: Write failing tests.**
  - Unit: `takesDecks` is true only for vanguard/jp/d_standard. `normalizeDeckSubmission`: a TH event with `"required"` → `"off"`. JP D-Standard with `undefined` and current `"optional"` → `"optional"`. `"bogus"` → `"off"`.
  - Integration `eventDecks.test.js`. Set it up like `lobbyEvents.test.js`, with a published shop, `FUTURE_START` and `game: "vanguard"`:
    - "deck submission is set on create and edit for JP D-Standard only". Create a JP D-Standard event with `deckSubmission: "required"` → `event.deckSubmission === "required"`. Create a TH event with `"required"` → `"off"`. PATCH the JP event without `deckSubmission` → stays `"required"`. PATCH with `vanguardRegion: "th"` → `"off"`.
    - "can't change deck submission after check-in opens". Open check-in, then PATCH `{ name, deckSubmission: "off" }` → 200, and `deckSubmission` is unchanged.
- [ ] **Step 2: Run them to see them fail.**
  Run: `cd server && node --test test/unit/deckStats.test.js && node --test --test-concurrency=1 test/integration/eventDecks.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add the migration. In `parseEventSettings`, add `deckSubmission: normalizeDeckSubmission(fields, body?.deckSubmission)`, using current `"off"` on create. On PATCH registration, pass `event.deck_submission` as current. Add the `deck_submission` column to `createEvent` / `updateEventSettings` (new last param `deckSubmission`). Add `deckSubmission` to `publicEvent`. Add the form select. It is hidden or shown on the same `change` handler that toggles the region/regulation fields today.
- [ ] **Step 4: Verify.** Run: `cd server && npm run test:all`, then `cd client && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(events): JP D-Standard events can take decks (off/optional/required)`.

---

### Task 2: Pure deck-stats rules

**Files:**
- Modify: `server/src/tournament/deckStats.js`
- Test: `server/test/unit/deckStats.test.js`

**Interfaces:**
- Consumes: `resultForPlayer` from `server/src/tournament/history.js`.
- Produces:
  - `g3Group(rideCards: Array<{cardNumber, name|null, grade|null, imageUrl|null, nation|null}>) -> { key: string, g3: Array<{name, cardNumber, imageUrl, nation}> }`. Keep grade-3 cards that have a name. `g3` holds one entry per distinct name, using the first card number seen for that name. `key` is the names sorted with `localeCompare` and joined with `" / "`, or `"Unknown"` with `g3: []`.
  - `computeDeckStats({ players, matches }) -> { rows, withDeck, noDeck }`
    - `players`: `[{ id, group: {key, g3} | null, finalRank, finalLabel }]`. These are played players only. `group` is null when no deck was submitted.
    - `matches`: `[{ player1Id, player2Id, result }]`
    - `rows`: `[{ key, g3, nation, imageUrl, players, share, wins, losses, draws, matches, winRate, bestLabel, bestRank, firsts, topCuts }]`
      - `share` = players ÷ `withDeck`.
      - `winRate` = (wins + 0.5·draws) ÷ matches. It is `null` for `"Unknown"` or when there are 0 matches.
      - `imageUrl` / `nation` come from the most frequent `g3[0].cardNumber` in the group.
      - `bestLabel`: the best `final_label` by the order `champion, runner_up, top4, top8, top16, top32, top64`, else null.
      - `bestRank`: the lowest `finalRank`, else null.
      - `firsts`: count of `finalRank === 1`.
      - `topCuts`: count with a `finalLabel`.
    - Matches: skip a match when `player2Id` is null, when `result` is null or `"bye"`, or when both sides have a group with the same key that isn't `"Unknown"`. Otherwise tally each side that has a group, using `resultForPlayer` (`double_loss` → loss).
    - Sort by `players` desc, then `winRate` desc (null last).
  - `bangkokRange(from?: "YYYY-MM-DD", to?: "YYYY-MM-DD") -> { start: Date|null, end: Date|null } | { error }`. `start = from 00:00 +07:00`. `end = (to + 1 day) 00:00 +07:00`, exclusive. A malformed date or `from > to` → `{ error: "Choose a valid date range." }`.

- [ ] **Step 1: Write failing unit tests:**
  - `g3Group`:
    - Two reprints of one name → one entry, key = that name.
    - Two different G3 names → key `"A / B"`, sorted.
    - No grade-3 card found (`name: null`) → `"Unknown"`.
  - `computeDeckStats`. Use 5 played players: A1 and A2 in group A, B1 in group B, U1 in Unknown, N1 with no deck. Matches:
    - A1 beats B1
    - A1 vs A2 (mirror → excluded)
    - B1 draws U1
    - A2 vs null bye
    - U1 vs N1 `double_loss`
    - A2 beats N1

    Expect:
    - A: `players 2`, `matches 2`, `wins 2`, `winRate 1`.
    - B: `matches 2`, `wins 0`, `losses 1`, `draws 1`, `winRate 0.25`.
    - Unknown: `matches 2`, `winRate null`.
    - `withDeck 4`, `noDeck 1`, A `share 0.5`, and the row order is A, B, Unknown.
  - "Unknown vs Unknown is counted". Two Unknown players play each other → `matches 1` each side tallied.
  - `bestLabel`/`firsts`/`topCuts`. Players with `champion` and `top4` → `bestLabel "champion"`, `firsts 1`, `topCuts 2`. A Swiss-only winner (`finalRank 1`, no label) → `firsts 1`, `topCuts 0`, `bestRank 1`.
  - `bangkokRange("2026-10-01","2026-10-31")` → `start` = `2026-09-30T17:00:00.000Z`, `end` = `2026-10-31T17:00:00.000Z`. `bangkokRange()` → both null. `("2026-13-01")` → error. `("2026-10-05","2026-10-01")` → error.
- [ ] **Step 2: Run to see it fail.** Run: `cd server && node --test test/unit/deckStats.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the three functions.
- [ ] **Step 4: Run to see it pass.** Run: `cd server && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(events): pure G3 grouping and deck stats`.

---

### Task 3: Submitting decks, visibility, required check-in

**Files:**
- Create: `server/src/db/eventDecks.js`, `server/src/services/deckImport.js`
- Modify: `server/src/routes/decks.js` (use `importDeckForUser`), `server/src/routes/tournaments.js`, `server/src/db/tournaments.js` (`approveCheckInForUsers`)
- Test: `server/test/integration/eventDecks.test.js`

**Interfaces:**
- Consumes: `takesDecks`, `g3Group` (Task 2), and the `publicDeckCard` mapping from `routes/decks.js`. Export it, or move it next to `getDeckCards`.
- Produces:
  - `importDeckForUser(userId, deckCode, sourceLocale) -> deck row`. This is the body of today's `POST /decks/import`, moved here. It throws `DecklogImportError` for user errors, and `decks.js` keeps its responses.
  - `eventDecks.js`:
    - `saveEventDeck(eventId, playerId, deckId) -> event_decks row`. In one transaction it upserts on `player_id`, replaces the cards with `INSERT … SELECT` from `deck_cards`, and sets `updated_at`. If the source deck has no `zone='ride'` cards it throws a `RideDeckEmptyError`.
    - `deleteEventDeck(playerId) -> boolean`
    - `getEventDeck(playerId) -> row|null`
    - `getEventDeckCards(eventDeckId)`: same columns and join as `getDeckCards`.
    - `listEventDeckRide(eventId) -> [{ player_id, card_number, name, grade, image_url, nation }]`: ride cards of every deck in the event, left-joined to `cards`.
  - Routes (all behind existing `requireAuth`):
    - `PUT /events/:id/deck` with `{ deckId }` or `{ code, sourceLocale }`. A code goes through `deckImportLimiter` + `importDeckForUser`. Returns `{ myDeck }`.
      - 404 if not your deck or you have no non-dropped player row.
      - 409 `"Decks can't change once the event has started."` outside registration/check_in.
      - 409 `"This event doesn't take decks."` when `deck_submission = 'off'` or `!takesDecks`.
      - 400 on an empty ride deck.
    - `DELETE /events/:id/deck` → 204. 409 `"A deck is required for this event."` when required. The same status rules apply.
    - `GET /events/:id` adds `myDeck` (or null) when the event takes decks. Staff additionally get `deckSubmitted` and `deckG3` (group key) on each player.
    - `myDeck = { title, decklogCode, sourceLocale, g3, cards: publicDeckCard[] }`
    - `GET /events/:id/decks/:playerId`: staff only (`eventRole` organizer/judge), otherwise 403. Returns `{ deck: myDeck-shape, playerName }`, or 404.
    - Required enforcement:
      - `POST /:id/check-in` → 409 `"Submit your deck before checking in."`
      - `POST /:id/check-in/approve` → 409 `"This player hasn't submitted a deck."`
      - `approveCheckInForUsers(eventId, userIds, approvedBy, { requireDeck })` returns `{ approved: number, skippedNoDeck: string[] }` (display names). The route responds with that object.

- [ ] **Step 1: Write failing integration tests** in `eventDecks.test.js`. Add seed helpers there: `seedCard({cardNumber, name, grade})` and `seedDeck(userId, { ride: [cardNumber…], main: [cardNumber…] }) -> deckId`, both via `withDb` INSERT into `cards` / `decks` / `deck_cards`.
  - "submit, replace and withdraw a deck". After PUT `{deckId}`, `myDeck.g3[0].name` is the seeded G3. A second PUT with another deck replaces it. DELETE → 204, and `myDeck` is null.
  - "the event keeps its own copy". Submit, then change that `deck_cards` ride row to another card and delete the deck → `myDeck` is unchanged.
  - "an empty ride deck is rejected". → 400 with the exact message.
  - "a G3 missing from the catalog is accepted as Unknown". The ride card isn't in `cards` → 200, with `myDeck.g3` = `[]`.
  - "decks lock when the event starts". After start, PUT and DELETE → 409.
  - "events that don't take decks refuse". `deckSubmission: "off"` → 409.
  - "players never see other decks". Player B's `GET /events/:id` has no `deckG3`/`deckSubmitted` on any player. B gets `GET /events/:id/decks/:Aid` → 403. Owner and judge → 200 with full cards.
  - "required: check-in, approve and auto check-in need a deck". The player's own check-in → 409, approve → 409. Auto check-in with two players in the shop (`joinShop` helper), one with a deck → `{ approved: 1, skippedNoDeck: ["<name>"] }`.
  - "optional: withdraw allowed, check-in without a deck allowed".
- [ ] **Step 2: Run to see it fail.** Run: `cd server && node --test --test-concurrency=1 test/integration/eventDecks.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `deckImport.js` and refactor `decks.js` to use it. Run the existing deck tests, if any, plus `npm test`.
- [ ] **Step 4: Implement** `eventDecks.js` and the routes listed above. Update the client toast in `eventsPanel.js` `auto_check_in` to read the new shape (`r.approved`, plus `" · No deck: name1, name2"` when `skippedNoDeck` is non-empty).
- [ ] **Step 5: Verify.** Run: `cd server && node --check src/routes/tournaments.js src/db/eventDecks.js src/services/deckImport.js src/routes/decks.js && npm run test:all`, then `cd client && npm run build`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(events): players submit decks to JP D-Standard events`.

---

### Task 4: Stats endpoints + opponent G3 in history

**Files:**
- Modify: `server/src/db/eventDecks.js` (`listDeckStatsRows`), `server/src/routes/tournaments.js`, `server/src/routes/admin.js`, `server/src/db/tournaments.js` (`listMatchHistoryRows`), `server/src/tournament/history.js`
- Test: `server/test/integration/deckStats.test.js`, `server/test/integration/matchHistory.test.js`, `server/test/unit/history.test.js`

**Interfaces:**
- Consumes: `computeDeckStats`, `g3Group`, `bangkokRange`, `takesDecks`.
- Produces:
  - `listDeckStatsRows({ eventId } | { start, end }) -> { players, matches, eventCount }`. It covers completed events that take decks with `deck_submission <> 'off'` (one event, or `completed_at` in `[start, end)`). Players are "played" only, using the same rule as `PLAYED` in `db/tournaments.js`, and each comes with its ride cards. Groups are built with `g3Group`.
  - `GET /events/:id/deck-stats`: owner or admin (`requireEventOwnerOrAdmin`; a judge → 403).
    - 409 `"Stats are ready once the event is finished."` unless completed.
    - 404 when the event doesn't take decks.
    - Returns `{ stats: computeDeckStats(...) }`.
  - `GET /admin/deck-stats?from&to` → `{ stats, eventCount }`. 400 on a bad range.
  - `buildHistoryEntry({ ..., opponentDecks: Map<opponentPlayerId, {g3}> = new Map() })` sets `opponentDeck = opponentDecks.get(opponentId) ?? null`. The `opponent_player_id` column is added to the history match rows. The decks are loaded with `listEventDeckRide` only for events where `takesDecks && deck_submission <> 'off'`.

- [ ] **Step 1: Write failing tests:**
  - Unit `history.test.js`: "opponentDeck comes from the map by opponent player id, null for a bye".
  - Integration `deckStats.test.js`. Seed a completed JP D-Standard `optional` event the same way as `matchHistory.test.js`: players, matches, `final_rank`/`final_label`, and decks via `saveEventDeck`-equivalent SQL inserts into `event_decks`/`event_deck_cards`.
    - "owner sees the event's stats". The rows and Win % match the hand-computed values, and `noDeck` counts the player without a deck.
    - "judge and player can't see event stats" → 403.
    - "stats wait for the event to finish" → 409.
    - "admin stats span events in a Bangkok date range". Event X has `completed_at = 2026-10-31T17:30:00Z` and event Y has `2026-10-15T05:00:00Z`. `from=2026-10-01&to=2026-10-31` → `eventCount 1` (Y). `from=2026-11-01` → `eventCount 1` (X). No range → 2. A non-admin → 403. `to=garbage` → 400.
  - Integration `matchHistory.test.js`: "opponent's G3 shows after the event when they submitted". An opponent with a deck → `opponentDeck.g3[0].name`. An opponent without one → null.
- [ ] **Step 2: Run to see it fail.** Run: `cd server && node --test --test-concurrency=1 test/integration/deckStats.test.js test/integration/matchHistory.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the db function, both routes and the history wiring.
- [ ] **Step 4: Verify.** Run: `cd server && npm run test:all`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(events): G3 stats per event and across events; opponent G3 in history`.

---

### Task 5: Client — submit deck (player) and see decks (staff)

**Files:**
- Create: `client/src/ui/decklogInput.js`, `client/test/decklogInput.test.js`, `client/src/ui/events/deckDialog.js`
- Modify: `client/src/ui/decksPanel.js` (import `parseDecklogInput` from the new module), `client/src/ui/events/playerView.js`, `client/src/ui/events/organizerView.js`, `client/src/ui/eventsPanel.js`, `client/src/net/api.js`, `client/src/style.css`

**Interfaces:**
- Consumes: the Task 3 routes and response shapes.
- Produces:
  - `decklogInput.js`: `parseDecklogInput(raw) -> { code, sourceLocale|null }`. It is moved unchanged from `decksPanel.js`, along with any constants it uses.
  - `api.js`: `submitEventDeck(token, eventId, body)`, `withdrawEventDeck(token, eventId)`, `getEventPlayerDeck(token, eventId, playerId)`, `getEventDeckStats(token, eventId)`, `getAdminDeckStats(token, {from, to})`.
  - `deckDialog.js`: `openDeckDialog({ getToken, eventId, myDecks }) -> Promise<boolean>`. It opens a `<dialog>`. The dialog offers a "My decks" `<select>` (from `listDecks`) or a paste field. The site is auto-detected via `parseDecklogInput`, and a locale `<select>` appears when it isn't detected. The dialog submits, shows server errors inline, and resolves true on success.
  - The player view has a "Your deck" card above the tabs when `view.event.deckSubmission !== "off"` and the viewer has a player row:
    - Status: `"Required before check-in"` or `"Optional"`.
    - The deck: title, G3 names and a small G3 image.
    - Buttons `data-action="submit-deck"` ("Submit deck" / "Change deck") and `data-action="withdraw-deck"` (optional only, confirmed with `confirmDialog`). The buttons appear only in registration/check_in. After that the card is read-only.
  - Staff check-in tab rows:
    - A badge `"Deck ✓"` (with `deckG3` as the title) or `"No deck"`.
    - The Approve button is `disabled` when required and `!deckSubmitted`.
    - `data-action="view-deck"` opens a `<dialog>` listing the deck's cards. `cardTile` must be exported from `decksPanel.js` and reused there.

- [ ] **Step 1: Write a failing test** in `client/test/decklogInput.test.js`. Port the parsing cases implied by `decksPanel.js`: a `decklog-en.bushiroad.com/view/XXXX` link → `decklog_en`, `/ja/view/` → `decklog_en_ja`, `decklog.bushiroad.com/view/` → `decklog_jp`, a bare code → `sourceLocale: null`, and surrounding whitespace is trimmed.
- [ ] **Step 2: Run it.** Run: `cd client && node --test test/decklogInput.test.js`. Expected: FAIL (module missing).
- [ ] **Step 3: Move `parseDecklogInput`** into `decklogInput.js`. Run: `npm test`. Expected: PASS.
- [ ] **Step 4: Build the dialog, the player card, the staff badges, the view-deck dialog, the event-panel actions and the API functions** as listed in Interfaces. Styles reuse `.ev-row`, `.ev-badge`, `.deck-card-tile` and must work at 390px wide.
- [ ] **Step 5: Verify.** Run: `cd client && node --check src/ui/events/deckDialog.js src/ui/decklogInput.js src/ui/eventsPanel.js && npm test && npm run build`. Expected: PASS.
- [ ] **Step 6: Click-test** against the local test DB, the same way as part 3 (seed script plus `VITE_SERVER_URL`, headless Chrome), never against Neon. Seed cards and one My deck by SQL. Check:
  - The player submits from My deck, changes it and withdraws it.
  - With a required deck, the player's check-in is refused.
  - The organizer sees the badges, a disabled Approve button and the view-deck dialog.
  - Width 390px works.
- [ ] **Step 7: Commit** `feat(client): submit a deck to an event; staff see decks at check-in`.

---

### Task 6: Client — stats tables and opponent G3 in history

**Files:**
- Create: `client/src/ui/events/deckStats.js`, `client/test/deckStats.test.js`, `client/src/ui/deckStatsTable.js`
- Modify: `client/src/ui/events/organizerView.js`, `client/src/ui/eventsPanel.js`, `client/src/ui/adminPanel.js`, `client/index.html`, `client/src/ui/matchHistory.js`, `client/src/style.css`

**Interfaces:**
- Consumes: `getEventDeckStats`, `getAdminDeckStats` (Task 5 api.js), and the response shapes from Task 4.
- Produces:
  - `events/deckStats.js` (pure):
    - `winRateText(row) -> "—" | "62%"` (rounded).
    - `shareText(row) -> "33%"`.
    - `bestFinishText(row, mode: "event"|"all")`. In event mode it gives `PLACEMENT_LABELS[bestLabel]`, else `#bestRank`, else `"—"`. In all mode it gives `"1st ×N · Top cut ×M"`, dropping a part that is 0, and `"—"` if both are 0.
    - `rangePreset(name: "30d"|"90d"|"all", today: Date) -> {from, to}`. The dates are in Bangkok as `YYYY-MM-DD`. `"all"` → `{}`.
  - `deckStatsTable.js`: `deckStatsTableHtml(stats, { mode }) -> string`. The columns are a G3 image, G3 name(s), Players, Share, Win %, Matches and Best finish. A footer reads `"N players didn't submit a deck"` when `noDeck > 0`. The empty state is `"No decks submitted."`
  - Organizer view: a `["deck_stats", "Deck stats"]` tab when `event.status === "completed"`, `view.event.deckSubmission !== "off"` and the role is organizer. `eventsPanel.js` loads it on demand when that tab opens.
  - Admin panel: a new sidebar section `data-dashboard-section="deck-stats"`, labelled "Deck stats", with a matching `data-dashboard-panel`. The panel has preset buttons ("Last 30 days", "Last 90 days", "All time") and custom `from`/`to` `<input type="date">` with an "Apply" button. Below them sit the table and `"Across N events"`.
  - `matchHistory.js`: when present, `opponentDeck` renders as small G3 image(s) plus name(s) joined `" / "`. The column only shows when some match has a value, as before.

- [ ] **Step 1: Write failing tests** in `client/test/deckStats.test.js`:
  - `winRateText({winRate:null})` → `"—"`. `{winRate:0.625}` → `"63%"`.
  - `bestFinishText({bestLabel:"top4"},"event")` → `"Top 4"`. `{bestLabel:null,bestRank:5}` → `"#5"`. All mode with `{firsts:2,topCuts:3}` → `"1st ×2 · Top cut ×3"`. `{firsts:0,topCuts:1}` → `"Top cut ×1"`.
  - `rangePreset("30d", new Date("2026-10-23T20:00:00Z"))`. That is 24 Oct in Bangkok, so expect `{from:"2026-09-25", to:"2026-10-24"}`. `rangePreset("all")` → `{}`.
- [ ] **Step 2: Run to see it fail.** Run: `cd client && node --test test/deckStats.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `events/deckStats.js`. Run: `npm test`. Expected: PASS.
- [ ] **Step 4: Build** the table module, the organizer tab, the admin section and the history rendering.
- [ ] **Step 5: Verify.** Run: `cd client && node --check src/ui/deckStatsTable.js src/ui/adminPanel.js src/ui/matchHistory.js && npm test && npm run build`. Expected: PASS.
- [ ] **Step 6: Click-test** against the local test DB with a seeded completed event that has decks. Check:
  - The owner's Deck stats tab numbers match the seed.
  - Admin Deck stats presets and a custom range change `"Across N events"`.
  - Match history shows the opponent's G3.
  - Width 390px works.
- [ ] **Step 7: Update `CLAUDE.md`.** Mark part 4 done, with a one-line summary (JP D-Standard only, off/optional/required, G3 from the Ride Deck, owner/admin stats). Add 023 to the list of migrations Neon must run.
- [ ] **Step 8: Commit** `feat(client): deck stats for owners and admin; opponent G3 in match history` (include CLAUDE.md).
