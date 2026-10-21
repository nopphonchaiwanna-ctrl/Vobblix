# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two primary groups, weighted equally:
- **Card players in Thailand** (Cardfight!! Vanguard first; other card games planned). They walk around a shared 3D shop, sit at tables to chat/voice/video with the people at that table, register for and play in shop events, and import their decks.
- **Card-shop owners.** They apply to become an owner, set up one shop (template + theme + logo, reviewed by an admin), list items for sale, and organize events (Swiss + optional top cut).
- Secondary: **admins**, who review owner applications and shops, and create official "central" shops.

## Product Purpose
A walk-around virtual card shop: the social feel of a real card-shop table, online. Proximity replaces "join room" buttons: walk up to a table and you're in that table's chat/call. Success = players actually gather and play in shops, and owners can run real events and sell through it.
Intended for real public use (not only a portfolio piece), though it also serves as the author's portfolio.

## Positioning
Not a chat app, not a deck-builder, not a marketplace alone: a *place*. Shops are spaces you walk into; tables are scoped conversations; events, decks and card data are tied to the real card game and to the shop hosting them.

## Operating Context
- Players already build decks on Bushiroad's official Decklog sites and bring deck codes/links in.
- Card data is the Japanese official catalog (cf-vanguard.com) with Thai translations of skill text; game keywords stay as the English loanwords Thai players actually say.
- Events follow tournament conventions players know (Swiss rounds, OPW tiebreak, top cut, player-confirmed results with organizer override).
- Buying/selling is negotiated in an order chat; there is no payment gateway.

## Capabilities and Constraints
- Stack (existing): Three.js + Vite + vanilla JS (ES modules) client, DOM UI overlaid on the canvas; Node/Express + Socket.io + Postgres server. No UI framework.
- Dark theme is the default; a light theme toggle exists.
- Multi-game is planned: UI and data must not assume Vanguard is the only game (events already carry a `game` field).
- **UI language: must support both Thai and English** (planned, not built yet; current UI copy is English-only). Card text is Japanese with Thai translations.
- Voice/video is WebRTC mesh: small tables only (voice ≤10, video ≤4).
- Undecided: phone/SMS verification scope; real logo/icon (currently none, intentionally).

## Brand Commitments
- Name: **VobbLiX** (formerly "Card Cafe"; the old name must not reappear).
- No logo or brand mark yet; do not invent one.

## Evidence on Hand
- Real card catalog: ~16.5k Vanguard cards (D-BT01 to DZ-BT17) with official image URLs.
- No users, testimonials, metrics, or press yet: do not fabricate any.

## Product Principles
1. Feel like a place, not a form: presence and proximity first.
2. Speak the players' language: real card-game terms, Thai-friendly, never mechanical translation.
3. Owners are partners: review flows must tell them what to fix and how.
4. Game-agnostic foundations: Vanguard first, never Vanguard-only.
5. Honest UI: show real state (pending, rejected, time's up) clearly rather than hiding it.

## Accessibility & Inclusion
Thai and English readers; Thai script needs fonts and line-heights that render it well. Respect prefers-reduced-motion (already done for view transitions/toasts).
