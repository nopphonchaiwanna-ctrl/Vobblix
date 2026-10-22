// Decks submitted to events (deck-stats design §5): a snapshot of one of
// the player's My-deck decks, copied card by card so later edits or a
// deleted original never change what was submitted. The G3 group is
// worked out from the 'ride' zone when read (tournament/deckStats.js).

import { pool } from "./pool.js";

export class RideDeckEmptyError extends Error {}

/**
 * Copies `deckId` (which must belong to `userId`) into the player's
 * event deck, replacing any earlier one. Returns the event_decks row,
 * or null when the deck isn't the user's.
 */
export async function saveEventDeck(eventId, playerId, deckId, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deck = (await client.query("SELECT * FROM decks WHERE id = $1 AND user_id = $2", [deckId, userId])).rows[0];
    if (!deck) {
      await client.query("ROLLBACK");
      return null;
    }
    const ride = await client.query("SELECT 1 FROM deck_cards WHERE deck_id = $1 AND zone = 'ride' LIMIT 1", [deckId]);
    if (!ride.rowCount) throw new RideDeckEmptyError("This deck has no ride deck - submit a D Standard deck.");

    const { rows } = await client.query(
      `INSERT INTO event_decks (event_id, player_id, decklog_code, source_locale, title, nation)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (player_id) DO UPDATE
         SET decklog_code = EXCLUDED.decklog_code, source_locale = EXCLUDED.source_locale,
             title = EXCLUDED.title, nation = EXCLUDED.nation, updated_at = now()
       RETURNING *`,
      [eventId, playerId, deck.decklog_code, deck.source_locale, deck.title, deck.nation]
    );
    const eventDeck = rows[0];
    await client.query("DELETE FROM event_deck_cards WHERE event_deck_id = $1", [eventDeck.id]);
    await client.query(
      `INSERT INTO event_deck_cards (event_deck_id, card_number, decklog_card_number, zone, quantity)
       SELECT $1, card_number, decklog_card_number, zone, quantity FROM deck_cards WHERE deck_id = $2`,
      [eventDeck.id, deckId]
    );
    await client.query("COMMIT");
    return eventDeck;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteEventDeck(playerId) {
  const { rowCount } = await pool.query("DELETE FROM event_decks WHERE player_id = $1", [playerId]);
  return rowCount > 0;
}

export async function getEventDeck(playerId) {
  const { rows } = await pool.query("SELECT * FROM event_decks WHERE player_id = $1", [playerId]);
  return rows[0] || null;
}

/** Same columns as db/decks.js getDeckCards, so routes/decks.js publicDeckCard maps them. */
export async function getEventDeckCards(eventDeckId) {
  const { rows } = await pool.query(
    `SELECT dc.zone, dc.card_number, dc.decklog_card_number, dc.quantity,
            c.name, c.name_reading, c.card_type, c.nation AS card_nation, c.grade AS card_grade,
            c.power, c.shield, c.skill_text, c.skill_text_th, c.image_url, c.detail_url
     FROM event_deck_cards dc
     LEFT JOIN cards c ON c.game = 'vanguard' AND c.card_number = dc.card_number
     WHERE dc.event_deck_id = $1
     ORDER BY dc.zone, c.grade DESC, c.card_type DESC, dc.card_number`,
    [eventDeckId]
  );
  return rows;
}

/** Ride-zone cards of every deck submitted to these events, for G3 groups. */
export async function listEventDeckRide(eventIds) {
  const { rows } = await pool.query(
    `SELECT ed.event_id, ed.player_id, dc.card_number, c.name, c.grade, c.image_url, c.nation
     FROM event_decks ed
     JOIN event_deck_cards dc ON dc.event_deck_id = ed.id AND dc.zone = 'ride'
     LEFT JOIN cards c ON c.game = 'vanguard' AND c.card_number = dc.card_number
     WHERE ed.event_id = ANY($1::uuid[])`,
    [eventIds]
  );
  return rows;
}

/** player_id -> ride cards in g3Group's input shape. Players with a deck always get an entry. */
export function rideByPlayer(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.player_id)) out.set(r.player_id, []);
    out.get(r.player_id).push({ cardNumber: r.card_number, name: r.name, grade: r.grade, imageUrl: r.image_url, nation: r.nation });
  }
  return out;
}
