// ICE servers for the table calls' RTCPeerConnections (client/src/webrtc/
// callManager.js asks GET /webrtc/ice-servers when joining a call).
//
// STUN alone lets most peers connect directly, but players behind
// strict/symmetric NAT (common on Thai mobile networks) need a TURN relay.
// Three setups, first one configured wins:
//   1. Cloudflare Realtime TURN - CLOUDFLARE_TURN_KEY_ID +
//      CLOUDFLARE_TURN_API_TOKEN. Short-lived credentials are generated
//      server-side (the API token is a long-term secret that must never
//      reach the browser) and cached here, so one Cloudflare call serves
//      every player for hours. Docs:
//      https://developers.cloudflare.com/realtime/turn/generate-credentials/
//   2. Any other TURN server (e.g. self-hosted coturn) - TURN_URLS
//      (comma-separated) + TURN_USERNAME + TURN_CREDENTIAL.
//   3. Neither: public STUN only, same as before TURN existed.
// A failing Cloudflare request falls back to STUN rather than failing
// the call.

const STUN_ONLY = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

const CREDENTIAL_TTL_SECONDS = 24 * 60 * 60;
// Hand out cached credentials only while they have well over a call's
// length left; refresh after half their lifetime.
const REFRESH_AFTER_MS = (CREDENTIAL_TTL_SECONDS / 2) * 1000;

let cached = null; // { iceServers, fetchedAt }

export async function getIceServers() {
  const { CLOUDFLARE_TURN_KEY_ID: keyId, CLOUDFLARE_TURN_API_TOKEN: apiToken } = process.env;
  if (keyId && apiToken) {
    if (cached && Date.now() - cached.fetchedAt < REFRESH_AFTER_MS) return cached.iceServers;
    try {
      const iceServers = await fetchCloudflareIceServers(keyId, apiToken);
      cached = { iceServers, fetchedAt: Date.now() };
      return iceServers;
    } catch (err) {
      console.error("[ice] Cloudflare TURN credentials failed, falling back:", err.message);
      // Older-but-unexpired credentials beat no TURN at all.
      return cached?.iceServers || STUN_ONLY;
    }
  }

  if (process.env.TURN_URLS) {
    return [
      ...STUN_ONLY,
      {
        urls: process.env.TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean),
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
    ];
  }

  return STUN_ONLY;
}

async function fetchCloudflareIceServers(keyId, apiToken) {
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.iceServers)) throw new Error("no iceServers in response");
  // Cloudflare's docs: port-53 URLs often time out in browsers.
  return body.iceServers.map((server) => ({
    ...server,
    urls: [].concat(server.urls).filter((url) => !/:53(\?|$)/.test(url)),
  }));
}

/** Test hook: forget cached credentials. */
export function resetIceServerCache() {
  cached = null;
}
