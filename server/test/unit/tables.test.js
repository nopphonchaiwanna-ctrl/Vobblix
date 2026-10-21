import { test } from "node:test";
import assert from "node:assert/strict";
import { assignTables } from "../../src/tournament/tables.js";

const pair = (a, b, seedPoints) => ({ player1Id: a, player2Id: b, seedPoints });

test("top pairs get the shop's tables, the rest go online", () => {
  const out = assignTables([pair("a", "b", 0), pair("c", "d", 6), pair("e", "f", 3), pair("g", "h", 9), pair("i", "j", 1)], 3);
  const byFirst = Object.fromEntries(out.map((p) => [p.player1Id, p]));
  assert.deepEqual([byFirst.g.tableNumber, byFirst.c.tableNumber, byFirst.e.tableNumber], [1, 2, 3]);
  assert.equal(byFirst.g.tableOnline, false);
  assert.equal(byFirst.e.tableOnline, false);
  assert.deepEqual([byFirst.i.tableNumber, byFirst.a.tableNumber], [4, 5]);
  assert.equal(byFirst.i.tableOnline, true);
  assert.equal(byFirst.a.tableOnline, true);
});

test("a bye has no table and doesn't use a number", () => {
  const out = assignTables([pair("a", null, 9), pair("b", "c", 0)], 4);
  assert.equal(out.find((p) => p.player1Id === "a").tableNumber, null);
  assert.equal(out.find((p) => p.player1Id === "b").tableNumber, 1);
});

test("equal points keep input order", () => {
  const out = assignTables([pair("a", "b", 0), pair("c", "d", 0), pair("e", "f", 0)], 2);
  assert.deepEqual(out.filter((p) => p.tableNumber).sort((x, y) => x.tableNumber - y.tableNumber).map((p) => p.player1Id), ["a", "c", "e"]);
});
