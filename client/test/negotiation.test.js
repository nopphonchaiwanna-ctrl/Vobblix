import { test } from "node:test";
import assert from "node:assert/strict";
import { isPolite, offerCollision, shouldIgnoreAnswer } from "../src/webrtc/negotiation.js";

test("exactly one side of a pair is polite", () => {
  assert.equal(isPolite("aaa", "bbb"), true);
  assert.equal(isPolite("bbb", "aaa"), false);
});

test("no collision when stable and not mid-offer", () => {
  assert.deepEqual(offerCollision({ polite: false, makingOffer: false, signalingState: "stable" }), { collision: false, ignore: false });
});

test("impolite side ignores a colliding offer", () => {
  assert.deepEqual(offerCollision({ polite: false, makingOffer: false, signalingState: "have-local-offer" }), { collision: true, ignore: true });
  assert.deepEqual(offerCollision({ polite: false, makingOffer: true, signalingState: "stable" }), { collision: true, ignore: true });
});

test("polite side accepts a colliding offer (and must re-offer after)", () => {
  assert.deepEqual(offerCollision({ polite: true, makingOffer: false, signalingState: "have-local-offer" }), { collision: true, ignore: false });
});

test("an answer is only applied while an offer of ours is pending", () => {
  assert.equal(shouldIgnoreAnswer("have-local-offer"), false);
  assert.equal(shouldIgnoreAnswer("stable"), true);
});
