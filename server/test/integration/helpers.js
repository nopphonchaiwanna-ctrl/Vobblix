// Shared harness for the integration tests: a real server process
// against a dedicated, disposable Postgres database.
//
// Needs TEST_DATABASE_URL (shell env or server/.env) pointing at a
// database whose name contains "test" - every run DROPS ITS WHOLE public
// SCHEMA and re-applies migrations/. It refuses to touch DATABASE_URL's
// database (the Neon one) or any URL without "test" in the db name.

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { io as connectSocket } from "socket.io-client";
import { hashPassword } from "../../src/auth.js";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = path.join(SERVER_DIR, ".env");
// Parsed, not loaded into process.env - the child server must not
// inherit the real DATABASE_URL/SMTP/Gemini settings.
const fileEnv = existsSync(envFile) ? dotenv.parse(readFileSync(envFile)) : {};

export const TEST_PASSWORD = "Test1234!";

export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL || fileEnv.TEST_DATABASE_URL;
  if (!url) return null;
  const dbName = new URL(url).pathname.slice(1);
  if (!/test/i.test(dbName)) {
    throw new Error(`TEST_DATABASE_URL's database "${dbName}" must contain "test" - the tests wipe it.`);
  }
  const realUrl = process.env.DATABASE_URL || fileEnv.DATABASE_URL;
  if (realUrl && new URL(realUrl).host === new URL(url).host && new URL(realUrl).pathname === new URL(url).pathname) {
    throw new Error("TEST_DATABASE_URL points at the same database as DATABASE_URL - refusing to wipe it.");
  }
  return url;
}

/** For `test(..., { skip })` - a clear reason instead of a failure when no test DB is set up. */
export const SKIP_REASON = (() => {
  try {
    return testDatabaseUrl() ? false : "TEST_DATABASE_URL not set - see README's Testing section";
  } catch (err) {
    return err.message;
  }
})();

function sslFor(url) {
  return url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined;
}

export async function withDb(fn) {
  const url = testDatabaseUrl();
  const client = new pg.Client({ connectionString: url, ssl: sslFor(url) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Empty schema + every migration, exactly like a brand-new deploy. */
export async function resetDatabase() {
  await withDb((db) => db.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"));
  await run("node", ["scripts/migrate.js"], { DATABASE_URL: testDatabaseUrl() });
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: SERVER_DIR, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.on("exit", (code) => (code === 0 ? resolve(output) : reject(new Error(`${cmd} ${args.join(" ")} failed:\n${output}`))));
  });
}

/**
 * Starts src/index.js on a free-ish port. Rate limits are off unless
 * `rateLimits: true`. Returns { url, logs, waitForLog, stop }.
 */
export async function startServer({ rateLimits = false } = {}) {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const child = spawn("node", ["src/index.js"], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: "integration-test-secret",
      NODE_ENV: "test",
      RATE_LIMITS: rateLimits ? "on" : "off",
      CLIENT_URL: "http://localhost:5173",
      // Empty, not absent: dotenv only fills keys that aren't set at all,
      // so these keep server/.env's real SMTP/Gemini settings out.
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      GEMINI_API_KEY: "",
      CLOUDFLARE_TURN_KEY_ID: "",
      CLOUDFLARE_TURN_API_TOKEN: "",
      TURN_URLS: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (d) => (logs += d));
  child.stderr.on("data", (d) => (logs += d));

  const url = `http://localhost:${port}`;
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${url}/health`)).ok) break;
    } catch {
      // not listening yet
    }
    if (child.exitCode !== null || i > 100) throw new Error(`server didn't start:\n${logs}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  return {
    url,
    get logs() {
      return logs;
    },
    async waitForLog(regex, timeoutMs = 3000) {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const match = logs.match(regex);
        if (match) return match;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(`log line ${regex} never appeared:\n${logs}`);
    },
    stop() {
      // TEST_SERVER_LOGS=1 prints the server's whole output - for
      // chasing a 500 the test only sees as a status code.
      if (process.env.TEST_SERVER_LOGS) console.error(logs);
      return new Promise((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.on("exit", resolve);
        child.kill("SIGTERM");
      });
    },
  };
}

/** REST client bound to one server: api.post("/x", token, body) -> { status, body }. */
export function apiFor(server) {
  async function call(method, urlPath, token, body) {
    const res = await fetch(server.url + urlPath, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }
  return {
    get: (p, token) => call("GET", p, token),
    post: (p, token, body) => call("POST", p, token, body),
    patch: (p, token, body) => call("PATCH", p, token, body),
    delete: (p, token) => call("DELETE", p, token),
    async login(email, password = TEST_PASSWORD) {
      const r = await call("POST", "/auth/login", null, { email, password });
      if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.body)}`);
      return r.body.token;
    },
  };
}

/** Inserts a verified account directly (skips the email round trip). */
export async function createUser({ email, name = email.split("@")[0], role = "customer" }) {
  const hash = await hashPassword(TEST_PASSWORD);
  return withDb(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, display_name, role, email_verified_at)
       VALUES ($1, $2, $3, $4, now()) RETURNING id`,
      [email, hash, name, role]
    );
    return rows[0].id;
  });
}

/** Creates the account and logs it in: { id, token }. */
export async function createAndLogin(api, opts) {
  const id = await createUser(opts);
  return { id, token: await api.login(opts.email) };
}

/** Owner's shop, published by the given admin. */
export async function createPublishedShop(api, ownerToken, adminToken, code) {
  const r = await api.post("/shops", ownerToken, { code, name: `Shop ${code}` });
  if (r.status !== 201) throw new Error(`create shop: ${r.status} ${JSON.stringify(r.body)}`);
  await api.post(`/admin/shops/${r.body.shop.id}/approve`, adminToken);
  return r.body.shop;
}

/** Connected socket.io client (rejects with the handshake error). */
export function socketFor(server, token) {
  return new Promise((resolve, reject) => {
    const socket = connectSocket(server.url, { auth: { token }, transports: ["websocket"], reconnection: false });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => {
      socket.close();
      reject(err);
    });
  });
}

/** join-shop's ack for one code, on a throwaway connection. */
export async function joinShop(server, token, roomId) {
  const socket = await socketFor(server, token);
  try {
    return await new Promise((resolve) => socket.emit("join-shop", { roomId }, resolve));
  } finally {
    socket.close();
  }
}
