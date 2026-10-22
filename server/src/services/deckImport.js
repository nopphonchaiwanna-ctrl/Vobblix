// Importing a Decklog deck into a user's "My deck" - shared by
// POST /decks/import and submitting a new code to an event
// (PUT /events/:id/deck), so both validate and store it the same way.

import * as db from "../db/decks.js";
import { fetchDecklogDeck, DecklogImportError } from "./decklogImport.js";

// Keep in sync with decklogImport.js's LOCALE_API_BASE and the
// client's Decklog site <select> options.
export const VALID_SOURCE_LOCALES = ["decklog_en", "decklog_en_ja", "decklog_jp"];

/** Fetches the deck from Decklog and saves it as the user's; throws DecklogImportError on bad input. */
export async function importDeckForUser(userId, deckCode, sourceLocale) {
  if (!deckCode || typeof deckCode !== "string" || !deckCode.trim()) {
    throw new DecklogImportError("deckCode is required.");
  }
  if (!VALID_SOURCE_LOCALES.includes(sourceLocale)) {
    throw new DecklogImportError(
      `sourceLocale must be one of ${VALID_SOURCE_LOCALES.join(", ")} - pick whichever Decklog site you got the code from.`
    );
  }
  const code = deckCode.trim();
  const imported = await fetchDecklogDeck(code, sourceLocale);
  return db.createDeck({
    userId,
    title: imported.title,
    memo: imported.memo,
    sourceLocale,
    decklogCode: code,
    nation: imported.nation,
    cards: imported.cards,
  });
}
