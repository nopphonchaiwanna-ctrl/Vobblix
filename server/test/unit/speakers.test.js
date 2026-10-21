import { test } from "node:test";
import assert from "node:assert/strict";
import { speakerUserIds, callAdmission } from "../../src/tournament/speakers.js";

test("speakers are the match's two players plus event staff", () => {
  const s = speakerUserIds({ playerUserIds: ["p1", "p2"], staffUserIds: ["owner", "judge"] });
  assert.deepEqual([...s].sort(), ["judge", "owner", "p1", "p2"]);
});

test("a bye's missing second player isn't a speaker", () => {
  const s = speakerUserIds({ playerUserIds: ["p1", null], staffUserIds: [] });
  assert.deepEqual([...s], ["p1"]);
});

test("the 9th spectator is refused while a player still gets in", () => {
  assert.deepEqual(callAdmission({ kind: "spectator", total: 8, spectators: 8 }), { ok: false, reason: "spectators-full" });
  assert.deepEqual(callAdmission({ kind: "player", total: 9, spectators: 8 }), { ok: true });
});

test("non-staff stop at 10; staff can join up to 12", () => {
  assert.deepEqual(callAdmission({ kind: "spectator", total: 10, spectators: 7 }), { ok: false, reason: "voice-full" });
  assert.deepEqual(callAdmission({ kind: "staff", total: 11, spectators: 8 }), { ok: true });
  assert.deepEqual(callAdmission({ kind: "staff", total: 12, spectators: 8 }), { ok: false, reason: "voice-full" });
  assert.deepEqual(callAdmission({ kind: "player", total: 12, spectators: 8 }), { ok: false, reason: "voice-full" });
});
