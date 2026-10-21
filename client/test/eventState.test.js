import { test } from "node:test";
import assert from "node:assert/strict";
import { eventSteps, playerAction, organizerActions, myMatch } from "../src/ui/events/state.js";

const baseEvent = {
  id: "e1",
  name: "Weekly",
  status: "registration",
  format: "swiss_only",
  configuredCutSize: null,
  effectiveCutSize: null,
  cutEnabled: null,
  currentPhase: "swiss",
  currentRound: 0,
  roundCount: null,
  registrationMode: "first_come",
  lotteryDrawnAt: null,
  maxPlayers: 4,
};
const view = (event, extra = {}) => ({
  event: { ...baseEvent, ...event },
  players: [],
  currentRoundMatches: [],
  inShopUserIds: [],
  ...extra,
});
const player = (id, userId, extra = {}) => ({
  id, userId, displayName: userId, dropped: false, entryStatus: "entered", waitlistPosition: null,
  checkInRequestedAt: null, checkedInAt: null, noShow: false, finalRank: null, finalLabel: null, ...extra,
});

test("eventSteps: Swiss done and Top X current during the bracket", () => {
  const steps = eventSteps({ ...baseEvent, status: "bracket", format: "swiss_cut", configuredCutSize: 8, effectiveCutSize: 4, cutEnabled: true, currentPhase: "bracket", currentRound: 1, roundCount: 3 });
  assert.deepEqual(steps.map((s) => [s.id, s.label, s.state]), [
    ["registration", "Register", "done"],
    ["check_in", "Check-in", "done"],
    ["swiss", "Swiss 3/3", "done"],
    ["bracket", "Top 4", "now"],
    ["completed", "Done", "todo"],
  ]);
});

test("eventSteps: no top-cut step for a Swiss-only event", () => {
  const steps = eventSteps({ ...baseEvent, status: "swiss", currentRound: 2, roundCount: 4 });
  assert.deepEqual(steps.map((s) => s.id), ["registration", "check_in", "swiss", "completed"]);
  assert.equal(steps[2].label, "Swiss 2/4");
  assert.equal(steps[2].state, "now");
});

test("playerAction covers each stage", () => {
  assert.equal(playerAction(view({}), "u1").kind, "register");
  assert.equal(playerAction(view({}, { players: [player("p1", "u1")] }), "u1").kind, "registered");
  assert.equal(playerAction(view({ registrationMode: "lottery" }, { players: [player("p1", "u1", { entryStatus: "pending_draw" })] }), "u1").kind, "pending_draw");
  const wl = playerAction(view({}, { players: [player("p1", "u1", { entryStatus: "waitlisted", waitlistPosition: 2 })] }), "u1");
  assert.deepEqual([wl.kind, wl.position], ["waitlisted", 2]);
  assert.equal(playerAction(view({ status: "check_in" }, { players: [player("p1", "u1")] }), "u1").kind, "check_in");
  assert.equal(playerAction(view({ status: "check_in" }, { players: [player("p1", "u1", { checkInRequestedAt: "t" })] }), "u1").kind, "awaiting_approval");
  assert.equal(playerAction(view({ status: "check_in" }, { players: [player("p1", "u1", { checkedInAt: "t" })] }), "u1").kind, "ready");

  const running = view(
    { status: "swiss", currentRound: 1, roundCount: 2 },
    {
      players: [player("p1", "u1"), player("p2", "u2"), player("p3", "u3")],
      currentRoundMatches: [
        { id: "m1", player1Id: "p1", player2Id: "p2", result: null, tableNumber: 3, tableOnline: false },
        { id: "m2", player1Id: "p3", player2Id: null, result: "bye", tableNumber: null, tableOnline: false },
      ],
    }
  );
  const m = playerAction(running, "u2");
  assert.equal(m.kind, "match");
  assert.equal(m.opponent.id, "p1");
  assert.equal(m.side, "player2");
  assert.equal(m.match.tableNumber, 3);
  assert.equal(playerAction(running, "u3").kind, "bye");
  assert.equal(playerAction(running, "someone-else").kind, "none");

  const out = view({ status: "bracket", currentPhase: "bracket", currentRound: 2 }, { players: [player("p1", "u1")], currentRoundMatches: [] });
  assert.equal(playerAction(out, "u1").kind, "eliminated");
  const done = playerAction(view({ status: "completed" }, { players: [player("p1", "u1", { finalRank: 1, finalLabel: "champion" })] }), "u1");
  assert.deepEqual([done.kind, done.finalRank], ["done", 1]);
});

test("organizerActions: lottery not drawn -> draw only (plus more)", () => {
  const ids = organizerActions(view({ registrationMode: "lottery" })).map((a) => a.id);
  assert.deepEqual(ids, ["draw", "more"]);
});

test("organizerActions: check-in shows auto check-in with the in-shop count and a start that needs 2", () => {
  const v = view(
    { status: "check_in" },
    { players: [player("p1", "u1", { checkedInAt: "t" }), player("p2", "u2")], inShopUserIds: ["u1", "u2"] }
  );
  const actions = organizerActions(v);
  const auto = actions.find((a) => a.id === "auto_check_in");
  assert.equal(auto.label, "Auto check-in (2 in shop)");
  const start = actions.find((a) => a.id === "start");
  assert.equal(start.label, "Start (1 checked in)");
  assert.equal(start.disabled, true);
});

test("organizerActions: running round offers notify and next round once results are in", () => {
  const v = view(
    { status: "swiss", currentRound: 1, roundCount: 2 },
    { currentRoundMatches: [{ id: "m1", player1Id: "a", player2Id: "b", result: null }] }
  );
  const next = organizerActions(v).find((a) => a.id === "next_round");
  assert.equal(next.disabled, true);
  assert.ok(organizerActions(v).some((a) => a.id === "notify_pairings"));
});

test("myMatch finds the user's current match", () => {
  const v = view({ status: "swiss" }, {
    players: [player("p1", "u1"), player("p2", "u2")],
    currentRoundMatches: [{ id: "m1", player1Id: "p1", player2Id: "p2" }],
  });
  assert.equal(myMatch(v, "u2").id, "m1");
  assert.equal(myMatch(v, "nobody"), null);
});
