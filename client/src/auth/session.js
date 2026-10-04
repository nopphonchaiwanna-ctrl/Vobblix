// Persists the login token across page reloads. Wrapped in try/catch
// because localStorage can be unavailable (private browsing, storage
// full, etc.) - the app should just fall back to asking the player to
// log in again rather than throwing.

const STORAGE_KEY = "vobblix:token";

export function getSavedToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Session just won't survive a reload - not fatal.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // see saveToken
  }
}
