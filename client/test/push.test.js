import { test } from "node:test";
import assert from "node:assert/strict";
import { needsHomeScreenForPush } from "../src/net/push.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const IPAD_DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const MAC_SAFARI = IPAD_DESKTOP_UA;

test("iPhone Safari outside the home screen needs to be added first", () => {
  assert.equal(needsHomeScreenForPush({ userAgent: IPHONE, standalone: false, maxTouchPoints: 5 }), true);
});

test("iPhone opened from the home screen can get push", () => {
  assert.equal(needsHomeScreenForPush({ userAgent: IPHONE, standalone: true, maxTouchPoints: 5 }), false);
});

test("Android Chrome can get push in the browser", () => {
  assert.equal(needsHomeScreenForPush({ userAgent: ANDROID, standalone: false, maxTouchPoints: 5 }), false);
});

test("an iPad (desktop-style UA, but touch) needs the home screen too", () => {
  assert.equal(needsHomeScreenForPush({ userAgent: IPAD_DESKTOP_UA, standalone: false, maxTouchPoints: 5 }), true);
});

test("a real Mac (no touch) doesn't", () => {
  assert.equal(needsHomeScreenForPush({ userAgent: MAC_SAFARI, standalone: false, maxTouchPoints: 0 }), false);
});
