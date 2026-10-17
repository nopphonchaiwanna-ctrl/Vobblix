// Exports the next batch of cards still needing a Thai translation,
// deduplicated by skill_text - companion to
// backfill-duplicate-translations.js (which copies an EXISTING
// translation across duplicates) and to batch1-manual-translations.sql
// (which, in hindsight, translated card-by-card instead of
// text-by-text: untranslated_batch1.csv had one row per CARD, not per
// distinct skill_text, so a lot of those 1000 UPDATEs re-typed the
// exact same Thai sentence under a different card_number). This
// script fixes that for batch 2 and beyond: one row per DISTINCT
// (game, skill_text), not per card, so a shared skill_text only needs
// translating once no matter how many cards it covers.
//
// Run backfill-duplicate-translations.js FIRST, so any text that an
// earlier batch already translated (even under a different
// card_number than this run would pick as the "representative" one)
// is filled in and excluded here - otherwise this could still export
// text that already has an approved translation sitting on a sibling
// card.
//
// Output columns: card_number (one representative card carrying this
// text - whichever sorts first), n_cards (how many cards currently
// share this exact skill_text and are still untranslated - translate
// it once and backfill-duplicate-translations.js picks up the rest
// automatically), skill_text. Rows are ordered by n_cards DESC, so the
// highest-impact duplicates (translate once, fix the most cards) come
// first in the file.
//
// Usage (run from the server/ directory, in your own terminal):
//   node scripts/export-untranslated-batch.js                  # all remaining, one file
//   node scripts/export-untranslated-batch.js --limit 1000     # just the next 1000 distinct texts
//   node scripts/export-untranslated-batch.js --out untranslated_batch3.csv

import { writeFile } from "node:fs/promises";
import pg from "pg";
import "dotenv/config";

function csvField(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseArgs(argv) {
  const args = { limit: null, out: "untranslated_batch2.csv" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set - copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }
  const { limit, out } = parseArgs(process.argv.slice(2));

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  const { rows } = await pool.query(`
    SELECT (array_agg(card_number ORDER BY card_number))[1] AS card_number,
           count(*)::int AS n_cards,
           skill_text
    FROM cards
    WHERE skill_text_th IS NULL AND skill_text IS NOT NULL AND skill_text <> ''
    GROUP BY skill_text
    ORDER BY n_cards DESC, card_number ASC
  `);

  await pool.end();

  const totalDistinct = rows.length;
  const totalCards = rows.reduce((sum, r) => sum + r.n_cards, 0);
  const batch = limit ? rows.slice(0, limit) : rows;
  const batchCards = batch.reduce((sum, r) => sum + r.n_cards, 0);

  const lines = ["card_number,n_cards,skill_text"];
  for (const r of batch) {
    lines.push(`${csvField(r.card_number)},${r.n_cards},${csvField(r.skill_text)}`);
  }
  await writeFile(out, lines.join("\n") + "\n", "utf8");

  console.log(`${totalDistinct} distinct untranslated skill_text value(s) remain, covering ${totalCards} card(s) total.`);
  console.log(`Wrote ${batch.length} of them (covering ${batchCards} card(s)) to ${out}.`);
  if (limit && totalDistinct > limit) {
    console.log(`${totalDistinct - limit} distinct value(s) left for a future batch after this one.`);
  }
}

main().catch((err) => {
  console.error("[export-untranslated-batch] failed:", err);
  process.exit(1);
});
