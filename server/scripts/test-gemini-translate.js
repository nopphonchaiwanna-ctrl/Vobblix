// One-off CLI to check the Gemini translation setup in server/.env
// actually works - without going through the whole app/server, a
// database, or clicking through Postman. Calls the exact same
// translateCardTh() the real /cards/:cardNumber route calls (see
// src/services/translateCardTh.js), so whatever happens here is
// exactly what would happen on a real card detail request. Usage:
//
//   cd server
//   node scripts/test-gemini-translate.js
//   node scripts/test-gemini-translate.js "your own Japanese skill text here"
//
// With no argument, uses a short built-in sample skill text. Prints
// the full error (including Gemini's own response body) on failure -
// useful for telling a persistent/real problem (bad key, wrong model
// name, quota actually exhausted) apart from a transient one (503
// "high demand", 429 rate limit - translateCardTh() already retries
// those twice on its own before giving up, logging each retry
// attempt to the console as it happens).

import "dotenv/config";
import { translateCardTh } from "../src/services/translateCardTh.js";

const SAMPLE_SKILL_TEXT =
  "【ライド時】 このカードがライドした時、相手のヴァンガードがグレード3以上なら、カード1枚を引き、カード1枚を山札の下に置く。";

async function main() {
  const skillText = process.argv[2] || SAMPLE_SKILL_TEXT;

  console.log("GEMINI_API_KEY set:", Boolean(process.env.GEMINI_API_KEY));
  console.log("GEMINI_MODEL:", process.env.GEMINI_MODEL || "(unset - using default gemini-flash-latest)");
  console.log("\nSkill text to translate:\n" + skillText + "\n");
  console.log("Calling Gemini...\n");

  const startedAt = Date.now();
  const { skillTextTh } = await translateCardTh({ skillText });
  const elapsedMs = Date.now() - startedAt;

  console.log(`Success in ${elapsedMs}ms. Thai translation:\n`);
  console.log(skillTextTh);
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
