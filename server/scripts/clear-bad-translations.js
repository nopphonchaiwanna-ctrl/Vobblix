// One-off CLI to clean up Thai card translations that got saved BEFORE
// the translateCardTh.js fixes on 2026-10-07 (the lite Gemini model
// failed in two different ways: first by echoing the original
// Japanese skill text back unchanged under the skillTextTh key, then
// - after that was fixed - by splicing a single random Korean word
// into an otherwise-correct Thai sentence. See the DEFAULT_MODEL
// comment in services/translateCardTh.js for the full story). Those
// bad results are already saved in cards.skill_text_th, and
// routes/cards.js only (re-)translates a card when skill_text_th IS
// NULL - so a card that got a bad result once will keep serving it
// forever unless this is cleared out, even with the fixes now in
// place.
//
// What it does: scans every card with a non-null skill_text_th, and
// sets it back to NULL (so the next time that card's detail view is
// opened, routes/cards.js re-translates it with the fixed prompt) for
// any row where skill_text_th still contains Japanese, Korean, or
// Chinese script - the same check translateCardTh.js itself now uses
// to reject a bad translation before saving it. A row with a real,
// clean Thai translation is left alone.
//
// Usage (run from the server/ directory, in your own terminal):
//   node scripts/clear-bad-translations.js        # just reports what it would clear
//   node scripts/clear-bad-translations.js --fix   # actually clears them

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const UNEXPECTED_SCRIPT_RE = /[぀-ヿ㐀-䶿一-鿿ᄀ-ᇿ㄀-㆟가-힯]/;

async function main() {
  const apply = process.argv.includes("--fix");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set - copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  const { rows } = await pool.query(
    "SELECT id, card_number, skill_text_th FROM cards WHERE skill_text_th IS NOT NULL"
  );

  const bad = rows.filter((r) => UNEXPECTED_SCRIPT_RE.test(r.skill_text_th));

  console.log(`Checked ${rows.length} translated card(s). Found ${bad.length} with leftover non-Thai script:`);
  for (const r of bad) {
    console.log(`  ${r.card_number}`);
  }

  if (bad.length === 0) {
    console.log("Nothing to clear.");
  } else if (!apply) {
    console.log(`\nRun again with --fix to clear these ${bad.length} row(s) so they get re-translated on next view.`);
  } else {
    const ids = bad.map((r) => r.id);
    await pool.query("UPDATE cards SET skill_text_th = NULL WHERE id = ANY($1::uuid[])", [ids]);
    console.log(`\nCleared skill_text_th on ${bad.length} card(s). They'll be re-translated the next time their detail view is opened.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[clear-bad-translations] failed:", err);
  process.exit(1);
});
