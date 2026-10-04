# 🃏 VobbLiX

A walk-around virtual card shop — a Gather.town-style space for playing
tabletop card games online. Characters walk around a shop floor, "sit
down" at tables, and chat (plus voice/video calls) scoped to just
whoever's at that table.

## Features in this MVP

- Multiplayer 2D floor rendered with **Phaser 3**, synced in real time
  over **Socket.io**
- **Accounts** (email + password, with mandatory email verification
  and a password-reset flow) — a player logs in once and their display
  name follows their account; no more retyping a name per visit (see
  "Mandatory email verification & password reset" below)
- Shop-wide text chat, visible to everyone in the room
- **Table-scoped text chat** — only players standing at the same table
  see it (proximity-based, no manual "join" step needed)
- **Table-scoped voice/video calls** (WebRTC mesh, no media server) — up
  to 10 people can talk at once per table, up to 4 of them with camera
  on; joining is an explicit button press, never automatic
- Multiple independent "shops" via a shop code entered in the lobby —
  share a code with friends to land in the same room
- **Shops and chat history persist in Postgres** — a shop's code/layout
  and its chat log survive a server restart; live presence (who's
  online right now, positions) does not, and doesn't need to
- **Shop-owner accounts + a lightweight marketplace** — an admin-approved
  player can open their own shop (from a template, not freeform design),
  which itself needs an admin's review before other players can see it;
  once published they can list items for sale, and a buyer opens a
  persisted order-chat thread with the seller to arrange it (see
  "Becoming a shop owner" below)
- No art assets required to run it — avatars and tables are drawn
  procedurally, so it's easy to reskin later

## Architecture

```
port1_playground/
├── server/     Node.js + Express + Socket.io — authoritative room/player state
│   ├── src/scenes/      One file per ad-hoc shop/event floor layout (the
│   │                     scene registry), plus templates.js/themes.js for
│   │                     owner-created shops — see "Adding a new shop or
│   │                     event" and "Becoming a shop owner" below
│   ├── src/db/           Postgres access: connection pool, shop/chat
│   │                     queries, and marketplace queries (marketplace.js)
│   ├── src/middleware/   requireAuth/requireRole for the REST routes
│   ├── src/auth.js       Password hashing + JWT issuing/verification
│   ├── src/routes/       HTTP endpoints — accounts, owner applications,
│   │                     admin review, shop/listing management, orders
│   ├── scripts/          `migrate.js` + `set-role.js` (promote an
│   │                     account to shop_owner/admin - see below)
│   └── migrations/       SQL schema, applied with `npm run migrate`
└── client/     Vite + Phaser 3 — rendering, input, and the chat UI overlay
    ├── src/webrtc/  Mesh WebRTC call logic (client/src/webrtc/callManager.js)
    └── src/ui/      Panel logic: chat, call, and the marketplace screens
                      (ownerDashboard, adminPanel, ordersPanel, orderThread,
                      shopListings)
```

The two are separate npm packages so they can be deployed independently
later (e.g. client on a static host, server on a small VM/container).

The server is the single source of truth for floor layout: every shop's
table positions and floor size live in `server/src/scenes/`, and the
client receives them at join time as part of the `join-shop` ack (see
`ShopScene.init()` in `client/src/scenes/ShopScene.js`). The client never
hardcodes a layout, so adding a shop or event doesn't touch client code.

The server is also the only thing that talks to Postgres — the client
never sees a connection string, only a login token and whatever the
server sends back over HTTP/Socket.io.

## Adding a new shop or event

Each floor layout is one file in `server/src/scenes/` (copy `default.js`
for the shape: `id`, `label`, `FLOOR_WIDTH`, `FLOOR_HEIGHT`, `TABLES`)
plus one import + one entry in the `SCENES` map in
`server/src/scenes/index.js`. That's the whole surface area — nothing
else in the server, and nothing in the client, needs to change just to
add another shop or a special/limited-time event floor.

A shop picks its scene the first time anyone joins that shop code (via a
`sceneType` sent with `join-shop`, defaulting to `"default"`) and the
choice is written to Postgres, so it stays fixed for that shop's
lifetime — see `findOrCreateShop()` in `server/src/db/shops.js`.

If a future event needs more than a different floor — a countdown
timer, special walk-in rules, decorations with their own logic — see
"Scaling to per-scene behavior" below for how to grow the registry from
data-only to data + behavior hooks, without adding any complexity to the
scenes that don't need it.

