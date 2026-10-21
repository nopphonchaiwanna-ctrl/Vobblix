import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldPlayPeerMedia } from "../src/webrtc/speakers.js";

test("no lock on the table: everyone is heard", () => {
  assert.equal(shouldPlayPeerMedia({ peerUserId: "x", speakerUserIds: null }), true);
});

test("a speaker at a match table is heard", () => {
  assert.equal(shouldPlayPeerMedia({ peerUserId: "p1", speakerUserIds: new Set(["p1", "p2"]) }), true);
});

test("anyone else at a match table is muted on our side, even with a forged client", () => {
  assert.equal(shouldPlayPeerMedia({ peerUserId: "spectator", speakerUserIds: new Set(["p1", "p2"]) }), false);
  assert.equal(shouldPlayPeerMedia({ peerUserId: undefined, speakerUserIds: new Set(["p1"]) }), false);
});
