// Tiny client-side router using the browser History API, so every
// screen has a real, bookmarkable/shareable URL (/settings, /shop/foo,
// ...) instead of everything living only in in-memory JS state with no
// address-bar trace. No server-side routing is needed for this: both
// `vite` (dev) and `vite preview` already serve index.html for any
// unknown path by default (Vite's SPA fallback), and client/public/
// _redirects does the same for a static host in production (Cloudflare
// Pages and similar).
//
// Usage (see main.js):
//   route("/shop/:roomId", ({ roomId }) => { ... });
//   setNotFound(() => navigate("/lobby", { replace: true }));
//   navigate("/settings");              // user-initiated: pushes history
//   startRouter();                      // once, on page load: resolves
//                                        // the current URL without
//                                        // pushing a new entry
//
// This intentionally does NOT try to curate the back/forward stack
// beyond what pushState/replaceState naturally give you - route
// handlers are expected to be idempotent re-renders of "what does this
// URL mean right now", since popstate (the browser's own Back/Forward
// buttons) re-runs whichever one matches with no way to tell this
// apart from a programmatic navigate().

const routes = [];
let notFound = () => {};

function compile(pattern) {
  const keys = [];
  const regexSource = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${regexSource}$`), keys };
}

/** Registers a route. `pattern` segments starting with ":" are captured
 *  as named params passed to `handler` (e.g. "/shop/:roomId" -> { roomId }). */
export function route(pattern, handler) {
  const { regex, keys } = compile(pattern);
  routes.push({ regex, keys, handler });
}

/** Handler for a path that matches nothing registered - defaults to a
 *  no-op if never set. */
export function setNotFound(handler) {
  notFound = handler;
}

// Wraps a screen-switching call in the View Transitions API so the
// browser cross-fades between the before/after state instead of
// snapping instantly - a no-op on browsers that don't support it yet
// (Safari < 18.2), since it just calls `update()` directly then.
// Deliberately only called from resolve() below, once per navigation -
// nesting a second startViewTransition() call inside an already-active
// one's update callback (e.g. if a route handler itself tried to wrap
// a sub-step) would interrupt the outer transition, so route handlers
// should stay plain synchronous-looking DOM updates like they are now.
function withViewTransition(update) {
  if (!document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(() => update());
}

function resolve(pathname) {
  for (const { regex, keys, handler } of routes) {
    const match = regex.exec(pathname);
    if (!match) continue;
    const params = {};
    keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1]);
    });
    withViewTransition(() => handler(params));
    return;
  }
  withViewTransition(() => notFound());
}

/** Navigates to `path` - pushes a new history entry (so the browser's
 *  own Back button returns to wherever we're navigating from) and runs
 *  the matching route. Pass `{ replace: true }` for a navigation that
 *  shouldn't itself be "back"-able (redirects, logout, etc.) - it
 *  replaces the current entry instead of adding a new one. */
export function navigate(path, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    if (path === location.pathname) return; // already there - no-op
    history.pushState(null, "", path);
  }
  resolve(path);
}

window.addEventListener("popstate", () => resolve(location.pathname));

/** Resolves whatever URL the page was loaded with, without touching
 *  history - call this once, after any session-restore logic that
 *  route handlers might depend on (e.g. checking if the user is still
 *  logged in). */
export function startRouter() {
  resolve(location.pathname);
}
