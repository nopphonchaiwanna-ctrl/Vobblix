// Plain HTTP calls to the server's REST endpoints (auth, shop-owner
// applications, admin review, owner shop/listings management, and the
// marketplace order threads). Kept separate from net/socket.js because
// these are one-shot request/response calls, not part of the realtime
// connection - see README's "Marketplace" section for the shapes these
// return.

import { SERVER_URL } from "./serverUrl.js";

async function request(path, { token, ...options } = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    // Some errors (e.g. logging in before verifying your email) need to
    // be told apart from a generic failure so the UI can react
    // differently (show a "resend verification" button, say) - see
    // routes/auth.js's EMAIL_NOT_VERIFIED code and main.js's login handler.
    if (body.code) err.code = body.code;
    throw err;
  }
  return body;
}

// ---------- Calls ----------

// STUN/TURN servers for RTCPeerConnection (server/src/services/iceServers.js).
export function getIceServers(token) {
  return request("/webrtc/ice-servers", { token });
}

// ---------- Account ----------

export function register({ email, password, displayName }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
}

export function login({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ---------- Email verification & password reset ----------

export function verifyEmail(token) {
  return request("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}

export function resendVerification(email) {
  return request("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export function forgotPassword(email) {
  return request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(token, newPassword) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export function me(token) {
  return request("/auth/me", { token });
}

// ---------- Account settings ----------

export function updateProfile(token, fields) {
  return request("/auth/me", { method: "PATCH", token, body: JSON.stringify(fields) });
}

export function changePassword(token, currentPassword, newPassword) {
  return request("/account/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function requestAccountDeletion(token, reason) {
  return request("/account/delete-request", { method: "POST", token, body: JSON.stringify({ reason }) });
}

export function myDeletionRequest(token) {
  return request("/account/delete-request/me", { token });
}

// ---------- Chat block list ----------

export function blockUser(token, userId) {
  return request("/account/block", { method: "POST", token, body: JSON.stringify({ userId }) });
}

export function unblockUser(token, userId) {
  return request("/account/unblock", { method: "POST", token, body: JSON.stringify({ userId }) });
}

export function listBlockedUsers(token) {
  return request("/account/blocked", { token });
}

// ---------- Becoming a shop owner ----------

export function applyForOwner(token, message) {
  return request("/owner-applications", { method: "POST", token, body: JSON.stringify({ message }) });
}

export function myApplication(token) {
  return request("/owner-applications/me", { token });
}

// ---------- Shops (owner-facing + public) ----------

export function shopTemplates() {
  return request("/shops/templates");
}

export function publicShops() {
  return request("/shops/public");
}

export function myShop(token) {
  return request("/shops/mine", { token });
}

export function createShop(token, fields) {
  return request("/shops", { method: "POST", token, body: JSON.stringify(fields) });
}

export function updateShop(token, shopId, fields) {
  return request(`/shops/${shopId}`, { method: "PATCH", token, body: JSON.stringify(fields) });
}

export function shopListings(shopId) {
  return request(`/shops/${shopId}/listings`);
}

export function createListing(token, shopId, fields) {
  return request(`/shops/${shopId}/listings`, { method: "POST", token, body: JSON.stringify(fields) });
}

export function updateListing(token, shopId, listingId, fields) {
  return request(`/shops/${shopId}/listings/${listingId}`, { method: "PATCH", token, body: JSON.stringify(fields) });
}

// ---------- Orders (buy/sell threads) ----------

export function myOrders(token) {
  return request("/orders/mine", { token });
}

export function createOrder(token, fields) {
  return request("/orders", { method: "POST", token, body: JSON.stringify(fields) });
}

export function getOrder(token, orderId) {
  return request(`/orders/${orderId}`, { token });
}

export function postOrderMessage(token, orderId, text) {
  return request(`/orders/${orderId}/messages`, { method: "POST", token, body: JSON.stringify({ text }) });
}

export function setOrderStatus(token, orderId, status) {
  return request(`/orders/${orderId}/status`, { method: "POST", token, body: JSON.stringify({ status }) });
}

// ---------- Admin ----------

export function adminListApplications(token, status = "pending") {
  return request(`/admin/owner-applications?status=${status}`, { token });
}

export function adminApproveApplication(token, id) {
  return request(`/admin/owner-applications/${id}/approve`, { method: "POST", token });
}

export function adminRejectApplication(token, id, reason) {
  return request(`/admin/owner-applications/${id}/reject`, { method: "POST", token, body: JSON.stringify({ reason }) });
}

// Persisted topbar-bell notifications (server/src/routes/notifications.js).
export function listNotifications(token) {
  return request("/notifications", { token });
}

export function markNotificationsRead(token) {
  return request("/notifications/read-all", { token, method: "POST" });
}

// Admin panel's Review history tab - every submit/resubmit/publish/reject.
export function adminListShopReviews(token) {
  return request("/admin/shop-reviews", { token });
}

// Account deletion requests - approve anonymizes the account (see
// server/src/db/accountDeletion.js), decline needs a reason.
export function adminListDeletionRequests(token) {
  return request("/admin/deletion-requests", { token });
}

export function adminGetDeletionRequest(token, id) {
  return request(`/admin/deletion-requests/${id}`, { token });
}

export function adminApproveDeletionRequest(token, id) {
  return request(`/admin/deletion-requests/${id}/approve`, { method: "POST", token });
}

export function adminDeclineDeletionRequest(token, id, reason) {
  return request(`/admin/deletion-requests/${id}/decline`, { method: "POST", token, body: JSON.stringify({ reason }) });
}

// One shop from that tab: { shop, events } (events oldest first).
export function adminGetShopReviews(token, shopId) {
  return request(`/admin/shops/${shopId}/reviews`, { token });
}

export function adminListShops(token, status = "pending_review") {
  return request(`/admin/shops?status=${status}`, { token });
}

export function adminApproveShop(token, id) {
  return request(`/admin/shops/${id}/approve`, { method: "POST", token });
}

export function adminRejectShop(token, id, reason) {
  return request(`/admin/shops/${id}/reject`, { method: "POST", token, body: JSON.stringify({ reason }) });
}

// Admin-created "central" shops - separate from the review queue above
// (adminListShops/adminApproveShop/adminRejectShop), these publish
// immediately and aren't capped at one per admin - see
// server/src/routes/admin.js's /admin/central-shops.
export function adminListCentralShops(token) {
  return request("/admin/central-shops", { token });
}

export function adminCreateCentralShop(token, fields) {
  return request("/admin/central-shops", { method: "POST", token, body: JSON.stringify(fields) });
}

// ---------- Tournament/event system ----------

export function createEvent(token, fields) {
  return request("/events", { method: "POST", token, body: JSON.stringify(fields) });
}

export function listEventsByShop(token, shopId) {
  return request(`/events/by-shop/${shopId}`, { token });
}

/** The lobby's list: { events } across published shops. Empty filters are left out. */
export function upcomingEvents(token, { q = "", game = "", when = "" } = {}) {
  const params = new URLSearchParams(Object.entries({ q, game, when }).filter(([, v]) => v));
  const qs = params.toString();
  return request(`/events/upcoming${qs ? `?${qs}` : ""}`, { token });
}

/** The caller's own finished events, round by round: { events }. */
export function getMatchHistory(token) {
  return request("/events/history", { token });
}

export function getEvent(token, eventId) {
  return request(`/events/${eventId}`, { token });
}

export function registerForEvent(token, eventId) {
  return request(`/events/${eventId}/register`, { method: "POST", token });
}

export function dropFromEvent(token, eventId, playerId) {
  return request(`/events/${eventId}/drop`, {
    method: "POST",
    token,
    body: JSON.stringify(playerId ? { playerId } : {}),
  });
}

export function startEvent(token, eventId) {
  return request(`/events/${eventId}/start`, { method: "POST", token });
}

export function reportMatchResult(token, eventId, matchId, claim) {
  return request(`/events/${eventId}/matches/${matchId}/report`, {
    method: "POST",
    token,
    body: JSON.stringify({ claim }),
  });
}

export function overrideMatchResult(token, eventId, matchId, result) {
  return request(`/events/${eventId}/matches/${matchId}/override`, {
    method: "POST",
    token,
    body: JSON.stringify({ result }),
  });
}

export function updateEvent(token, eventId, fields) {
  return request(`/events/${eventId}`, { method: "PATCH", token, body: JSON.stringify(fields) });
}

export function cancelEvent(token, eventId) {
  return request(`/events/${eventId}/cancel`, { method: "POST", token });
}

export function advanceEvent(token, eventId) {
  return request(`/events/${eventId}/advance`, { method: "POST", token });
}

// ---------- Deck system (Decklog deck-code import - server/src/services/decklogImport.js) ----------

export function listDecks(token) {
  return request("/decks", { token });
}

export function getDeck(token, deckId) {
  return request(`/decks/${deckId}`, { token });
}

export function importDeck(token, { deckCode, sourceLocale }) {
  return request("/decks/import", { method: "POST", token, body: JSON.stringify({ deckCode, sourceLocale }) });
}

export function deleteDeck(token, deckId) {
  return request(`/decks/${deckId}`, { method: "DELETE", token });
}

// ---------- Event decks + G3 stats (deck-stats design) ----------

/** body: { deckId } or { code, sourceLocale } -> { myDeck } */
export function submitEventDeck(token, eventId, body) {
  return request(`/events/${eventId}/deck`, { method: "PUT", token, body: JSON.stringify(body) });
}

export function withdrawEventDeck(token, eventId) {
  return request(`/events/${eventId}/deck`, { method: "DELETE", token });
}

/** Staff only: { playerName, deck } */
export function getEventPlayerDeck(token, eventId, playerId) {
  return request(`/events/${eventId}/decks/${playerId}`, { token });
}

export function getEventDeckStats(token, eventId) {
  return request(`/events/${eventId}/deck-stats`, { token });
}

export function getAdminDeckStats(token, { from = "", to = "" } = {}) {
  const params = new URLSearchParams(Object.entries({ from, to }).filter(([, v]) => v));
  const qs = params.toString();
  return request(`/admin/deck-stats${qs ? `?${qs}` : ""}`, { token });
}

// ---------- Event alerts (Web Push) ----------

export function getPushKey(token) {
  return request("/notifications/push-key", { token });
}

export function savePushSubscription(token, subscription) {
  return request("/notifications/push-subscriptions", { method: "POST", token, body: JSON.stringify(subscription) });
}

export function setEventPushConsent(token, eventId, granted) {
  return request(`/events/${eventId}/push-consent`, { method: "PUT", token, body: JSON.stringify({ granted }) });
}

// ---------- Event day: entry, check-in, alerts, staff ----------

const post = (path, token, body) => request(path, { method: "POST", token, body: body === undefined ? undefined : JSON.stringify(body) });

export const runEventDraw = (token, eventId) => post(`/events/${eventId}/draw`, token);
export const openEventCheckIn = (token, eventId) => post(`/events/${eventId}/check-in/open`, token);
export const requestEventCheckIn = (token, eventId) => post(`/events/${eventId}/check-in`, token);
export const approveEventCheckIn = (token, eventId, playerId) => post(`/events/${eventId}/check-in/approve`, token, { playerId });
export const autoEventCheckIn = (token, eventId) => post(`/events/${eventId}/check-in/auto`, token);
export const notifyEventPairings = (token, eventId) => post(`/events/${eventId}/notify-pairings`, token);

export const searchEventStaff = (token, eventId, q) => request(`/events/${eventId}/staff/search?q=${encodeURIComponent(q)}`, { token });
export const addEventJudge = (token, eventId, userId) => post(`/events/${eventId}/judges`, token, { userId });
export const removeEventJudge = (token, eventId, userId) => request(`/events/${eventId}/judges/${userId}`, { method: "DELETE", token });

export const callEventJudge = (token, eventId, matchId) => post(`/events/${eventId}/matches/${matchId}/call-judge`, token);
export const claimJudgeCall = (token, eventId, callId) => post(`/events/${eventId}/judge-calls/${callId}/claim`, token);
export const resolveJudgeCall = (token, eventId, callId) => post(`/events/${eventId}/judge-calls/${callId}/resolve`, token);

export const issuePenalty = (token, eventId, fields) => post(`/events/${eventId}/penalties`, token, fields);
export const decidePenalty = (token, eventId, penaltyId, decision) => post(`/events/${eventId}/penalties/${penaltyId}/${decision}`, token);
