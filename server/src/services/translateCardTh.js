// Lazy Thai translation for one card's SKILL TEXT ONLY, called from
// routes/cards.js the first time someone opens that card's detail view
// (not a bulk pass - see migration 011). Card names are deliberately
// NOT translated (explicit scope decision - skill text only, left the
// Japanese name as-is).
//
// Uses the Google Gemini API (free tier - no credit card required,
// see https://ai.google.dev/gemini-api/docs/pricing) instead of
// Anthropic, switched 2026-10-07 specifically so this feature costs
// $0. Talks to the API directly over fetch rather than pulling in a
// client library, same "only add what's actually needed" spirit as
// the rest of this codebase. If you ever do want to switch back to
// Anthropic (e.g. translation quality isn't good enough), the only
// things that would need to change are callGemini()'s URL/request
// body/response-parsing - the glossary, system prompt and everything
// in routes/cards.js stay the same either way.
//
// The whole reason this exists instead of Google Translate/DeepL: a
// literal translation of Vanguard rules text reads like a legal
// document, not something a Thai player would say at a table. The
// glossary below is a starting point for how the Thai Vanguard
// community actually talks (lots of terms stay as English loanwords,
// said with a Thai accent, rather than being translated) - if a
// translation comes back sounding off, this glossary is the first
// place to adjust, not the prompt structure around it.

// Two-tier model strategy (settled on 2026-10-07, after three rounds
// of a real, repeatable problem - see below):
//
// - PRIMARY_MODEL ("gemini-flash-lite-latest" by default): tried
//   first on every call - fast, and has its own separate free-tier
//   quota pool from the full flash model, so it's less likely to
//   queue behind a flash-wide demand spike.
// - FALLBACK_MODEL ("gemini-flash-latest" by default): only called
//   when the primary model's result fails validation (see
//   containsUnexpectedScript() below) - not on every request, so the
//   common case stays cheap/fast and this only costs extra when the
//   lite model actually got it wrong.
//
// Why a fallback model, not just a better prompt: flash-lite was
// caught failing this specific task in THREE different ways while
// testing, even after rewording the prompt in between each one -
// echoing the entire original Japanese text back under the
// skillTextTh key (no translation at all) on a short card; splicing
// one random Korean word into an otherwise-correct Thai sentence on
// another; then doing the full-text echo again on a longer, more
// structurally complex card (multiple ability blocks + an untranslated
// card-specific proper noun, "ヴァルガ") even with the strengthened
// prompt in place. That pattern - a weaker instruction-follower
// getting worse specifically as the input gets longer/more complex -
// isn't something a prompt tweak reliably fixes, so rather than
// keep chasing new lite-model failure modes one at a time, any result
// that fails validation now gets one retry on the full model instead.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-latest";

// Free-tier Gemini occasionally answers a request with a transient
// 503 ("model is currently experiencing high demand... usually
// temporary") or 429 (rate limit) - Google's own error text says to
// just try again, so a couple of short, backed-off retries live here
// rather than making every viewer manually re-open the card a second
// time. Not retried for any other status (400/403/404/etc are real
// problems, not demand spikes - retrying those would just waste time).
// Applies separately to each model tier below (so a full attempt is
// up to 3 tries on the primary model, then up to 3 more on the
// fallback model, only if the primary one's result didn't validate).
const RETRYABLE_STATUSES = new Set([429, 503]);
const RETRY_DELAYS_MS = [1000, 3000]; // 2 retries: ~1s, then ~3s after that

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hiragana/katakana, the CJK ideograph block (kanji/hanzi), and Hangul
// (syllables + jamo) - none of these should ever appear in a finished
// Thai translation (loanwords are written in Thai script per the
// glossary, e.g. "แวนการ์ด" not "ヴァンガード"). If any show up in
// skillTextTh, the result is untrustworthy - whether that's the whole
// thing still being the original Japanese (a full echo), or just one
// contaminated foreign word spliced into an otherwise-fine Thai
// sentence. See the PRIMARY_MODEL comment above for the real examples
// of both failure shapes this caught.
const UNEXPECTED_SCRIPT_RE = /[぀-ヿ㐀-䶿一-鿿ᄀ-ᇿ㄀-㆟가-힯]/;

function containsUnexpectedScript(text) {
  return UNEXPECTED_SCRIPT_RE.test(text);
}

