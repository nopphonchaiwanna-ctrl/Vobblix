# VobbLiX — notes for Claude

Walk-around virtual card shop (formerly "Card Cafe" — never use the old
name). Players walk a 2D shop, sit at tables to chat/voice/video, join shop
events (Swiss + top cut), import Decklog decks, and browse a Vanguard card
catalog with Thai translations. Shop owners apply, get reviewed, run a shop,
list items, and organize events. Admins review and create "central" shops.
Intended for real public use, also the author's portfolio.

Product context for UI work lives in `PRODUCT.md` (Impeccable skill is
installed under `.claude/skills/impeccable`). How the code works lives in
`README.md` — read the relevant section before changing a subsystem.

## Working with the user
- The user writes in Thai; reply in Thai (code, comments, commit messages
  stay in English).
- They usually want it done, not a plan for approval — ask only when a
  choice is genuinely theirs (scope, UX direction, anything destructive).
- They are cost-conscious about tokens and paid APIs (chose Gemini free
  tier over paid Anthropic API for translation; avoid big parallel agent
  fan-outs unless asked).
- Commit/push only when asked. Work on branch `dev`; `prod` = what's
  deployed (nothing deployed yet). Remote:
  github.com/nopphonchaiwanna-ctrl/Vobblix (that GitHub account, not the
  machine default).

## Stack & layout
- `client/` — Phaser 3 + Vite + vanilla JS (ES modules). No UI framework.
  Game scene `src/scenes/ShopScene.js`; everything else is DOM overlaid on
  the canvas (`src/ui/*.js`, markup in `index.html`, one `src/style.css`).
  Client-side router `src/router.js` (route handlers must be idempotent
  re-renders; `navigate()` always resolves, even to the current path).
  Icons: inline Lucide via `src/ui/icons.js`.
- `server/` — Express + Socket.io + Postgres via raw `pg` (no ORM at
  runtime; `prisma/` is tooling only and stale). Routes `src/routes/`,
  queries `src/db/`, in-memory live presence `src/rooms.js`.
- DB is **Neon** (cloud Postgres); `server/.env` has `DATABASE_URL`,
  `JWT_SECRET`, `GEMINI_API_KEY`, SMTP vars. Never print or commit `.env`.
- Node 22 (via nvm) is required for current tooling.

## Commands
- `npm run dev` (root) — server + client together.
- `cd server && npm run migrate` — applies `server/migrations/NNN_*.sql`
  in order; tracked by filename in `schema_migrations`, never re-runs one.
- `cd client && npm run build` — production build check.
- `cd server && npm test` - unit tests (no DB). `npm run
  test:integration` - real server + Postgres; needs `TEST_DATABASE_URL`
  in `server/.env` (a disposable local DB, wiped every run - here
  `vobblix_test` in the `coPlaying` Docker container; the harness
  refuses Neon). `npm run test:all` - both. CI is written but not
  active: `docs/ci-workflow.yml` (move to `.github/workflows/ci.yml`;
  pushing it needs a token with the `workflow` scope, which the
  current one lacks).
- Test accounts: `user1@test.local` (customer), `shop1@test.local`
  (shop_owner), password `Test1234!` (`node scripts/seed-test-accounts.js`).
  Make an admin: `node scripts/set-role.js <email> admin`.

## Conventions (follow these)
- Server changes: run `npm run test:all` before calling it done, and
  add/adjust tests for changed behavior (`server/test/`). The tests have
  already caught real bugs (Swiss rematches, a stuck top-cut bracket).
- **Never edit a migration that has already run** against Neon — add a new
  numbered one (013→014 lesson: an in-place edit silently never reached
  the real DB).
- Verify before calling anything done: `node --check` touched JS,
  `npm run build` for client changes, and actually run new SQL/migrations
  (against a throwaway DB or a transaction) rather than eyeballing it.
- Server is the source of truth; REST writes persist first, Socket.io
  pushes are best-effort on top (`io.to("user:" + id)` rooms).
- New full-screen panels use the `.dashboard-shell` layout + 
  `ui/dashboardNav.js`, and must be added to every screen hide-list
  (`querySelectorAll("#auth, #lobby, ...")` in `main.js`,
  `ownerDashboard.js`, `adminPanel.js`).
- Use `confirmDialog()` / `<dialog>`, never `window.confirm/prompt` for new
  UI. Respect `prefers-reduced-motion`.
- Don't assume Vanguard is the only game (`game` columns, `GAME_LABELS`).
- UI must eventually support Thai + English (i18n not built yet; current
  copy is English).

## Card data & Thai translation
- `cards` table: ~16.5k Vanguard cards scraped from cf-vanguard.com
  (Japanese official) by `scripts/import-vanguard-cards.js`; images link to
  the official URLs.
- `skill_text_th` filled lazily on card view by `services/translateCardTh.js`
  (Gemini, two-tier model fallback, rejects output with leftover JP/CJK/
  Hangul) plus manual batches in `server/sql/` (batch2 matches on
  `skill_text`, not card_number).
- Glossary rules: game keywords stay English loanwords as Thai players say
  them (แวนการ์ด, Ride, Call, Drive Check, Counter Blast, ...);
  超トリガー = "โอเวอร์ทริกเกอร์" (not ซุปเปอร์); 呪縛/解呪 = ล็อค/ปลดล็อค;
  世界 = เวิลด์; normalize `・` to `-`/`•`.
- Decklog import (`services/decklogImport.js`): three sources
  `decklog_en` / `decklog_en_ja` / `decklog_jp`; needs browser-like
  Referer/Origin/User-Agent headers or Decklog returns `[]`.

## Open items (as of 2026-10-18)
Pre-launch status lives in `docs/status-audit.md`: steps 1-4 are done
(click-test, server hardening, event edit/cancel + admin account
deletion + join-shop limits, test suites). Next: 5. TURN server +
deploy (code side ready: `render.yaml`, TURN via
`services/iceServers.js`, 720p video; the user follows `docs/deploy.md`
for the Render / Cloudflare Pages / Neon `production` branch accounts),
6. Thai/English i18n.
1. Neon is at migration 018 (017: users.deleted_at, deletion-request
   processing columns, the `default` room row; 018: owned shops get
   scene_type 'owned' so 111/222 draw their chosen layout/theme).
2. Get a real `decklog_jp` deck code to test that source end-to-end.
3. Impeccable `audit` of My Shop and Admin panel; known detector hits:
   11px text, two thick `border-left` accents (incl. `.review-banner`).
4. Admin's owner-application reject still uses `window.prompt`
   (`ui/adminPanel.js`) - move it to a dialog/textarea.
5. After deploy: load-test how many concurrent players the free tier
   really holds (estimate ~20-30 online at once, bottleneck Render free
   CPU on movement broadcasts) - the user wants a measured number.
6. Undecided tournament rules: no third-place match (semifinal losers
   share 3rd); players who drop during Swiss get no final rank.
Later/not started: marketplace card-linking, event decklists, SMS OTP
(use a Thai gateway, not Twilio). Deploy target when we get there:
Cloudflare Pages (client) + Render (server) + Neon.