## Accounts & persistence

VobbLiX requires an account — there's no anonymous/guest path. A
player registers or logs in once (`POST /auth/register` /
`POST /auth/login`, see `server/src/routes/auth.js`); the client stores
the returned token in `localStorage` (`client/src/auth/session.js`) and
sends it both as the Socket.io handshake `auth.token` and as an
`Authorization: Bearer <token>` header for `/auth/me`. The server
rejects any socket connection without a valid token (`io.use(...)` in
`server/src/index.js`) — display names always come from the account,
never from client-supplied text.

Two Postgres tables carry the durable state (see
`server/migrations/001_init.sql`):

- `shops` — one row per shop code, created the first time someone joins
  it; holds `scene_type` (see "Adding a new shop or event" above) and
  who created it
- `chat_messages` — every shop-wide and table message, with `table_id`
  NULL for shop-wide. On join, the server sends back the last 50
  shop-wide messages (`shopHistory` in the `join-shop` ack); on sitting
  down at a table, it sends back that table's last 50 messages (the
  `join-table` ack's `history`) — see `recentShopMessages` /
  `recentTableMessages` in `server/src/db/shops.js`

Live-only state — who's connected right now, live x/y position, which
table someone's currently at — stays in `server/src/rooms.js`'s
in-memory map, same as before. It doesn't need to survive a restart, so
it isn't written to Postgres.

### Setting up Postgres

You need a Postgres database and its connection string. Two easy options:

