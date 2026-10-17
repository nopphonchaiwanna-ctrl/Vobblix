// Raw-pg query layer for the card catalog (see migration 010). Same
// style as db/shops.js / db/tournaments.js - plain snake_case rows out,
// no ORM.

import { pool } from "./pool.js";

/**
 * Inserts or refreshes one card, keyed by (game, card_number) - used
 * by scripts/import-vanguard-cards.js so re-running an import is safe
 * (a card seen again just gets its fields refreshed, nothing
 * duplicates).
 */
export async function upsertCard({
  game,
  cardNumber,
  setCode,
  name,
  nameReading,
  cardType,
  nation,
  grade,
  power,
  shield,
  skillText,
  imageUrl,
  detailUrl,
}) {
  const { rows } = await pool.query(
    `INSERT INTO cards
       (game, card_number, set_code, name, name_reading, card_type, nation, grade, power, shield, skill_text, image_url, detail_url, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
     ON CONFLICT (game, card_number) DO UPDATE SET
       set_code = EXCLUDED.set_code,
       name = EXCLUDED.name,
       name_reading = EXCLUDED.name_reading,
       card_type = EXCLUDED.card_type,
       nation = EXCLUDED.nation,
       grade = EXCLUDED.grade,
       power = EXCLUDED.power,
       shield = EXCLUDED.shield,
       skill_text = EXCLUDED.skill_text,
       image_url = EXCLUDED.image_url,
       detail_url = EXCLUDED.detail_url,
       updated_at = now()
     RETURNING *`,
    [game, cardNumber, setCode, name, nameReading ?? null, cardType ?? null, nation ?? null, grade ?? null, power ?? null, shield ?? null, skillText ?? null, imageUrl ?? null, detailUrl ?? null]
  );
  return rows[0];
}

export async function getCardByNumber(game, cardNumber) {
  const { rows } = await pool.query("SELECT * FROM cards WHERE game = $1 AND card_number = $2", [game, cardNumber]);
  return rows[0] || null;
}

/** Simple name/card-number substring search (ILIKE) - fine at this scale, no full-text index needed yet. */
export async function searchCards(game, query, limit = 25) {
  const { rows } = await pool.query(
    `SELECT * FROM cards
     WHERE game = $1 AND (name ILIKE $2 OR card_number ILIKE $2)
     ORDER BY name ASC
     LIMIT $3`,
    [game, `%${query}%`, limit]
  );
  return rows;
}

export async function countCards(game) {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM cards WHERE game = $1", [game]);
  return rows[0].count;
}

/**
 * Saves a card's lazily-generated Thai SKILL TEXT translation (see
 * services/translateCardTh.js + routes/cards.js's GET /:cardNumber) -
 * keyed the same way upsertCard is, (game, card_number). Card names
 * are deliberately not translated (scope decision - skill text only),
 * so this only ever touches skill_text_th.
 */
export async function setThaiTranslation(game, cardNumber, { skillTextTh }) {
  const { rows } = await pool.query(
    `UPDATE cards SET skill_text_th = $3, updated_at = now()
     WHERE game = $1 AND card_number = $2
     RETURNING *`,
    [game, cardNumber, skillTextTh ?? null]
  );
  return rows[0] || null;
}