// Known-common Thai Vanguard community usage. Deliberately NOT a
// translate-everything list - most of these are left as English on
// purpose because that's what players actually call them.
const GLOSSARY = `
- Vanguard Circle / Vanguard = "แวนการ์ด" (ทับศัพท์ ไม่แปล)
- Rear-guard = "เรียร์การ์ด" (ทับศัพท์)
- Ride = "ไรด์" (ทับศัพท์, ไม่ใช้ "ขี่")
- Call / Incoming Call = "คอล" / "อินคัมมิ่งคอล" (ทับศัพท์)
- Intercept = "อินเตอร์เซ็ปต์" (ทับศัพท์)
- Drive Check = "ไดรฟ์เช็ค" (ทับศัพท์)
- Damage Check = "ดาเมจเช็ค" (ทับศัพท์)
- Trigger (Critical/Draw/Front/Heal/Stand) = "ทริกเกอร์" + ชื่อประเภททับศัพท์ เช่น "คริติคอลทริกเกอร์"
- Grade = "เกรด" (ทับศัพท์)
- Power / Shield = "เพาเวอร์" / "ชิลด์" (ทับศัพท์)
- Clan = "แคลน" (ทับศัพท์)
- Soul / Soul Blast = "โซล" / "โซลบลาสต์" (ทับศัพท์)
- Counter Blast = "เคาน์เตอร์บลาสต์" (ทับศัพท์)
- Persona Ride / Break Ride / Legion / G Zone / Stride = ทับศัพท์ทั้งหมด ไม่แปลชื่อกลไก
- "when it is placed" / "on your turn" ฯลฯ = แปลเป็นประโยคไทยธรรมชาติ ไม่ใช่แปลคำต่อคำ
- ชื่อเฉพาะของการ์ด/ตระกูลการ์ดที่ปรากฏในวงเล็บ 「...」 ภายใน skill text (เช่น 「ヴァルガ」) ให้ทับศัพท์เป็นอักษรไทยตามเสียงอ่านจริง (เช่น "วาร์กา") ห้ามปล่อยทิ้งไว้เป็นภาษาญี่ปุ่นเด็ดขาด แม้จะไม่มีอยู่ในรายการนี้ก็ตาม
`.trim();

const SYSTEM_PROMPT = `คุณกำลังแปลเนื้อความสกิล (skill text) ของการ์ดเกม Cardfight!! Vanguard จากภาษาญี่ปุ่นเป็นภาษาไทย สำหรับผู้เล่นชาวไทยที่เล่นเกมนี้จริง ไม่ใช่แปลสำหรับคนทั่วไป ห้ามแปลชื่อการ์ด - รับเฉพาะ skill text เท่านั้น

กติกาการแปล:
1. ชื่อกลไกของเกม (keyword) ให้ทับศัพท์ตามที่ชุมชนนักเล่นไทยใช้จริง ดูรายการอ้างอิงด้านล่าง ห้ามแปลคำเหล่านี้เป็นไทยตรงตัว
2. แปลให้อ่านลื่น เข้าใจง่าย ประโยคสั้นกระชับแบบที่อยู่ในการ์ดจริง ไม่ใช่แปลคำต่อคำแบบเครื่องแปล รักษาเครื่องหมาย/โครงสร้างเงื่อนไข (เช่น [COST]/[AUTO]/[CONT]) ไว้แบบเดิมถ้ามี
3. ห้ามเติมคำอธิบายเพิ่ม ห้ามใส่หมายเหตุ ตอบเฉพาะคำแปล
4. ห้ามคัดลอกข้อความภาษาญี่ปุ่นต้นฉบับมาใส่ในคำตอบโดยไม่แปลเด็ดขาด ไม่ว่า skill text จะยาวหรือซับซ้อนแค่ไหนก็ต้องแปลให้ครบทุกส่วน คำตอบ (skillTextTh) ต้องเป็นภาษาไทยทั้งหมด (ยกเว้นคำทับศัพท์ตามข้อ 1 และ 5 ซึ่งต้องเขียนด้วยอักษรไทย) ห้ามมีอักษรภาษาอื่นหลงเหลืออยู่เลยแม้แต่ตัวเดียว ไม่ว่าจะเป็นอักษรญี่ปุ่น (ฮิรางานะ/คาตากานะ/คันจิ) เกาหลี จีน หรือภาษาอื่นใด
5. ชื่อเฉพาะ/ชื่อตระกูลการ์ดที่อยู่ในวงเล็บ 「...」 ภายใน skill text ให้ทับศัพท์เป็นอักษรไทยด้วย (ดูตัวอย่างในรายการอ้างอิง) ห้ามปล่อยเป็นคาตากานะ/คันจิทิ้งไว้

คำศัพท์อ้างอิง (ใช้ตามนี้เป็นหลัก):
${GLOSSARY}

ตอบกลับเป็น JSON เท่านั้น รูปแบบ: {"skillTextTh": "..."} ไม่ต้องมีข้อความอื่นนอกเหนือจาก JSON ก้อนนี้`;

