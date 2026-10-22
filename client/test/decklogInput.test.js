import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDecklogInput } from "../src/ui/decklogInput.js";

test("parseDecklogInput: each Decklog site's link names its site", () => {
  assert.deepEqual(parseDecklogInput("https://decklog-en.bushiroad.com/view/ABC12"), { code: "ABC12", sourceLocale: "decklog_en" });
  assert.deepEqual(parseDecklogInput("https://decklog-en.bushiroad.com/ja/view/ABC12"), { code: "ABC12", sourceLocale: "decklog_en_ja" });
  assert.deepEqual(parseDecklogInput("https://decklog.bushiroad.com/view/XYZ9"), { code: "XYZ9", sourceLocale: "decklog_jp" });
});

test("parseDecklogInput: a bare code keeps no site, whitespace trimmed", () => {
  assert.deepEqual(parseDecklogInput("  ABC12  "), { code: "ABC12", sourceLocale: null });
  assert.deepEqual(parseDecklogInput(""), { code: "", sourceLocale: null });
});
