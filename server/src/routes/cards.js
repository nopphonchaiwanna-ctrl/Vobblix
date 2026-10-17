// Card catalog API: read-only for now (see migration 010 + db/cards.js).
// The catalog itself is populated by scripts/import-vanguard-cards.js,
// not through this API - there's no create/edit endpoint yet because
// nothing in the product needs one yet (Phase 2's marketplace linking
// and Phase 3's event decklists, both still to come, will just *read*
// this). Mounted at /cards in server/src/index.js.
//
// The route below uses ":cardNumber(.*)" rather than plain
// ":cardNumber" - real Vanguard card numbers contain a "/" (e.g.
// "DZ-BT17/001", set code / number within the set), and Express's
// default param matching stops at the first "/", so a plain
// ":cardNumber" would 404 on every real card. "(.*)" tells Express to
// match everything after "/cards/", slashes included.
//
// Thai translation (skill_text_th - migration 011) is filled in
// LAZILY, right here in GET /:cardNumber, the first time a card is
// actually opened - not as a bulk pass over the whole catalog. Scope
// is deliberately SKILL TEXT ONLY - card names are left in Japanese,
// not translated. See services/translateCardTh.js for why (quality:
// an AI call prompted with how Thai players actually talk, not a
// mechanical translate-all pass) and for what it needs
// (ANTHROPIC_API_KEY in .env). If that key isn't set, or the
// translation call fails for any reason, the card is still served
// normally - skillTextTh just comes back null. This endpoint must
// never fail because translation failed.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { cardLimiter } from "../middleware/rateLimit.js";
import * as db from "../db/cards.js";
import { translateCardTh } from "../services/translateCardTh.js";

export const cardsRouter = Router();

const VALID_GAMES = ["vanguard"];

function publicCard(card) {
  return {
    id: card.id,
    game: card.game,
    cardNumber: card.card_number,
    setCode: card.set_code,
    name: card.name,
    nameReading: card.name_reading,
    cardType: card.card_type,
    nation: card.nation,
    grade: card.grade,
    power: card.power,
    shield: card.shield,
    skillText: card.skill_text,
    skillTextTh: card.skill_text_th,
    imageUrl: card.image_url,
    detailUrl: card.detail_url,
  };
}

cardsRouter.use(requireAuth);

cardsRouter.get("/", async (req, res, next) => {
  try {
    const game = VALID_GAMES.includes(req.query?.game) ? req.query.game : "vanguard";
    const q = (req.query?.q || "").trim().slice(0, 100);
    if (!q) return res.json({ cards: [] });
    const cards = await db.searchCards(game, q, 25);
    res.json({ cards: cards.map(publicCard) });
  } catch (err) {
    next(err);
  }
});

cardsRouter.get("/:cardNumber(.*)", cardLimiter, async (req, res, next) => {
  try {
    const game = VALID_GAMES.includes(req.query?.game) ? req.query.game : "vanguard";
    let card = await db.getCardByNumber(game, req.params.cardNumber);
    if (!card) return res.status(404).json({ error: "Card not found." });

    // Only bother translating if there's actually skill text to
    // translate, and only once per card (null = not translated yet).
    if (card.skill_text && !card.skill_text_th) {
      try {
        const { skillTextTh } = await translateCardTh({ skillText: card.skill_text });
        card = (await db.setThaiTranslation(game, card.card_number, { skillTextTh })) || card;
      } catch (translateErr) {
        // Serve the card without a Thai translation rather than fail
        // the request - this is a nice-to-have on top of the real
        // (Japanese) card data, not a dependency of it.
        console.warn(`[cards] Thai translation skipped for ${card.card_number}: ${translateErr.message}`);
      }
    }

    res.json({ card: publicCard(card) });
  } catch (err) {
    next(err);
  }
});
