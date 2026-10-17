// One-off/rerunnable CLI to import the Vanguard card catalog from the
// official Japanese site (cf-vanguard.com) into the local `cards` table
// (see migration 010 + db/cards.js). See the project doc's "Game
// selector on events" / card-catalog phase-1 section for the full
// background and the decisions behind this (JP data, link-don't-host
// images, product-by-product scoping).
//
// IMPORTANT - run this from your own regular terminal, not through the
// Claude Code Remote device-bridge shell: network access to
// cf-vanguard.com is blocked from that sandboxed shell (and from the
// cloud container this was written in) by its own egress allowlist.
// It was only reachable at all by driving the real Browser pane on
// this machine, which is how the HTML structure below was confirmed
// against the live site - but that's a manual, one-page-at-a-time
// path, not something this script can ride on. A normal terminal has
// no such restriction (same as `npm run migrate` / `git push` earlier
// this project).
//
// How the site actually works (reverse-engineered live, 2026-10-06):
// - /cardlist/ lists every product (booster, trial deck, PR, ...)
//   ever released, newest first, each with a release date and a link
//   to ?expansion=<id> - that id is NOT derivable from the product's
//   own code, so it has to be read off this listing page.
// - /cardlist/cardsearch/?expansion=<id>&view=text renders that
//   product's first 24 cards server-side.
// - Cards 25+ come from a separate AJAX endpoint the page's own JS
//   calls on scroll: /cardlist/cardsearch_ex/?expansion=<id>&view=text&page=<n>
//   (page=2 is cards 25-48, page=3 is 49-72, ...), returning a bare
//   HTML fragment of <li class="ex-item"> blocks - no page chrome, no
//   JS rendering needed, just HTML to parse. An empty/short response
//   means that was the last page.
// - Each <li> has: an <a href="...cardno=XXX">, a card image under
//   .image img[src], the card number under .number, the name (+
//   furigana reading in a nested <span>) under h5, a single-line
//   "<type>｜<nation>｜グレード N｜パワー N｜シールド N-or-dash" under
//   .status, and the full skill text (with <br> line breaks) in a
//   trailing <p>. Clan/rarity/trigger are NOT in this list view -
//   known gap, see the project doc's "Known outstanding items".
//
// Usage:
//   node scripts/import-vanguard-cards.js [--from=D-BT01] [--to=DZ-BT17] [--delay=700]
//
// Defaults to exactly the range asked for when this was built. Safe to
// re-run or re-run with a wider --to later - upsertCard() is keyed on
// (game, card_number), so nothing duplicates.

import "dotenv/config";
import * as cheerio from "cheerio";
import { upsertCard, countCards } from "../src/db/cards.js";
import { pool } from "../src/db/pool.js";

const BASE = "https://cf-vanguard.com";
const GAME = "vanguard";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  return {
    from: args.from || "D-BT01",
    to: args.to || "DZ-BT17",
    delayMs: Number(args.delay) || 700,
  };
}