- **Local**: install [Postgres.app](https://postgresapp.com/) (macOS) or
  any local Postgres 13+, then create a database:
  `createdb vobblix`. Connection string:
  `postgres://localhost:5432/vobblix`
- **Hosted (no local install)**: a free-tier project on
  [Neon](https://neon.tech) or [Supabase](https://supabase.com) gives you
  a ready-to-use connection string (it'll already include
  `?sslmode=require`, which `server/src/db/pool.js` handles)

Then:

```bash
cd server
cp .env.example .env
# edit .env: paste your DATABASE_URL, and set JWT_SECRET to a random string
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run migrate     # creates the users/shops/chat_messages tables
```

`npm run migrate` is safe to re-run — it only applies `.sql` files under
`server/migrations/` that haven't been applied yet (tracked in a
`schema_migrations` table), so running it again after pulling new
migrations just applies the new ones.

### Mandatory email verification & password reset

A new account can't log in at all until its email is verified - this
is intentionally stricter than a soft reminder banner, trading a bit
more login friction for far fewer throwaway/mistyped-email accounts.
Both this and password reset share the same underlying piece: a
random, single-use, SHA-256-hashed token with an expiry that a link
emailed to the account redeems (migration
`005_email_verification_password_reset.sql`,
`server/src/db/tokens.js`) - see `server/src/email.js` for how the
email itself goes out.

- **Register** (`POST /auth/register`) creates the account, emails a
  verification link (`?token=...`, 24h expiry) to
  `CLIENT_URL/verify-email`, and - unlike before - does **not** hand
  back a login token anymore, since the account can't use one yet. The
  client shows a "check your email" notice instead of entering the app.
- **Login** (`POST /auth/login`) returns `403` with
  `{ code: "EMAIL_NOT_VERIFIED" }` if the account's `email_verified_at`
  is still null; the client shows a "Resend verification email" button
  right there instead of a dead end (`POST /auth/resend-verification`).
- **Forgot/reset password** (`POST /auth/forgot-password`,
  `POST /auth/reset-password`) works the same way with a 1h token to
  `CLIENT_URL/reset-password`. `/forgot-password` always responds
  `{ ok: true }` whether or not the email is registered, same reasoning
  as the resend endpoint above - neither should double as a way to
  probe which emails have accounts.
- **Existing accounts are grandfathered in** - migration 005 backfills
  `email_verified_at` from `created_at` for every account that already
  existed, so turning this on doesn't lock out anyone who registered
  before it existed.
- **Sending the actual email** is provider-agnostic SMTP
  (`server/src/email.js`, via `nodemailer`) - fill in `SMTP_HOST`/
  `SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`EMAIL_FROM` in `.env` for any
  SMTP-speaking provider (Resend, SendGrid, Mailtrap for local testing,
  a personal Gmail account with an app password, ...). Leave them unset
  and emails are just logged to the console instead - so the whole
  register → verify → login flow is exercisable locally without a real
  mailbox, by reading the link out of the server log.
- The email itself is a branded HTML card (`emailShell()` in
  `server/src/email.js`) - a table-based layout with inline styles
  (not `client/src/style.css`'s real CSS, which email clients strip),
  deliberately echoing the client's own dark `.lobby-card` look
  (same `var(--panel)`/`var(--accent)` colors, 16px radius) so it
  visibly comes from VobbLiX rather than a generic system email. A
  plain-text fallback (`text`) ships alongside the HTML in both emails.
  Preview either one for real, in an actual inbox, without a database
  or a real token: `cd server && node scripts/test-email.js
  you@example.com verify` (or `reset`).
- **`CLIENT_URL`** (new env var) is where the client is actually
  deployed - it's what gets stubbed into the emailed links, since the
  client and server are deployed separately (see "Architecture" above).
  Defaults to the Vite dev server for local dev.
- On the client, `/verify-email` and `/reset-password` are real routes
  (`client/src/router.js`) that redeem the link's token and render the
  result right on the auth screen - see `client/src/main.js`'s route
  handlers and the `forgot-password-form`/`reset-password-form`
  markup in `client/index.html`.

### Planned: phone number verification via SMS OTP (not built yet)

A separate, additional layer under consideration on top of the above -
not a replacement for email verification, and not applied to every
account. The idea is to gate it on whoever actually transacts in the
marketplace, not on registration itself. Still undecided which of
these two scopes it'll be:

- OTP required only when an account applies to become a `shop_owner`
  (sellers only - fewer verifications sent, cheaper)
- OTP required on both sides of a transaction - before a shop_owner
  application *and* before a customer can open an order ("Message
  seller") - stronger anti-fraud, but more SMS volume

Cost research so far: an international provider like
[Twilio Verify](https://www.twilio.com/en-us/verify/pricing) charges
roughly $0.05/verification plus SMS carrier cost on top (totals
somewhere around 2.5-4.5 THB per OTP sent to a Thai number), versus a
Thailand-local SMS gateway (e.g. [ThaiBulkSMS](https://www.thaibulksms.com/))
at roughly 0.15-0.20 THB per SMS with OTP included in the same
package - 15-20x cheaper for this app's mostly-Thai user base, so a
local gateway is the likely pick over Twilio once this is built. See
Roadmap.

## Becoming a shop owner & the marketplace

On top of the plain account system, there are three roles
(`users.role` — see `server/migrations/002_shop_owner_marketplace.sql`):
`customer` (default), `shop_owner`, and `admin`. Becoming a shop owner is
a two-step review, not self-service:

1. **Apply.** Any logged-in customer can apply from the lobby ("Apply to
   become a shop owner" — `POST /owner-applications`, see
   `server/src/routes/ownerApplications.js`). One pending application per
   account at a time; re-applying after a rejection is fine.
2. **Admin approves the applicant.** From the admin panel
   (`GET/POST /admin/owner-applications/...`,
   `server/src/routes/admin.js`), which flips `users.role` to
   `shop_owner` in the same transaction as the approval
   (`approveApplication` in `server/src/db/marketplace.js`). Role checks
   (`requireRole` in `server/src/middleware/auth.js`) re-read the role
   from Postgres on every request instead of trusting the JWT, so this
   takes effect on the approved account's very next request — no
   logout/login needed.
3. **Create a shop, then get *that* reviewed too.** A `shop_owner` can
   create exactly one shop (`POST /shops`) — see the dashboard's
   "Manage my shop". It starts in `pending_review` and isn't joinable by
   anyone but the owner (who can preview it early) until an admin
   publishes it (`POST /admin/shops/:id/approve`). Editing a rejected
   shop automatically resubmits it. This second review is separate from
   step 2 on purpose: an approved owner could still pick a bad name/logo
   for a specific shop.

**There's no self-service path to `admin`** — promote the first one by
hand:

```bash
cd server
node scripts/set-role.js someone@example.com admin
```

### Shop design: template + parameters, not freeform

An owner does **not** draw their own floor layout. They pick:

- a **floor-size template** (`server/src/scenes/templates.js` — small/4,
  medium/6, large/10 tables; each pre-checked so table proximity radii
  don't overlap)
- a **color theme** from a fixed list (`server/src/scenes/themes.js`)
- an optional **logo image URL**

`resolveScene(shop)` in `server/src/scenes/index.js` turns a shop row
into the same `{ FLOOR_WIDTH, FLOOR_HEIGHT, TABLES, theme, assets }`
shape an ad-hoc scene file produces, so nothing downstream (join-shop,
`ShopScene.js`) needs to know whether a shop came from a static scene
file or an owner's template pick. This was the deliberate trade-off over
letting owners upload/arrange arbitrary layouts: no bespoke editor UI to
build, no image-moderation surface for a whole scene background, and no
way to place a table somewhere collision/proximity logic breaks.

The `assets JSONB` column on `shops` is there but unused by the client
today — it's the reserved extension point for the fast-follow the
project's headed for next: letting an owner upload their *own* table/
floor sprites (rather than picking from preset themes) without another
payload-shape change, since `resolveScene()` already threads `assets`
through end-to-end.

### Listings and orders (no payment gateway yet)

A published shop's owner can list items (`shop_listings` — title, price,
optional stock count, optional photo URL). There's no checkout or real
money movement in this MVP: a buyer clicking "Message seller" on a
listing opens a `shop_orders` row (status `inquiry`) plus a persisted
chat thread (`shop_order_messages`) to arrange the sale by hand with the
owner, same in spirit to table-chat but scoped to one buyer/seller pair
instead of a table. The seller marks it `confirmed` then `completed` (or
either side can `cancelled` before completion) —
`setOrderStatus`/`ORDER_TRANSITIONS` in `server/src/db/marketplace.js`
enforce who's allowed to make which transition.

`shop_orders.payment_provider` / `payment_reference` are unused columns
reserved for a future payment-gateway integration (see Roadmap) — that
integration should only need to start writing to them and add a
"Pay now" action in the thread, not another migration.

Realtime: `POST /orders`, `/orders/:id/messages`, and
`/orders/:id/status` push `order:new` / `order:message` / `order:status`
to the other party's socket if they're currently connected
(`io.to(\`user:${userId}\`)` in `server/src/routes/orders.js` — every
socket joins its own `user:<id>` room on connect, see
`server/src/index.js`). REST is always the source of truth, so a missed
push just means the other side sees it next time they open "My orders"
instead of instantly.

## Voice & video calls

Calls are scoped to a table exactly like table-chat - see
`client/src/webrtc/callManager.js` (the WebRTC logic) and
`client/src/ui/call.js` (the panel). Joining is always an explicit
button press, never automatic on walking up to a table: `getUserMedia`
needs a user gesture, and a surprise mic/camera permission prompt just
for walking near a table would be a bad experience anyway.

**Mesh, not an SFU.** Each participant opens a direct `RTCPeerConnection`
to every other participant at the table - there's no media server, so
the server (`server/src/index.js`) never sees any audio/video, only
small signaling messages (who's in the call, SDP offers/answers, ICE
candidates) relayed between the right sockets. This keeps the "no extra
infra" property the rest of the project has, at the cost of each
participant's upload bandwidth scaling with the number of others in the
call - which is exactly why there are separate caps for voice and video:

- **Up to 10 people** can be in a table's voice call at once
- **Up to 4** of them can have their camera on at once (a 5th person can
  still join the call and talk, they just can't turn on video) - capped
  tighter than voice because a video mesh's bandwidth cost grows with
  the *square* of participants sending video, and because it's sized for
  actually playing a game together (see-your-cards-and-reactions) rather
  than a big group chat

Both caps are enforced server-side (`VOICE_LIMIT` / `VIDEO_LIMIT` in
`server/src/index.js`, backed by `voiceCountAtTable` /
`videoCountAtTable` in `server/src/rooms.js`) so they hold regardless of
what any client does. Walking away from a table (or switching to a
different one) always ends the call - both the leaving player's own
cleanup (`callManager.leave()`) and a server-side `call-peer-left` to
everyone else at the old table (`endCallForSocket` in
`server/src/index.js`), so a call never silently keeps someone connected
after their avatar has left.

**Glare avoidance.** Only the *joiner* into an existing call ever creates
an SDP offer, toward each peer already there (the `join-call` ack
returns that peer list). An existing member only ever answers - so two
sides never simultaneously try to offer each other, and the client
doesn't need perfect-negotiation/rollback logic to handle that race.

**No TURN server (yet).** ICE only has a public STUN server configured
(`client/src/webrtc/callManager.js`'s `ICE_SERVERS`), which is enough
for most home networks but will fail to connect two peers who are both
behind strict/symmetric NATs (common on some corporate or mobile
networks). Adding a TURN server (self-hosted [coturn](https://github.com/coturn/coturn)
or a hosted one like Twilio's) would fix that - see Roadmap.

**If large rooms (10-30+ people) are ever needed, mesh has to be swapped
for an SFU - and the deciding factor is room size, not stream count.**
The cost that breaks mesh is each participant's *upload*: in a full
mesh, whoever has their camera/mic on must open a separate
`RTCPeerConnection` and send their own encoded stream to literally every
other person in the room - including people who are just listening/
watching, not streaming themselves. So capping how many people can have
their camera on at once (as "Up to 4" above already does) helps the
*receiving* side (less to decode) but does **not** help the *sending*
side if the room itself is large - a single streamer in a 20-person room
still has to upload 19 separate copies of their own video, which is the
actual bottleneck, not how many other people happen to be streaming too.

An SFU (Selective Forwarding Unit - e.g. [LiveKit](https://livekit.io),
[mediasoup](https://mediasoup.org), [Janus](https://janus.conf.meetecho.com/))
fixes this by having each participant upload once to a server, which
then forwards it to everyone who needs it - upload cost becomes flat
regardless of room size, at the cost of running (or paying a hosted
provider for) real media-server infrastructure, one extra network hop,
and a server that now sits in the media path (recording/moderation
become possible, but so does a new single point of failure and a harder
story for end-to-end encryption).

Given that trade-off, don't route every table through an SFU "just in
case" - small tables are both cheaper *and* lower-latency on mesh, since
there's no server in the media path at all. The practical split:

- Keep mesh as the default for anything within today's caps (small
  tables, the common case) - zero extra infra, lowest latency.
- If/when a feature genuinely needs bigger rooms (a spectator mode, a
  community event space), give that room *type* a `capacity` (or
  `room_type`) value decided at creation time, and branch the WebRTC
  join path on it: capacity within the mesh-safe range (~6) joins mesh
  as today, anything above it joins via an SFU instead. Decide this at
  room-creation time, not by switching transport mid-call once people
  are already connected - renegotiating every peer connection through a
  newly-introduced server mid-call is complex and would likely glitch
  the call for everyone in it.
- A stream cap (like today's "Up to 4" video limit) is still worth
  keeping even once an SFU is in play - it's what keeps the SFU's own
  compute/bandwidth bill down as rooms get bigger, just no longer the
  thing standing between the app and a 20-person room by itself.

## Running it locally

Requires **Node.js 18+** and a Postgres database (see "Setting up
Postgres" above — do that first, once).

```bash
npm run install:all   # installs dependencies in server/ and client/
npm run dev           # runs the server (:3001) and client (:5173) together
```

Then open **http://localhost:5173**, register an account (or log back
in if you already have one), enter a shop code, and you're in. Open a
second browser tab/window - register a second account there - and use
the same shop code to test multiplayer against yourself.

You can also run the two halves separately:

```bash
npm run dev:server
npm run dev:client
```

## How it works

- A player registers/logs in first; the client keeps the returned token
  and uses it for every socket connection from then on (see "Accounts &
  persistence").
- On join, the client asks the server for the current room state
  (`join-shop`) and gets back the scene type, floor size, table layout,
  everyone already there, and the shop's recent chat history.
- Movement is client-authoritative and broadcast to the room about
  20x/second (`move`); collision against tables is checked locally on
  each client.
- Walking within a table's radius automatically joins that table's
  Socket.io room (`join-table` / `leave-table` on the server), which
  scopes `table-chat` messages to just that group and replays that
  table's recent history.
- Every shop-wide and table chat message is written to Postgres before
  it's broadcast, so the id/timestamp in the broadcast payload always
  matches what a later joiner will see in history.

## Roadmap

- [x] Mandatory email verification before login, plus a password reset
      flow built alongside it (shared "send a token by email" infra) -
      see "Mandatory email verification & password reset" above
- [ ] Phone number verification via SMS OTP for marketplace trust -
      scope (sellers only vs. both sides of a transaction) still
      undecided, and should use a Thailand-local SMS gateway rather
      than Twilio Verify given the cost gap - see "Planned: phone
      number verification via SMS OTP" above
- [x] Voice and video calls per table (WebRTC) — done as a mesh (no
      media server), signaled over the existing table-room Socket.io
      grouping; capped at 10 voice / 4 video per table - see "Voice &
      video calls" above
- [ ] TURN server for reliable connectivity behind strict/symmetric NAT
      (mesh calls currently only have STUN - see "Voice & video calls")
- [ ] If a table's video mesh ever needs to scale past ~4-6 people, swap
      it for an SFU (e.g. LiveKit) rather than growing the mesh further -
      see "If large rooms (10-30+ people) are ever needed" above for why
      it's room size (not stream count) that decides when, and why that
      should be a per-room-type decision made at creation time
- [ ] Actual card-game logic at a table (deck, hand, board state) once
      players are seated
- [x] Persistent rooms/accounts instead of in-memory server state — done:
      accounts (`server/src/auth.js`, `server/src/routes/auth.js`) and
      shop/chat data (`server/src/db/`) now live in Postgres; only live
      presence (who's online, position) stays in-memory, see "Accounts &
      persistence"
- [x] Unify the two `tables.js` files into one shared package — done
      differently: the server owns the only copy (`server/src/scenes/`)
      and sends the layout to the client at join time, so there's
      nothing left to keep in sync
- [ ] Sprite art instead of procedurally-drawn circles/squares
- [ ] Deploy a live demo (client to a static host, server to a small
      Node host) and link it here
- [x] Shop-owner accounts (admin-approved) with their own admin-reviewed
      shops, plus a lightweight buy/sell marketplace with a persisted
      order-chat thread - done as template+parameters shop creation (no
      freeform design) and no real payment processing yet - see
      "Becoming a shop owner & the marketplace" above
- [ ] Let an owner upload their own table/floor sprites instead of
      picking a preset theme - the `shops.assets` column and
      `resolveScene()`'s payload shape already support this, only the
      upload/moderation UI and the client actually reading `assets` are
      missing
- [ ] A real payment gateway on top of the order-chat thread
      (`shop_orders.payment_provider`/`payment_reference` are reserved
      for this already) instead of buyer/seller arranging payment by hand
- [ ] Multiple shops per owner (currently capped at one -
      `shops_one_per_owner_idx` in migration 002)

## Scaling to per-scene behavior (future refactor)

The registry in `server/src/scenes/` is data-only right now — each scene
module just exports a table layout. If a future shop type or event needs
its own *behavior* (a countdown timer, moving decorations, different
walk-in rules) rather than just a different floor, grow the registry
into a "data + hooks" pattern instead of branching on scene type inside
`index.js`/`ShopScene.js`:

1. Add an optional `hooks` export to a scene module that needs one (e.g.
   `server/src/scenes/halloween-event.js`), such as
   `onPlayerJoin(shop, player)`, `onTick(shop, dtMs)`, or
   `onPlayerMove(shop, player, x, y)`. Leave it out for scenes that don't
   need it — `default.js` stays exactly as simple as it is today.
2. In `server/src/index.js`, after `const scene = getScene(...)`, call
   `scene.hooks?.onPlayerJoin?.(shop, player)` (and the equivalent for
   other events) at the matching point in each socket handler, instead
   of assuming every scene behaves like the current MVP.
3. Add a per-tick loop (a `setInterval`, keyed by room) only for rooms
   whose scene defines `onTick`, so scenes without timed behavior pay no
   extra cost.
4. Mirror this on the client only if a scene needs client-only visuals
   (e.g. falling leaves, a banner): add an optional `decorate(scene)`
   export next to a scene's data, e.g. under
   `client/src/scenes/decorations/`, and call it once from
   `ShopScene.create()` when `payload.sceneType` has a matching module.
5. Keep `getScene(sceneType)` the single lookup point in both server and
   client — no `if (sceneType === "halloween-event")` branches scattered
   through `index.js` or `ShopScene.js`.

This keeps every purely-layout shop (including `default.js`) as simple
as it is today, and only the scenes that actually need custom behavior
pay for the extra complexity.

## Pushing this to GitHub

```bash
git init
git add .
git commit -m "Initial commit: walk-around card shop MVP"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Or, in VS Code: open the **Source Control** panel and click
**Publish to GitHub** for a one-click flow (it creates the remote repo
for you and signs you in if needed).
