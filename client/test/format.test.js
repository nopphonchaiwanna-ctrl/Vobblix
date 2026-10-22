import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/ui/format.js";

test("escapeHtml is safe in text and in quoted attributes", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(42), "42");
});