async function fetchText(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } catch (err) {
    if (attempt >= 3) throw err;
    console.warn(`  [retry ${attempt}] ${err.message}`);
    await sleep(1500 * attempt);
    return fetchText(url, attempt + 1);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads /cardlist/ (the product browser) and returns every product
 * between `fromCode` and `toCode` inclusive, in release-date order
 * (oldest first) - this is the only place the expansion id for a
 * product is exposed, so every product has to be discovered here
 * first, individual card pages don't carry it on their own.
 */
async function discoverTargetProducts({ from, to }) {
  console.log(`Reading the product list from ${BASE}/cardlist/ ...`);
  const html = await fetchText(`${BASE}/cardlist/`);
  const $ = cheerio.load(html);

  // Every product tile is a link to ?expansion=<id>, with the
  // bracketed code (e.g. "【DZ-BT08】") and release date nearby in the
  // same block of text. The page lists newest-first; we collect in
  // that order and reverse once we've sliced the target window, so
  // the result comes back oldest-first for a nicer progress log.
  const products = [];
  $('a[href*="expansion="]').each((_, el) => {
    const href = $(el).attr("href");
    const match = href && href.match(/expansion=(\d+)/);
    if (!match) return;
    const expansionId = match[1];
    const text = $(el).text();
    const codeMatch = text.match(/【([^】]+)】/);
    if (!codeMatch) return;
    const code = codeMatch[1].trim();
    if (products.some((p) => p.expansionId === expansionId)) return; // de-dupe repeated links
    products.push({ expansionId, code, rawText: text.trim() });
  });

  if (products.length === 0) {
    throw new Error(
      "Found no product links on /cardlist/ - the site's markup has likely changed since this script was written. " +
        "Re-check the page structure before re-running."
    );
  }

  const fromIdx = products.findIndex((p) => p.code === from);
  const toIdx = products.findIndex((p) => p.code === to);
  if (fromIdx === -1 || toIdx === -1) {
    throw new Error(
      `Could not find --from=${from} and/or --to=${to} in the product list. ` +
        `Found codes include: ${products.slice(0, 10).map((p) => p.code).join(", ")}, ... ` +
        "Pass the exact bracketed code as shown on https://cf-vanguard.com/cardlist/."
    );
  }

  // Products are listed newest-first, so "from" (older/lower bound)
  // has the larger index and "to" (newer/upper bound) the smaller one
  // - unless the user passed them backwards, so just take the min/max.
  const lo = Math.min(fromIdx, toIdx);
  const hi = Math.max(fromIdx, toIdx);
  const windowed = products.slice(lo, hi + 1);
  return windowed.reverse(); // oldest first, nicer progress log order
}

/** Parses the shared <li> card-tile markup (same shape on the first server-rendered page and every cardsearch_ex page). */
function parseCardTiles(html, setCode) {
  const $ = cheerio.load(html);
  const cards = [];
  $("li").each((_, li) => {
    const $li = $(li);
    const link = $li.find('a[href*="cardno="]').first();
    if (link.length === 0) return;

    const numberText = $li.find(".number").first().text().trim();
    if (!numberText) return;

    const h5 = $li.find("h5").first();
    const nameReading = h5.find("span").first().text().trim();
    const name = h5.clone().children("span").remove().end().text().trim();

    const statusText = $li.find(".status").first().text().replace(/\s+/g, " ").trim();
    const parts = statusText.split("｜").map((s) => s.trim());
    const cardType = parts[0] || null;
    const nation = parts[1] || null;
    const grade = (() => {
      const m = (parts[2] || "").match(/\d+/);
      return m ? Number(m[0]) : null;
    })();
    const power = (() => {
      const m = (parts[3] || "").match(/\d+/);
      return m ? Number(m[0]) : null;
    })();
    const shield = (() => {
      const m = (parts[4] || "").match(/\d+/);
      return m ? Number(m[0]) : null;
    })();

    const skillHtml = $li.find(".text p").first().html() || "";
    const skillText = skillHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    const imageSrc = $li.find(".image img, img.cardimage").first().attr("src");
    const imageUrl = imageSrc ? new URL(imageSrc, BASE).toString() : null;

    const detailHref = link.attr("href");
    const detailUrl = detailHref ? new URL(detailHref, BASE).toString() : null;

    cards.push({
      cardNumber: numberText,
      setCode,
      name,
      nameReading: nameReading || null,
      cardType,
      nation,
      grade,
      power,
      shield,
      skillText: skillText || null,
      imageUrl,
      detailUrl,
    });
  });
  return cards;
}

async function scrapeProduct({ expansionId, code }, delayMs) {
  let total = 0;

  const firstPageUrl = `${BASE}/cardlist/cardsearch/?expansion=${expansionId}&view=text`;
  const firstHtml = await fetchText(firstPageUrl);
  const firstCards = parseCardTiles(firstHtml, code);
  for (const card of firstCards) await upsertCard({ game: GAME, ...card });
  total += firstCards.length;

  let page = 2;
  while (true) {
    await sleep(delayMs);
    const now = Date.now();
    const url = `${BASE}/cardlist/cardsearch_ex/?expansion=${expansionId}&view=text&page=${page}&t=${now}&_=${now}`;
    const html = await fetchText(url);
    const cards = parseCardTiles(html, code);
    if (cards.length === 0) break;
    for (const card of cards) await upsertCard({ game: GAME, ...card });
    total += cards.length;
    page += 1;
  }

  return total;
}

async function main() {
  const { from, to, delayMs } = parseArgs();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set - copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }

  console.log(`Importing Vanguard cards: ${from} .. ${to} (delay ${delayMs}ms between requests)\n`);
  const products = await discoverTargetProducts({ from, to });
  console.log(`Found ${products.length} products in range. Starting...\n`);

  let grandTotal = 0;
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const label = `[${i + 1}/${products.length}] ${product.code}`;
    process.stdout.write(`${label} - fetching... `);
    try {
      const count = await scrapeProduct(product, delayMs);
      grandTotal += count;
      console.log(`${count} cards.`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      console.log(`  (skipped ${product.code} - re-run this script later to retry; already-imported cards are untouched)`);
    }
    await sleep(delayMs);
  }

  const catalogSize = await countCards(GAME);
  console.log(`\nDone. Imported/updated ${grandTotal} card rows this run. Catalog now has ${catalogSize} Vanguard cards total.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
