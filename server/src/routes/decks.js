// Deck API: import a deck from Decklog by its public deck code, then
// read/list/delete the decks the caller has imported (see migration
// 013 + services/decklogImport.js). Mounted at /decks in
// server/src/index.js.
//
// There's no "build a deck from scratch" endpoint yet - deliberately
// out of scope for this phase (see project doc: this is "import via
// Decklog deck code", a from-scratch builder was explicitly not
// chosen). Every deck a user has here was imported, never hand-built.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as db from "../db/decks.js";
import { fetchDecklogDeck, DecklogImportError } from "../services/decklogImport.js";

// Keep in sync with decklogImport.js's LOCALE_API_BASE and the
// client's decksPanel.js <select> options - see that file's header
// comment for what each of these three actually is.
const VALID_SOURCE_LOCALES = ["decklog_en", "decklog_en_ja", "decklog_jp"];

export const decksRouter = Router();

decksRouter.use(requireAuth);

function publicDeck(deck) {
  return {
    id: deck.id,
    game: deck.game,
    title: deck.title,
    memo: deck.memo,
    source: deck.source,
    sourceLocale: deck.source_locale,
    decklogCode: deck.decklog_code,
    nation: deck.nation,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
  };
}

function publicDeckCard(row) {
  const inCatalog = row.name != null;
  return {
    zone: row.zone,
    cardNumber: row.card_number,
    decklogCardNumber: row.decklog_card_number,
    quantity: row.quantity,
    inCatalog,
    name: row.name,
    nameReading: row.name_reading,
    cardType: row.card_type,
    nation: row.card_nation,
    grade: row.card_grade,
    power: row.power,
    shield: row.shield,
    skillText: row.skill_text,
    skillTextTh: row.skill_text_th,
    imageUrl: row.image_url,
    detailUrl: row.detail_url,
  };
}

decksRouter.get("/", async (req, res, next) => {
  try {
    const decks = await db.listDecksForUser(req.auth.userId);
    res.json({ decks: decks.map(publicDeck) });
  } catch (err) {
    next(err);
  }
});

decksRouter.get("/:id", async (req, res, next) => {
  try {
    const deck = await db.getDeckById(req.params.id, req.auth.userId);
    if (!deck) return res.status(404).json({ error: "Deck not found." });
    const cards = await db.getDeckCards(deck.id);
    res.json({ deck: publicDeck(deck), cards: cards.map(publicDeckCard) });
  } catch (err) {
    next(err);
  }
});

decksRouter.post("/import", async (req, res, next) => {
  try {
    const { deckCode, sourceLocale } = req.body || {};
    if (!deckCode || typeof deckCode !== "string") {
      return res.status(400).json({ error: "deckCode is required." });
    }
    if (!VALID_SOURCE_LOCALES.includes(sourceLocale)) {
      return res.status(400).json({
        error: `sourceLocale must be one of ${VALID_SOURCE_LOCALES.join(", ")} - pick whichever Decklog site you got the code from.`,
      });
    }

    const imported = await fetchDecklogDeck(deckCode.trim(), sourceLocale);

    const deck = await db.createDeck({
      userId: req.auth.userId,
      title: imported.title,
      memo: imported.memo,
      sourceLocale,
      decklogCode: deckCode.trim(),
      nation: imported.nation,
      cards: imported.cards,
    });

    const cards = await db.getDeckCards(deck.id);
    const missingCount = cards.filter((c) => c.name == null).length;

    res.status(201).json({
      deck: publicDeck(deck),
      cards: cards.map(publicDeckCard),
      missingCount, // how many of the deck's cards aren't in our own catalog yet
    });
  } catch (err) {
    if (err instanceof DecklogImportError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

decksRouter.delete("/:id", async (req, res, next) => {
  try {
    const ok = await db.deleteDeck(req.params.id, req.auth.userId);
    if (!ok) return res.status(404).json({ error: "Deck not found." });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
