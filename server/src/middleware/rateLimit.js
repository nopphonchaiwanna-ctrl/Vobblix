// REST rate limits (express-rate-limit, in-memory store - fine for the
// single Node process this app runs as; a second instance would need a
// shared store like Redis). Tighter limits sit on the routes that cost
// something per call: password guesses, outgoing email, Gemini quota,
// and requests to Bushiroad's Decklog. Socket events have their own
// limiter below - express middleware never sees them.

import { rateLimit, ipKeyGenerator } from "express-rate-limit";

// RATE_LIMITS=off turns every limit off - for the integration tests,
// which log in many accounts from one IP. Ignored in production.
const LIMITS_OFF = process.env.RATE_LIMITS === "off" && process.env.NODE_ENV !== "production";

function limiter({ windowMs, limit, message, byUser = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Same JSON shape as every other error response, so the client's
    // request() helper shows `error` like any other failure.
    message: { error: message, code: "RATE_LIMITED" },
    skip: () => LIMITS_OFF,
    // Per-account where the route is behind requireAuth (several people
    // behind one NAT/carrier IP shouldn't share a budget), per-IP before
    // login. ipKeyGenerator groups IPv6 addresses by /56 subnet.
    keyGenerator: (req) => (byUser && req.auth?.userId ? `user:${req.auth.userId}` : ipKeyGenerator(req.ip)),
  });
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Every REST route - a ceiling for scripted abuse, far above normal use. */
export const apiLimiter = limiter({
  windowMs: MINUTE,
  limit: 300,
  message: "Too many requests - slow down and try again in a minute.",
});

/** POST /auth/login - password guessing. */
export const loginLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: "Too many login attempts - try again in 15 minutes.",
});

/** POST /auth/register - mass account creation (each one sends an email). */
export const registerLimiter = limiter({
  windowMs: HOUR,
  limit: 5,
  message: "Too many accounts created from this network - try again later.",
});

/** Routes that send an email: resend-verification, forgot-password. */
export const emailLimiter = limiter({
  windowMs: HOUR,
  limit: 5,
  message: "Too many emails requested - try again in an hour.",
});

/** GET /cards/:cardNumber - may call Gemini for an untranslated card. */
export const cardLimiter = limiter({
  windowMs: MINUTE,
  limit: 60,
  byUser: true,
  message: "Too many card lookups - wait a minute and try again.",
});

/** POST /decks/import - each one fetches from Bushiroad's Decklog. */
export const deckImportLimiter = limiter({
  windowMs: 10 * MINUTE,
  limit: 10,
  byUser: true,
  message: "Too many deck imports - try again in a few minutes.",
});

/**
 * Per-socket fixed-window counter for socket events (chat, movement).
 * Returns a function that answers "is this event allowed?"; state lives
 * on the closure, so it's dropped with the socket.
 */
export function socketEventLimiter({ windowMs, limit }) {
  if (LIMITS_OFF) return () => true;
  let windowStart = 0;
  let count = 0;
  return () => {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      count = 0;
    }
    count += 1;
    return count <= limit;
  };
}
