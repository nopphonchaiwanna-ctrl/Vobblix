// Event alerts (event-day design §2.4): asked once per event - when a
// player checks in, when an organizer opens check-in, when a judge first
// opens the event. "Yes" registers the service worker (public/sw.js),
// subscribes this device to Web Push and tells the server; "No" is
// remembered too, so we don't ask again for that event.
//
// iPhone/iPad only get Web Push from a site added to the home screen, so
// there the dialog explains how before asking.

/**
 * iOS/iPadOS Safari that isn't running from the home screen. iPads ask
 * for the desktop site, so a "Macintosh" UA with touch counts as iPad.
 */
export function needsHomeScreenForPush({ userAgent, standalone, maxTouchPoints }) {
  const iPhoneOrIPod = /iPhone|iPod/.test(userAgent);
  const iPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  return (iPhoneOrIPod || iPad) && !standalone;
}

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Opens the consent dialog; resolves true (yes) / false (not now). */
function askInDialog({ eventName, homeScreenHint }) {
  const dialog = document.getElementById("push-consent-dialog");
  dialog.querySelector("[data-event-name]").textContent = eventName;
  dialog.querySelector("[data-ios-hint]").hidden = !homeScreenHint;
  dialog.querySelector("[data-yes]").hidden = homeScreenHint;
  return new Promise((resolve) => {
    const done = (answer) => {
      dialog.removeEventListener("close", onClose);
      resolve(answer);
    };
    const onClose = () => done(dialog.returnValue === "yes");
    dialog.addEventListener("close", onClose);
    dialog.returnValue = "";
    dialog.showModal();
  });
}

/**
 * Asks whether to get alerts for this event and acts on the answer.
 * Resolves "granted" | "denied" | "unsupported".
 */
export async function askEventPushConsent({ eventId, eventName, getToken }) {
  const api = await import("./api.js");
  const token = getToken();
  const homeScreenHint = needsHomeScreenForPush({
    userAgent: navigator.userAgent,
    standalone: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  });
  const { publicKey } = await api.getPushKey(token).catch(() => ({ publicKey: null }));
  if (!publicKey || (!pushSupported() && !homeScreenHint)) return "unsupported";

  const yes = await askInDialog({ eventName, homeScreenHint });
  if (!yes || homeScreenHint) {
    // On iOS outside the home screen "OK" just closes the hint - ask again next time.
    if (!homeScreenHint) await api.setEventPushConsent(token, eventId, false).catch(() => {});
    return "denied";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await api.setEventPushConsent(token, eventId, false);
      return "denied";
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
    await api.savePushSubscription(token, subscription.toJSON());
    await api.setEventPushConsent(token, eventId, true);
    return "granted";
  } catch (err) {
    console.warn("[push] couldn't turn on alerts", err);
    return "denied";
  }
}