/**
 * Calls one specific Gemini model and returns a validated
 * { skillTextTh } - or throws (on an API error that exhausted its own
 * retries, a malformed response, or a result that fails the
 * unexpected-script check). Does NOT fall back to a different model
 * itself - translateCardTh() below is what tries PRIMARY_MODEL then
 * FALLBACK_MODEL.
 */
async function callGemini(model, apiKey, skillText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Plain Thai instruction with the text inlined, NOT a JSON blob like
  // `{"skillText": "..."}`. A weaker instruction-follower (the lite
  // model) was observed just mirroring that JSON shape back untouched
  // under the output key instead of translating it. Spelling the task
  // out in the user turn itself (in addition to the system
  // instruction) also helps, since lite models in general lean on the
  // system prompt less reliably than the full model.
  const userPrompt = `แปล skill text ภาษาญี่ปุ่นต่อไปนี้เป็นภาษาไทยตามกติกาที่กำหนดไว้ทั้งหมด (ห้ามคัดลอกข้อความญี่ปุ่นต้นฉบับมาใส่โดยไม่แปล ไม่ว่าข้อความจะยาวแค่ไหน และห้ามมีอักษรภาษาอื่นเจือปนในคำตอบแม้แต่คำเดียว) แล้วตอบกลับเป็น JSON {"skillTextTh": "คำแปลภาษาไทย"} เท่านั้น:\n\n${skillText}`;

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    if (res.ok) break;

    const lastErrorBody = await res.text().catch(() => "");
    const canRetry = RETRYABLE_STATUSES.has(res.status) && attempt < RETRY_DELAYS_MS.length;
    if (!canRetry) {
      throw new Error(`Gemini API error ${res.status} (model: ${model}): ${lastErrorBody.slice(0, 300)}`);
    }
    console.warn(
      `[translateCardTh] Gemini API ${res.status} (model: ${model}, attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}) - retrying in ${RETRY_DELAYS_MS[attempt]}ms`
    );
    await sleep(RETRY_DELAYS_MS[attempt]);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    // Most common cause: the prompt/response got blocked by a safety
    // filter, in which case candidates[0].finishReason explains why.
    const reason = data?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini API returned no text content (model: ${model})${reason ? ` (finishReason: ${reason})` : ""}.`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Model occasionally wraps JSON in a code fence despite instructions - one retry-free fallback.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Could not parse translation JSON from (model: ${model}): ${text.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  if (typeof parsed.skillTextTh !== "string") {
    throw new Error(`Translation response missing skillTextTh (model: ${model}): ${text.slice(0, 200)}`);
  }

  if (containsUnexpectedScript(parsed.skillTextTh)) {
    throw new Error(
      `Gemini (model: ${model}) returned a translation with unexpected non-Thai script in it: ${parsed.skillTextTh.slice(0, 200)}`
    );
  }

  return { skillTextTh: parsed.skillTextTh };
}

/**
 * Translates one card's skill text to Thai (name is intentionally
 * untouched - see header comment). Tries PRIMARY_MODEL first; if that
 * result doesn't pass validation (see callGemini/containsUnexpectedScript
 * above), retries once on FALLBACK_MODEL before giving up. Throws only
 * if both tiers fail (or the key is missing) - callers (routes/cards.js)
 * are expected to catch and just serve the card without a Thai
 * translation rather than fail the whole request.
 */
export async function translateCardTh({ skillText }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set - get a free key at https://aistudio.google.com/apikey and add it to server/.env to enable Thai card translation."
    );
  }

  try {
    return await callGemini(PRIMARY_MODEL, apiKey, skillText);
  } catch (primaryErr) {
    if (PRIMARY_MODEL === FALLBACK_MODEL) throw primaryErr;
    console.warn(
      `[translateCardTh] ${PRIMARY_MODEL} failed validation (${primaryErr.message.slice(0, 150)}) - retrying once with ${FALLBACK_MODEL}`
    );
    try {
      return await callGemini(FALLBACK_MODEL, apiKey, skillText);
    } catch (fallbackErr) {
      throw new Error(
        `Both models failed - ${PRIMARY_MODEL}: ${primaryErr.message} | ${FALLBACK_MODEL}: ${fallbackErr.message}`
      );
    }
  }
}
