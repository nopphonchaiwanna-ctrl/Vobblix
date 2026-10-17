// One-off CLI that backfills skill_text_th for cards whose skill_text
// is a byte-for-byte duplicate of some OTHER card's skill_text that
// already has a translation. Very common in this catalog - triggers
// (every copy of e.g. a Critical Trigger across different sets often
// shares the exact same skill_text) and grade-0 starting vanguards
// with no ability at all (skill_text = '-', already handled directly
// by the import, but also plenty of real short generic effects repeat
// word-for-word across many printings/reprints) all duplicate a lot.
// Translating the SAME Japanese text by hand (or via Gemini) once per
// distinct string, then copying that one approved translation onto
// every other card sharing it, is both faster and more consistent
// than re-translating (or re-running the API on) the same sentence
// hundreds of times.
//
// What it does, in order:
//   1. Reports how many cards currently have no Thai translation yet
//      (skill_text_th IS NULL, and skill_text actually has content -
//      cards with no skill text at all are excluded, same as
//      routes/cards.js's own skip-if-nothing-to-translate rule).
//   2. For every distinct (game, skill_text) that has AT LEAST ONE
//      already-translated card, copies that translation onto every
//      OTHER card sharing the exact same skill_text that's still
//      untranslated. Never touches a row that already has its own
//      skill_text_th (so it can't clobber a manually-reviewed
//      translation with a different one some other duplicate
//      happened to get first).
//   3. Reports the same "still untranslated" count again, so you can
//      see exactly how many got filled for free just from existing
//      duplicates.
//   4. Prints the top 15 most-duplicated skill_text strings that are
//      STILL untranslated after the backfill - i.e. the biggest wins
//      available for the next manual/Gemini translation batch,
//      ranked by how many cards each one would cover at once.
//
// Usage (run from the server/ directory, in your own terminal):
//   node scripts/backfill-duplicate-translations.js

import pg from "pg";
import "dotenv/config";

async function countUntranslated(pool) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM cards
     WHERE skill_text_th IS NULL AND skill_text IS NOT NULL AND skill_text <> ''`
  );
  return rows[0].n;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set - copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  const before = await countUntranslated(pool);
  console.log(`Untranslated cards BEFORE backfill: ${before}`);

  const { rowCount: filled } = await pool.query(`
    WITH canonical AS (
      SELECT game, skill_text,
             (array_agg(skill_text_th ORDER BY updated_at) FILTER (WHERE skill_text_th IS NOT NULL))[1] AS canonical_th
      FROM cards
      WHERE skill_text IS NOT NULL AND skill_text <> ''
      GROUP BY game, skill_text
      HAVING count(skill_text_th) > 0
    )
    UPDATE cards c
    SET skill_text_th = canonical.canonical_th, updated_at = now()
    FROM canonical
    WHERE c.game = canonical.game
      AND c.skill_text = canonical.skill_text
      AND c.skill_text_th IS NULL
  `);

  console.log(`Backfilled skill_text_th on ${filled} card(s) by copying an existing translation from a duplicate skill_text.`);

  const after = await countUntranslated(pool);
  console.log(`Untranslated cards AFTER backfill: ${after}`);

  const { rows: topDupes } = await pool.query(`
    SELECT skill_text, count(*)::int AS n
    FROM cards
    WHERE skill_text_th IS NULL AND skill_text IS NOT NULL AND skill_text <> ''
    GROUP BY skill_text
    HAVING count(*) > 1
    ORDER BY n DESC
    LIMIT 15
  `);

  if (topDupes.length > 0) {
    console.log(`\nBiggest remaining wins for the next translation batch (still untranslated, shared by the most cards):`);
    for (const row of topDupes) {
      const preview = row.skill_text.replace(/\n/g, " ").slice(0, 70);
      console.log(`  ${row.n}x  ${preview}${row.skill_text.length > 70 ? "..." : ""}`);
    }
  } else {
    console.log(`\nNo remaining duplicate skill_text groups among the untranslated cards - what's left is all unique text.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[backfill-duplicate-translations] failed:", err);
  process.exit(1);
});
