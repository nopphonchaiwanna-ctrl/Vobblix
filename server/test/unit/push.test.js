import { test } from "node:test";
import assert from "node:assert/strict";
import { createPushService } from "../../src/services/push.js";

const vapid = { publicKey: "pub", privateKey: "priv", subject: "mailto:x@example.com" };

function fakeStore({ consent = {} } = {}) {
  const subs = [{ endpoint: "https://push/1", p256dh: "k", auth: "a", user_id: "u1" }];
  return {
    subs,
    listSubscriptions: async (userId) => subs.filter((s) => s.user_id === userId),
    deleteSubscription: async (endpoint) => {
      const i = subs.findIndex((s) => s.endpoint === endpoint);
      if (i >= 0) subs.splice(i, 1);
    },
    hasConsent: async (eventId, userId) => !!consent[`${eventId}:${userId}`],
  };
}

test("no consent for the event -> nothing is sent", async () => {
  const sent = [];
  const push = createPushService({ vapid, store: fakeStore(), sender: async (...a) => sent.push(a) });
  await push.sendToUser("u1", { title: "t", body: "b", url: "/x" }, { eventId: "e1" });
  assert.equal(sent.length, 0);
});

test("consent for the event -> sent to each subscription", async () => {
  const sent = [];
  const push = createPushService({ vapid, store: fakeStore({ consent: { "e1:u1": true } }), sender: async (sub, payload) => sent.push([sub, payload]) });
  await push.sendToUser("u1", { title: "t", body: "b", url: "/x" }, { eventId: "e1" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0].endpoint, "https://push/1");
  assert.deepEqual(JSON.parse(sent[0][1]), { title: "t", body: "b", url: "/x" });
});

test("a gone subscription (410) is deleted", async () => {
  const store = fakeStore({ consent: { "e1:u1": true } });
  const push = createPushService({
    vapid,
    store,
    sender: async () => {
      const err = new Error("gone");
      err.statusCode = 410;
      throw err;
    },
  });
  await push.sendToUser("u1", { title: "t", body: "b", url: "/x" }, { eventId: "e1" });
  assert.equal(store.subs.length, 0);
});

test("without VAPID keys push is off and never throws", async () => {
  const sent = [];
  const push = createPushService({ vapid: { publicKey: "", privateKey: "", subject: "" }, store: fakeStore({ consent: { "e1:u1": true } }), sender: async (...a) => sent.push(a) });
  assert.equal(push.enabled, false);
  assert.equal(push.publicKey, null);
  await push.sendToUser("u1", { title: "t", body: "b", url: "/x" }, { eventId: "e1" });
  assert.equal(sent.length, 0);
});

import { isAllowedPushEndpoint } from "../../src/services/push.js";

test("only real browser push services are accepted as endpoints", () => {
  for (const ok of [
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QGxyz",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ]) assert.equal(isAllowedPushEndpoint(ok), true, ok);
  for (const bad of [
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://10.0.0.5/x",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example/x",
    "https://evil.example/fcm.googleapis.com",
    "not a url",
  ]) assert.equal(isAllowedPushEndpoint(bad), false, bad);
});

test("each send has a timeout so a slow push service can't hang anything", async () => {
  let options = null;
  const push = createPushService({ vapid, store: fakeStore({ consent: { "e1:u1": true } }), sender: async (_s, _p, o) => (options = o) });
  await push.sendToUser("u1", { title: "t", body: "b", url: "/x" }, { eventId: "e1" });
  assert.ok(options.timeout > 0 && options.timeout <= 10000);
});
