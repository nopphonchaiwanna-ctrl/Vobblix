// Raw-pg query layer for the deck system (see migration 013). Same
// style as db/cards.js / db/shops.js - plain snake_case rows out, no
// ORM. Decks are always scoped to the owning user_id - there's no
// shared/public deck browsing yet (that'd be a later phase, same as
// marketplace card-linking).

import { pool } from "./pool.js";

/**
 * Creates a deck and all of its deck_cards rows in one transaction -
 * used by routes/decks.js's POST /decks/import right after
 * services/decklogImport.js has fetched + normalized the deck. If any
 * card insert fails, nothing is left half-written.
 */
export async function createDeck({ userId, game = "vanguard", title, memo, sourceLocale, decklogCode, nation, cards }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO decks (user_id, game, title, memo, source, source_locale, decklog_code, nation)
       VALUES ($1, $2, $3, $4, 'decklog', $5, $6, $7)
       RETURNING *`,
      [userId, game, title, memo ?? null, sourceLocale, decklogCode, nation ?? null]
    );
    const deck = rows[0];

    for (const c of cards) {
      await client.query(
        `INSERT INTO deck_cards (deck_id, card_number, decklog_card_number, zone, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [deck.id, c.cardNumber, c.decklogCardNumber, c.zone, c.quantity]
      );
    }

    await client.query("COMMIT");
    return deck;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listDecksForUser(userId) {
  const { rows } = await pool.query(`SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return rows;
}

export async function getDeckById(id, userId) {
  const { rows } = await pool.query(`SELECT * FROM decks WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] || null;
}

/**
 * A deck's cards, LEFT JOINed against our own card catalog by
 * card_number - a card the deck references that we haven't imported
 * yet (new set, EN-exclusive promo, etc.) still comes back as a row,
 * just with every cards.* column null instead of the deck import
 * failing or silently dropping it. routes/decks.js uses that to flag
 * "N cards not in our catalog yet" to the caller.
 */
export async function getDeckCards(deckId) {
  const { rows } = await pool.query(
    `SELECT dc.zone, dc.card_number, dc.decklog_card_number, dc.quantity,
            c.name, c.name_reading, c.card_type, c.nation AS card_nation, c.grade AS card_grade,
            c.power, c.shield, c.skill_text, c.skill_text_th, c.image_url, c.detail_url
     FROM deck_cards dc
     LEFT JOIN cards c ON c.game = 'vanguard' AND c.card_number = dc.card_number
     WHERE dc.deck_id = $1
     ORDER BY dc.zone, c.grade DESC, c.card_type DESC, dc.card_number`,
    [deckId]
  );
  return rows;
}

export async function deleteDeck(id, userId) {
  const { rowCount } = await pool.query(`DELETE FROM decks WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rowCount > 0;
}
