import { test } from "node:test";
import assert from "node:assert/strict";
import { entryStatusOnRegister, drawLottery, nextFromWaitlist, startingRoster } from "../../src/tournament/entry.js";

test("first come: entered below the cap, waitlisted at it", () => {
  assert.equal(entryStatusOnRegister({ mode: "first_come", maxPlayers: 4, enteredCount: 3, lotteryDrawn: false }), "entered");
  assert.equal(entryStatusOnRegister({ mode: "first_come", maxPlayers: 4, enteredCount: 4, lotteryDrawn: false }), "waitlisted");
});

test("lottery: pending before the draw, waitlisted after", () => {
  assert.equal(entryStatusOnRegister({ mode: "lottery", maxPlayers: 4, enteredCount: 0, lotteryDrawn: false }), "pending_draw");
  assert.equal(entryStatusOnRegister({ mode: "lottery", maxPlayers: 4, enteredCount: 2, lotteryDrawn: true }), "waitlisted");
});

function seq(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test("drawLottery picks maxPlayers and queues the rest, everyone exactly once", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const { entered, waitlisted } = drawLottery(ids, 4, seq([0.9, 0.1, 0.5, 0.3, 0.7, 0.2]));
  assert.equal(entered.length, 4);
  assert.equal(waitlisted.length, 2);
  assert.deepEqual([...entered, ...waitlisted].sort(), ids);
});

test("drawLottery with fewer applicants than spots enters everyone", () => {
  const { entered, waitlisted } = drawLottery(["a", "b"], 4);
  assert.deepEqual(entered.sort(), ["a", "b"]);
  assert.deepEqual(waitlisted, []);
});

test("nextFromWaitlist is the lowest position still in", () => {
  assert.equal(
    nextFromWaitlist([
      { id: "x", waitlistPosition: 2, dropped: false },
      { id: "y", waitlistPosition: 1, dropped: true },
      { id: "z", waitlistPosition: 3, dropped: false },
    ]),
    "x"
  );
  assert.equal(nextFromWaitlist([]), null);
});

test("startingRoster fills no-show spots from the approved waitlist in queue order", () => {
  const entered = [
    ...["e1", "e2", "e3", "e4", "e5"].map((id) => ({ id, approved: true, dropped: false })),
    ...["n1", "n2", "n3"].map((id) => ({ id, approved: false, dropped: false })),
  ];
  const waitlisted = [
    { id: "w4", approved: true, dropped: false, waitlistPosition: 4 },
    { id: "w1", approved: true, dropped: false, waitlistPosition: 1 },
    { id: "w3", approved: true, dropped: false, waitlistPosition: 3 },
    { id: "w2", approved: true, dropped: false, waitlistPosition: 2 },
  ];
  const { starters, noShows } = startingRoster({ entered, waitlisted, maxPlayers: 8 });
  assert.deepEqual(starters, ["e1", "e2", "e3", "e4", "e5", "w1", "w2", "w3"]);
  assert.deepEqual(noShows.sort(), ["n1", "n2", "n3"]);
});

test("fill never exceeds max and keeps queue order; unapproved waitlisters are skipped", () => {
  const entered = [{ id: "e1", approved: true, dropped: false }];
  const waitlisted = [
    { id: "w2", approved: true, dropped: false, waitlistPosition: 2 },
    { id: "w1", approved: false, dropped: false, waitlistPosition: 1 },
    { id: "w3", approved: true, dropped: false, waitlistPosition: 3 },
  ];
  const { starters } = startingRoster({ entered, waitlisted, maxPlayers: 2 });
  assert.deepEqual(starters, ["e1", "w2"]);
});

test("dropped players never start", () => {
  const { starters, noShows } = startingRoster({
    entered: [{ id: "e1", approved: true, dropped: true }, { id: "e2", approved: true, dropped: false }],
    waitlisted: [{ id: "w1", approved: true, dropped: true, waitlistPosition: 1 }],
    maxPlayers: 4,
  });
  assert.deepEqual(starters, ["e2"]);
  assert.deepEqual(noShows, []);
});
