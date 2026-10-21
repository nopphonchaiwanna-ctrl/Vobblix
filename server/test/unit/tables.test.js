import { test } from "node:test";
import assert from "node:assert/strict";
import { assignTables } from "../../src/tournament/tables.js";

const pair = (a, b, seedPoints) => ({ player1Id: a, player2Id: b, seedPoints });

test("every pair gets an online table, top points first", () => {
  const out = assignTables([pair("a", "b", 0), pair("c", "d", 6), pair("e", "f", 3), pair("g", "h", 9), pair("i", "j", 1)]);
  const byFirst = Object.fromEntries(out.map((p) => [p.player1Id, p]));
  assert.deepEqual(["g", "c", "e", "i", "a"].map((id) => byFirst[id].tableNumber), [1, 2, 3, 4, 5]);
  assert.ok(out.every((p) => p.tableOnline === true));
});

test("a bye has no table and doesn't use a number", () => {
  const out = assignTables([pair("a", null, 9), pair("b", "c", 0)]);
  const bye = out.find((p) => p.player1Id === "a");
  assert.equal(bye.tableNumber, null);
  assert.equal(bye.tableOnline, false);
  assert.equal(out.find((p) => p.player1Id === "b").tableNumber, 1);
});

test("equal points keep input order", () => {
  const out = assignTables([pair("a", "b", 0), pair("c", "d", 0), pair("e", "f", 0)]);
  assert.deepEqual(out.filter((p) => p.tableNumber).sort((x, y) => x.tableNumber - y.tableNumber).map((p) => p.player1Id), ["a", "c", "e"]);
});
