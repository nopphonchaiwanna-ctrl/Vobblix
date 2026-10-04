// Small localStorage-backed user preferences (notification sound,
// order push toasts, light/dark theme). Kept as plain getter/setter
// pairs rather than a generic get/set(key) API so each preference can
// have its own default and parsing, and so call sites read clearly
// (prefs.getNotifySound() vs. prefs.get("notifySound")).
//
// These are per-browser, not per-account - they live in localStorage,
// not on the server, since they're display preferences for whoever is
// sitting at this device right now, not account data that should
// follow the user to another computer.

const KEYS = {
  notifySound: "vobblix:pref:notifySound",
  notifyOrders: "vobblix:pref:notifyOrders",
  theme: "vobblix:pref:theme",
};

function readBool(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
}

function writeBool(key, value) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // localStorage can throw (private browsing, quota, disabled) -
    // preferences just fall back to defaults next time, nothing to do.
  }
}

/** Whether to play a chime for incoming order notifications. Default on. */
export function getNotifySound() {
  return readBool(KEYS.notifySound, true);
}
export function setNotifySound(value) {
  writeBool(KEYS.notifySound, value);
}

/** Whether to show a toast popup for incoming order notifications. Default on. */
export function getNotifyOrders() {
  return readBool(KEYS.notifyOrders, true);
}
export function setNotifyOrders(value) {
  writeBool(KEYS.notifyOrders, value);
}

/** "dark" | "light". Defaults to "dark" (the app's original fixed theme). */
export function getTheme() {
  try {
    const raw = localStorage.getItem(KEYS.theme);
    return raw === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
export function setTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme === "light" ? "light" : "dark");
  } catch {
    // ignore - see writeBool
  }
}
