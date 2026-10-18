// In dev, the server runs on :3001 while Vite serves the client on :5173.
// A deployed build must be built with VITE_SERVER_URL set to the server's
// public URL (Cloudflare Pages env var - see docs/deploy.md); without it
// the client would look for a server on its own host at :3001. Shared by
// the socket connection and the plain HTTP calls so they always agree.
const configured = import.meta.env.VITE_SERVER_URL;

if (import.meta.env.PROD && !configured) {
  console.error("[vobblix] VITE_SERVER_URL was not set for this build - API and socket calls will fail. See docs/deploy.md.");
}

export const SERVER_URL = (configured || `http://${location.hostname}:3001`).replace(/\/+$/, "");
