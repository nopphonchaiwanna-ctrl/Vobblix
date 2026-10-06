# Changelog

All notable changes to VobbLiX are logged here, newest first.

## 2026-10-06

### Added

- **Tournament/event system** — shop owners can run a Swiss-paired
  tournament (with an optional top-cut bracket) for their shop:
  - Create an event, players register, organizer starts it once
    enough are in
  - Swiss round pairing + an optional top-cut bracket
    (`server/src/tournament/swiss.js`, `bracket.js`)
  - Players (or the organizer, via override) report match results;
    the organizer advances the event round by round
  - Players can drop and rejoin an event before it starts
  - Optional registration cap at creation time — a power of two from
    4 to 64 players
  - Optional per-round time limit (up to 2 days), entered as
    Days/Hours/Minutes dropdowns on the create form and shown as a
    live countdown on the event page once a round is running. This is
    **display-only** — nothing auto-resolves a match when time's up;
    the organizer still decides, same as any other result
  - New "Events" tab in the owner dashboard, plus an "Events" entry in
    the topbar menu and a dedicated events button on each shop's lobby
    card
  - Server: `server/src/routes/tournaments.js`, `server/src/db/tournaments.js`
  - Client: `client/src/ui/eventsPanel.js`
  - DB: migrations 006-008 (`tournament_events` + related tables, the
    player cap, the round time limit)
- **Shop logo upload** — pick an image from disk for a shop's logo,
  resized/re-encoded client-side and saved as a `data:` URL, the same
  pattern the profile avatar already used (no file storage needed).
  The shared resize/encode logic now lives in
  `client/src/ui/imageUpload.js`, used by both the profile avatar
  (`settings.js`) and the new shop logo (`ownerDashboard.js`).
- Shared `client/src/ui/dashboardNav.js` helper for the sidebar-tabs
  layout, now used by the owner dashboard (Profile/Listings/Events).
- Dev convenience script `server/scripts/seed-test-accounts.js` —
  seeds a ready-to-use customer + shop-owner test account.

### Changed

- `shops.logo_url` now accepts up to 500KB instead of 500 characters,
  to hold a `data:` URL instead of a plain link.
- Topbar height is now measured live via `ResizeObserver` instead of a
  fixed CSS value, so the dashboard sidebar stays flush against it.

### Fixed

- Prisma CLI tooling updated for Prisma ORM v7: the connection URL
  moved out of `schema.prisma`'s `datasource` block into a new
  `server/prisma.config.ts` (used only so `prisma db pull`/`generate`
  can introspect the live DB — this project's real migrations still
  live in `server/migrations/` + `scripts/migrate.js`, untouched).

### Database

- New migrations: `006_tournament_events.sql`,
  `007_tournament_event_capacity.sql`,
  `008_tournament_round_time_limit.sql`. Run `npm run migrate` in
  `server/` to apply.
