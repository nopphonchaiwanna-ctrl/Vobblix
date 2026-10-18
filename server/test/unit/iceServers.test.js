import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getIceServers, resetIceServerCache } from "../../src/services/iceServers.js";

const ENV_KEYS = ["CLOUDFLARE_TURN_KEY_ID", "CLOUDFLARE_TURN_API_TOKEN", "TURN_URLS", "TURN_USERNAME", "TURN_CREDENTIAL"];
const realFetch = globalThis.fetch;
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
  resetIceServerCache();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
});

const turnOnly = (servers) => servers.filter((s) => s.username);

test("nothing configured: STUN only", async () => {
  const servers = await getIceServers();
  assert.equal(turnOnly(servers).length, 0);
  assert.ok(servers[0].urls.some((u) => u.startsWith("stun:")));
});

test("static TURN (e.g. coturn) from env", async () => {
  Object.assign(process.env, { TURN_URLS: "turn:turn.example.com:3478, turns:turn.example.com:5349", TURN_USERNAME: "u", TURN_CREDENTIAL: "p" });
  const [turn] = turnOnly(await getIceServers());
  assert.deepEqual(turn.urls, ["turn:turn.example.com:3478", "turns:turn.example.com:5349"]);
  assert.equal(turn.credential, "p");
});

test("Cloudflare: generated credentials, port 53 dropped, cached between calls", async () => {
  Object.assign(process.env, { CLOUDFLARE_TURN_KEY_ID: "key-1", CLOUDFLARE_TURN_API_TOKEN: "secret" });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        iceServers: [
          { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] },
          { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp"], username: "gen-user", credential: "gen-pass" },
        ],
      }),
      { status: 201 }
    );
  };
  const first = await getIceServers();
  const second = await getIceServers();
  assert.equal(calls.length, 1, "cached");
  assert.equal(calls[0].url, "https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate-ice-servers");
  assert.equal(calls[0].init.headers.Authorization, "Bearer secret");
  assert.deepEqual(first, second);
  const [turn] = turnOnly(first);
  assert.equal(turn.username, "gen-user");
  assert.ok(first.flatMap((s) => s.urls).every((u) => !/:53(\?|$)/.test(u)), "port 53 removed");
});

test("Cloudflare failure falls back to STUN instead of breaking calls", async () => {
  Object.assign(process.env, { CLOUDFLARE_TURN_KEY_ID: "key-1", CLOUDFLARE_TURN_API_TOKEN: "bad" });
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  const servers = await getIceServers();
  assert.equal(turnOnly(servers).length, 0);
  assert.ok(servers.length > 0);
});
