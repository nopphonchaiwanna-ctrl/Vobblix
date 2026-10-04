import Phaser from "phaser";
import { connectSocket, disconnectSocket, getSocket } from "./net/socket.js";
import { initChatUI } from "./ui/chat.js";
import { initCallUI } from "./ui/call.js";
import { createCallManager } from "./webrtc/callManager.js";
import ShopScene from "./scenes/ShopScene.js";
import { login, register, me, applyForOwner, myApplication, publicShops, myShop, blockUser, unblockUser, listBlockedUsers, verifyEmail, resendVerification, forgotPassword, resetPassword } from "./net/api.js";
import { getSavedToken, saveToken, clearToken } from "./auth/session.js";
import { escapeHtml, statusLabel } from "./ui/format.js";
import { icon } from "./ui/icons.js";
import { initOrderThread } from "./ui/orderThread.js";
import { initOrdersPanel } from "./ui/ordersPanel.js";
import { initOwnerDashboard } from "./ui/ownerDashboard.js";
import { initAdminPanel } from "./ui/adminPanel.js";
import { initShopListings } from "./ui/shopListings.js";
import { initSettingsPanel } from "./ui/settings.js";
import { route, setNotFound, navigate, startRouter } from "./router.js";
import { showToast } from "./ui/toast.js";
import { attachPasswordChecklist, attachConfirmPasswordCheck } from "./ui/passwordChecklist.js";
import { confirmDialog } from "./ui/confirmDialog.js";
import { playNotificationSound } from "./ui/sound.js";
import { getNotifyOrders, getNotifySound, getTheme, setTheme } from "./prefs.js";

// ---------- Routes (see src/router.js) ----------
// Every full-screen view now has a real URL - /login, /lobby,
// /shop/:roomId, /settings, /orders, /my-shop, /admin - instead of only
// living in in-memory JS state. That means: the browser's Back/Forward
// buttons work, a shop (or any panel) can be bookmarked/shared as a
// link, and refreshing the page while deep in one of these restores it
// instead of dropping back to the login form. Each route is registered
// near the bottom of this file, right next to the function that
// actually shows that screen, so the two stay easy to read together.

const authScreen = document.getElementById("auth");
const lobby = document.getElementById("lobby");
const gameScreen = document.getElementById("game-screen");
const leaveShopBtn = document.getElementById("leave-shop-btn");

const authTabLogin = document.getElementById("auth-tab-login");
const authTabRegister = document.getElementById("auth-tab-register");
const authTabsEl = document.querySelector(".auth-tabs");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotPasswordForm = document.getElementById("forgot-password-form");
const resetPasswordForm = document.getElementById("reset-password-form");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const forgotPasswordCancel = document.getElementById("forgot-password-cancel");
const resendVerificationBtn = document.getElementById("resend-verification-btn");

attachPasswordChecklist(
  document.getElementById("register-password"),
  document.getElementById("register-password-rules")
);
attachPasswordChecklist(
  document.getElementById("reset-password-new"),
  document.getElementById("reset-password-rules")
);
attachConfirmPasswordCheck(
  document.getElementById("register-password"),
  document.getElementById("register-confirm-password"),
  document.getElementById("register-confirm-rules")
);
attachConfirmPasswordCheck(
  document.getElementById("reset-password-new"),
  document.getElementById("reset-password-confirm"),
  document.getElementById("reset-confirm-rules")
);
const authError = document.getElementById("auth-error");
const authNotice = document.getElementById("auth-notice");

const loggedInAs = document.getElementById("logged-in-as");
const roomInput = document.getElementById("room-input");
const joinBtn = document.getElementById("join-btn");
const lobbyError = document.getElementById("lobby-error");

const applyOwnerBtn = document.getElementById("apply-owner-btn");
const ownerStatusHint = document.getElementById("owner-status-hint");
const publishedShopsList = document.getElementById("published-shops-list");
const lobbyStats = document.getElementById("lobby-stats");

// Default top bar (see index.html's #app-topbar) - shown on every screen
// once logged in. The profile dropdown replaces what used to be a row
// of separate buttons on the lobby card only (Settings/My orders/My
// shop/Admin panel/Log out) - see refreshTopbarMenu()/refreshTopbarProfile().
const topbar = document.getElementById("app-topbar");
const topbarBrandBtn = document.getElementById("topbar-brand");
const topbarProfileBtn = document.getElementById("topbar-profile-btn");
const topbarMenu = document.getElementById("topbar-menu");
const topbarAvatar = document.getElementById("topbar-avatar");
const topbarAvatarFallback = document.getElementById("topbar-avatar-fallback");
const topbarName = document.getElementById("topbar-name");
const topbarMenuSettings = document.getElementById("topbar-menu-settings");
const topbarMenuOrders = document.getElementById("topbar-menu-orders");
const topbarMenuMyShop = document.getElementById("topbar-menu-myshop");
const topbarMenuAdmin = document.getElementById("topbar-menu-admin");
const topbarMenuLogout = document.getElementById("topbar-menu-logout");
const topbarThemeToggle = document.getElementById("topbar-theme-toggle");
const topbarNotif = document.getElementById("topbar-notif");
const topbarNotifBtn = document.getElementById("topbar-notif-btn");
const topbarNotifMenu = document.getElementById("topbar-notif-menu");
const topbarNotifBadge = document.getElementById("topbar-notif-badge");
const topbarNotifList = document.getElementById("topbar-notif-list");
const topbarNotifEmpty = document.getElementById("topbar-notif-empty");

// Holds the logged-in account for the rest of the session - the display
// name shown/used everywhere now comes from here, not from a name typed
// into the lobby. `user.role` (customer/shop_owner/admin) drives which
// of the topbar's dropdown items are shown - see refreshTopbarMenu().
let session = null; // { token, user: { id, email, displayName, role } }
// Set right before showing the "resend verification email" button
// (login failed with EMAIL_NOT_VERIFIED) / right before showing the
// reset-password form (landed on /reset-password?token=...) - neither
// is part of `session` since neither implies a logged-in user yet.
let pendingVerificationEmail = "";
let pendingResetToken = "";

// Which main-screen URL (/lobby or /shop/:roomId) is "underneath" right
// now - an overlay panel's (Settings/My orders/My shop/Admin panel)
// back button navigates here instead of hardcoding the lobby, since all
// of those panels can now be opened from inside a shop too via the
// topbar. Only the /lobby and /shop/:roomId route handlers below ever
// change this.
let activeMainPath = "/lobby";

// The currently-running Phaser game + the WebRTC/call teardown + room id
// for the shop the player is in, if any - null whenever #game-screen
// isn't the active screen. Needed so leaveShop() (the topbar brand,
// navigating to a different shop, or logging out from inside a shop)
// can cleanly tear both down instead of just hiding the DOM.
let currentGame = null;
let currentCallTeardown = null;
let currentShopRoomId = null;

const getToken = () => session?.token;
const getUserId = () => session?.user?.id;

// Returns to whichever main screen (lobby or mid-shop) was showing
// before an overlay panel was opened over it - see activeMainPath above.
function returnToMainScreen() {
  navigate(activeMainPath);
}

// ---------- Marketplace panels (owner dashboard, admin review, orders,
// one order's chat thread, and the in-shop listings panel) - see each
// module for what it owns. Initialized once; they read `session` lazily
// through getToken/getUserId above rather than being handed it directly,
// since session is replaced on every login/logout.
const orderThread = initOrderThread({ getToken, getUserId });
const ordersPanel = initOrdersPanel({
  getToken,
  getUserId,
  orderThread,
  onBack: returnToMainScreen,
});
const ownerDashboard = initOwnerDashboard({
  getToken,
  onBack: () => {
    returnToMainScreen();
    if (activeMainPath === "/lobby") refreshLobbyExtras();
  },
  onShopChanged: () => refreshLobbyExtras(),
});
const adminPanel = initAdminPanel({
  getToken,
  onBack: returnToMainScreen,
});
const shopListings = initShopListings({ getToken, orderThread });
const settingsPanel = initSettingsPanel({
  getToken,
  getSession: () => session,
  onBack: returnToMainScreen,
  // The settings panel only ever changes displayName/avatarUrl - merge
  // rather than replace so session.user.role etc. stay intact.
  onProfileChanged: (user) => {
    session.user = { ...session.user, ...user };
    loggedInAs.textContent = `Logged in as ${session.user.displayName}`;
    refreshTopbarProfile();
  },
  // Settings has its own "Blocked users" list (unblock button) - after
  // it changes anything there, re-sync chatUI's filter set (see
  // refreshBlockedUsers() below) so an unblock takes effect immediately
  // without needing to re-enter the shop.
  onBlockedUsersChanged: () => refreshBlockedUsers(),
});

// Created once and reused for every shop visit (see ui/chat.js/ui/call.js -
// re-running these per shop-entry would double-bind their DOM listeners
// since they always bind to the same elements). Reconfigured per shop via
// chatUI.reset()/callUI.reset() inside enterShop() below instead.
const chatUI = initChatUI();
const callUI = initCallUI();

// ---------- Chat block list ----------
// chatUI itself does the actual filtering/rendering (see
// setBlockedUserIds()/setOwnUserId() in ui/chat.js) - this is just the
// fetch (once per login, re-run after any block/unblock, including one
// done from Settings - see settingsPanel's onBlockedUsersChanged below)
// and the "click a name in chat to block" confirmation flow.
async function refreshBlockedUsers() {
  try {
    const { blocked } = await listBlockedUsers(session.token);
    chatUI.setBlockedUserIds(blocked.map((u) => u.id));
    return blocked;
  } catch (err) {
    console.warn("[vobblix] couldn't load blocked users", err);
    return [];
  }
}

// Registered once here (not per shop-visit) - ShopScene re-calls
// chatUI.setHandlers() on every shop entry for onShopSend/onTableSend,
// but setHandlers() merges rather than replaces, so this stays intact.
chatUI.setHandlers({
  onBlockUser: async (userId, name) => {
    const ok = await confirmDialog(
      `Block ${name}? You won't see their messages in chat anymore. You can undo this later in Settings.`,
      { title: "Block this user?", confirmLabel: "Block" }
    );
    if (!ok) return;
    try {
      await blockUser(session.token, userId);
      await refreshBlockedUsers();
    } catch (err) {
      window.alert(err.message);
    }
  },
});

function showAuthError(msg) {
  authNotice.hidden = true;
  authError.textContent = msg;
  authError.hidden = false;
}

function showAuthNotice(msg) {
  authError.hidden = true;
  resendVerificationBtn.hidden = true;
  authNotice.textContent = msg;
  authNotice.hidden = false;
}

function showLobbyError(msg) {
  lobbyError.textContent = msg;
  lobbyError.hidden = false;
}

// One of the four auth-card forms (login/register/forgot-password/
// reset-password) is visible at a time; the tab row only makes sense
// above login/register, so it hides itself for the other two.
const authForms = [loginForm, registerForm, forgotPasswordForm, resetPasswordForm];
function showAuthForm(formToShow) {
  authForms.forEach((form) => {
    form.hidden = form !== formToShow;
  });
  authTabsEl.hidden = formToShow !== loginForm && formToShow !== registerForm;
}

function switchAuthTab(tab) {
  const showLogin = tab === "login";
  authTabLogin.classList.toggle("active", showLogin);
  authTabRegister.classList.toggle("active", !showLogin);
  showAuthForm(showLogin ? loginForm : registerForm);
  authError.hidden = true;
  resendVerificationBtn.hidden = true;
}

authTabLogin.addEventListener("click", () => switchAuthTab("login"));
authTabRegister.addEventListener("click", () => switchAuthTab("register"));

forgotPasswordLink.addEventListener("click", () => {
  authError.hidden = true;
  authNotice.hidden = true;
  forgotPasswordForm.reset();
  showAuthForm(forgotPasswordForm);
});

forgotPasswordCancel.addEventListener("click", () => switchAuthTab("login"));

forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const email = document.getElementById("forgot-password-email").value.trim();
  try {
    await forgotPassword(email);
    forgotPasswordForm.reset();
    switchAuthTab("login");
    // Same email either way, registered or not - see routes/auth.js's
    // /forgot-password for why (don't let this double as an "is this
    // email registered" probe).
    showAuthNotice("If that email has an account, a reset link is on its way.");
  } catch (err) {
    showAuthError(err.message);
  }
});

resendVerificationBtn.addEventListener("click", async () => {
  try {
    await resendVerification(pendingVerificationEmail);
    showAuthNotice(`Verification email sent to ${pendingVerificationEmail}.`);
  } catch (err) {
    showAuthError(err.message);
  }
});

resetPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const newPassword = document.getElementById("reset-password-new").value;
  try {
    await resetPassword(pendingResetToken, newPassword);
    resetPasswordForm.reset();
    switchAuthTab("login");
    showAuthNotice("Password reset! You can log in with your new password now.");
  } catch (err) {
    showAuthError(err.message);
  }
});

function renderPublishedShops(shops) {
  if (shops.length === 0) {
    publishedShopsList.innerHTML = `<p class="list-empty">No published shops yet - be the first (see "Apply to become a shop owner").</p>`;
    return;
  }
  publishedShopsList.innerHTML = shops
    .map((s) => {
      const logo = s.logo_url
        ? `<img class="shop-logo" src="${escapeHtml(s.logo_url)}" alt="" />`
        : `<div class="shop-logo-fallback">${icon("store", "icon-only")}</div>`;
      const itemCount = s.listing_count === 1 ? "1 item for sale" : `${s.listing_count} items for sale`;
      return `
        <div class="row">
          ${logo}
          <div class="row-main">
            <div class="row-title">${escapeHtml(s.name)}</div>
            <div class="row-meta">by ${escapeHtml(s.owner_name)} · ${itemCount}</div>
            ${s.description ? `<div class="row-meta">${escapeHtml(s.description)}</div>` : ""}
          </div>
          <div class="row-actions"><button type="button" data-shop-code="${escapeHtml(s.code)}">Enter</button></div>
        </div>`;
    })
    .join("");
}

// A quick at-a-glance strip above the two lobby cards - site-wide
// shop/listing counts everyone sees, plus (only for a shop_owner/admin
// who actually has a shop) a tile for their own shop's review status
// and listing count. See refreshLobbyExtras() for where myShopInfo
// comes from.
function renderLobbyStats(shops, myShopInfo) {
  const totalListings = shops.reduce((sum, s) => sum + (s.listing_count || 0), 0);
  const tiles = [
    {
      iconName: "store",
      value: escapeHtml(String(shops.length)),
      label: shops.length === 1 ? "shop open" : "shops open",
    },
    {
      iconName: "package",
      value: escapeHtml(String(totalListings)),
      label: totalListings === 1 ? "item for sale" : "items for sale",
    },
  ];

  if (myShopInfo?.shop) {
    const { shop, listings } = myShopInfo;
    tiles.push({
      iconName: "shopping-bag",
      value: `<span class="status-pill ${escapeHtml(shop.status)}">${escapeHtml(statusLabel(shop.status))}</span>`,
      label: `your shop · ${listings.length} listing${listings.length === 1 ? "" : "s"}`,
    });
  }

  lobbyStats.innerHTML = tiles
    .map(
      (t) => `
        <div class="stat-tile">
          <span class="stat-tile-icon">${icon(t.iconName, "icon-only")}</span>
          <div>
            <div class="stat-tile-value">${t.value}</div>
            <div class="stat-tile-label">${escapeHtml(t.label)}</div>
          </div>
        </div>`
    )
    .join("");
}

// Normalizes the same way the server does (see server/src/index.js's
// `cleanRoomId`) before putting it in the URL, so e.g. "MyShop" and
// "myshop" always navigate to the same /shop/:roomId path.
function joinShopByCode(code) {
  const roomId = (code || "").trim().toLowerCase() || "default";
  navigate(`/shop/${encodeURIComponent(roomId)}`);
}

publishedShopsList.addEventListener("click", (e) => {
  const code = e.target.dataset.shopCode;
  if (code) joinShopByCode(code);
});

// Re-derives which lobby buttons/hints to show from the account's
// current role + (for a plain customer) their latest owner application,
// and refreshes the published-shops list. Called on entering the lobby
// and whenever something that could change those might have happened
// (submitting an application, an owner-dashboard edit, coming back from
// a panel).
async function refreshLobbyExtras() {
  applyOwnerBtn.hidden = true;
  ownerStatusHint.hidden = true;

  if (session.user.role !== "shop_owner" && session.user.role !== "admin") {
    try {
      const { application } = await myApplication(session.token);
      if (application?.status === "pending") {
        ownerStatusHint.textContent = "Your shop-owner application is pending review.";
        ownerStatusHint.hidden = false;
      } else if (application?.status === "rejected") {
        ownerStatusHint.textContent =
          "Your shop-owner application was rejected" +
          (application.rejection_reason ? `: ${application.rejection_reason}` : ".") +
          " You can apply again.";
        ownerStatusHint.hidden = false;
        applyOwnerBtn.hidden = false;
      } else {
        applyOwnerBtn.hidden = false;
      }
    } catch {
      applyOwnerBtn.hidden = false;
    }
  }

  let myShopInfo = null;
  if (session.user.role === "shop_owner" || session.user.role === "admin") {
    try {
      myShopInfo = await myShop(session.token);
    } catch {
      myShopInfo = null; // the stats tile just won't show - not worth surfacing an error for
    }
  }

  try {
    const { shops } = await publicShops();
    renderPublishedShops(shops);
    renderLobbyStats(shops, myShopInfo);
  } catch {
    publishedShopsList.innerHTML = `<p class="list-empty">Couldn't load shops right now.</p>`;
    lobbyStats.innerHTML = "";
  }
}

applyOwnerBtn.addEventListener("click", async () => {
  const message = window.prompt("Tell the admins a bit about the shop you want to run (optional):") || "";
  try {
    await applyForOwner(session.token, message);
    await refreshLobbyExtras();
  } catch (err) {
    showLobbyError(err.message);
  }
});

// ---------- Default top bar (#app-topbar) ----------

// Which dropdown items show depends only on role, same condition the
// old lobby-only buttons used - "My shop" covers both shop_owner and
// admin (an admin can still open their own dashboard if they also own
// a shop), "Admin panel" is admin-only.
function refreshTopbarMenu() {
  const role = session?.user?.role;
  topbarMenuMyShop.hidden = !(role === "shop_owner" || role === "admin");
  topbarMenuAdmin.hidden = role !== "admin";
}

function refreshTopbarProfile() {
  topbarName.textContent = session.user.displayName;
  if (session.user.avatarUrl) {
    topbarAvatar.src = session.user.avatarUrl;
    topbarAvatar.hidden = false;
    topbarAvatarFallback.hidden = true;
  } else {
    topbarAvatar.hidden = true;
    topbarAvatarFallback.hidden = false;
  }
}

function closeTopbarMenu() {
  topbarMenu.hidden = true;
  topbarProfileBtn.setAttribute("aria-expanded", "false");
}

topbarProfileBtn.addEventListener("click", () => {
  const nowOpen = topbarMenu.hidden;
  closeTopbarNotif();
  topbarMenu.hidden = !nowOpen;
  topbarProfileBtn.setAttribute("aria-expanded", String(nowOpen));
});

document.addEventListener("click", (e) => {
  if (!topbarMenu.hidden && !document.getElementById("topbar-profile").contains(e.target)) {
    closeTopbarMenu();
  }
  // Notif dropdown is a popover="auto" element now - the browser
  // handles its own outside-click light-dismiss natively.
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !topbarMenu.hidden) closeTopbarMenu();
  // Notif dropdown is a popover="auto" element now - Escape closes it
  // natively too.
});

topbarBrandBtn.addEventListener("click", () => {
  closeTopbarMenu();
  navigate("/lobby");
});
topbarMenuSettings.addEventListener("click", () => {
  closeTopbarMenu();
  navigate("/settings");
});
topbarMenuOrders.addEventListener("click", () => {
  closeTopbarMenu();
  navigate("/orders");
});
topbarMenuMyShop.addEventListener("click", () => {
  closeTopbarMenu();
  navigate("/my-shop");
});
topbarMenuAdmin.addEventListener("click", () => {
  closeTopbarMenu();
  navigate("/admin");
});
topbarMenuLogout.addEventListener("click", () => {
  closeTopbarMenu();
  doLogout();
});

// ---------- Light/dark theme ----------
// The actual <html data-theme> switch and the inline anti-flash script
// in index.html both key off the exact same prefs.js value, so this is
// the only place that needs to know the toggle exists.
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const isLight = theme === "light";
  topbarThemeToggle.innerHTML = icon(isLight ? "sun" : "moon", "icon-only");
  topbarThemeToggle.title = isLight ? "Switch to dark theme" : "Switch to light theme";
}

applyTheme(getTheme());

topbarThemeToggle.addEventListener("click", () => {
  const next = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  applyTheme(next);
});

// ---------- Topbar notification bell ----------
// A lightweight "catch up on what you missed" list, separate from the
// toast/sound preferences in Settings (see notifyOrderEvent() below) -
// the bell always records every order:new/order:message/order:status
// push regardless of those toggles, since muting the popup/sound isn't
// the same as not wanting to see it ever. Kept in memory only (not
// persisted) - it resets on reload, same as the toasts it mirrors.
const MAX_NOTIFICATIONS = 20;
let notifications = [];
let unreadNotifCount = 0;

function closeTopbarNotif() {
  // aria-expanded is synced by the "toggle" listener below, which
  // fires for every state change regardless of what caused it
  // (this call, a click outside, Escape, or the button itself).
  if (topbarNotifMenu.matches(":popover-open")) topbarNotifMenu.hidePopover();
}

function formatNotifTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function renderTopbarNotifBadge() {
  topbarNotifBadge.hidden = unreadNotifCount === 0;
  topbarNotifBadge.textContent = unreadNotifCount > 9 ? "9+" : String(unreadNotifCount);
}

function renderTopbarNotifList() {
  topbarNotifEmpty.hidden = notifications.length > 0;
  topbarNotifList.innerHTML = notifications
    .map(
      (n) => `
        <button type="button" class="topbar-notif-item${n.read ? "" : " unread"}" data-notif-id="${n.id}">
          ${escapeHtml(n.message)}
          <span class="topbar-notif-time">${formatNotifTime(n.timestamp)}</span>
        </button>`
    )
    .join("");
}

function addNotification(message) {
  notifications.unshift({ id: `${Date.now()}-${Math.random()}`, message, timestamp: Date.now(), read: false });
  notifications = notifications.slice(0, MAX_NOTIFICATIONS);
  unreadNotifCount += 1;
  renderTopbarNotifBadge();
  if (topbarNotifMenu.matches(":popover-open")) renderTopbarNotifList();
}

topbarNotifList.addEventListener("click", (e) => {
  if (!e.target.closest(".topbar-notif-item")) return;
  closeTopbarNotif();
  navigate("/orders");
});

// popovertarget="topbar-notif-menu" on the button (see index.html)
// handles the actual open/close toggle natively now - this just reacts
// to it. "toggle" fires for every state change, however it happened
// (this button, a click outside, Escape, or closeTopbarNotif() above),
// so aria-expanded and the positioning below never fall out of sync.
topbarNotifMenu.addEventListener("toggle", (e) => {
  const isOpen = e.newState === "open";
  topbarNotifBtn.setAttribute("aria-expanded", String(isOpen));
  if (!isOpen) return;

  closeTopbarMenu();

  // Opening the dropdown is itself "seeing" the notifications - marks
  // everything read and clears the badge, same as most bell icons.
  notifications = notifications.map((n) => ({ ...n, read: true }));
  unreadNotifCount = 0;
  renderTopbarNotifBadge();
  renderTopbarNotifList();

  // Promoted to the top layer by popover="auto", so it's detached from
  // #topbar-notif's position:relative - position it ourselves from the
  // bell button's current on-screen rect (CSS anchor positioning isn't
  // broadly supported in Chrome/Firefox yet). Measured after
  // renderTopbarNotifList() above so offsetWidth reflects the real
  // content, not last time's.
  const rect = topbarNotifBtn.getBoundingClientRect();
  topbarNotifMenu.style.top = `${rect.bottom + 6}px`;
  topbarNotifMenu.style.left = `${rect.right - topbarNotifMenu.offsetWidth}px`;
});

let socketListenersAttached = false;

// Connects the socket + wires up the account-level stuff that should be
// live regardless of which URL we land on (the topbar, order push
// notifications) - called once whenever `session` becomes valid (fresh
// login/register, or a successful session restore on page load), before
// the router resolves whatever the actual starting URL is.
function establishSession() {
  topbar.hidden = false;
  loggedInAs.textContent = `Logged in as ${session.user.displayName}`;
  refreshTopbarProfile();
  refreshTopbarMenu();
  chatUI.setOwnUserId(session.user.id);
  refreshBlockedUsers();

  // Connected here, not lazily at "enter shop" time, so the account has
  // a live socket - and therefore can receive order:new/order:message/
  // order:status pushes (see routes/orders.js's `notify()`) - no matter
  // which screen we land on (lobby, a shop, a panel).
  const socket = connectSocket(session.token);
  if (!socketListenersAttached) {
    socketListenersAttached = true;
    socket.on("order:new", ({ listingTitle, buyerName }) => {
      const panel = document.getElementById("orders-panel");
      if (!panel.hidden) ordersPanel.refresh();
      notifyOrderEvent(`${buyerName} wants to buy ${listingTitle}`);
    });
    socket.on("order:message", ({ orderId, message, listingTitle }) => {
      orderThread.handleIncomingMessage(orderId, message);
      notifyOrderEvent(`${message.author_name}: ${listingTitle}`);
    });
    socket.on("order:status", ({ orderId, status, listingTitle }) => {
      orderThread.handleIncomingStatus(orderId, status);
      notifyOrderEvent(`${listingTitle} is now "${status.replaceAll("_", " ")}"`);
    });
  }
}

// Shared by all three order:* pushes above - shows a toast (click jumps
// to the orders list) and/or plays a chime, gated by the user's own
// notification preferences (see ./prefs.js, set from Settings).
function notifyOrderEvent(message) {
  addNotification(message);
  if (getNotifyOrders()) {
    showToast(message, { onClick: () => navigate("/orders") });
  }
  if (getNotifySound()) {
    playNotificationSound();
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  authNotice.hidden = true;
  resendVerificationBtn.hidden = true;
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    const { token, user } = await login({ email, password });
    session = { token, user };
    saveToken(token);
    establishSession();
    navigate("/lobby");
  } catch (err) {
    showAuthError(err.message);
    // Login is blocked until the email is verified (see
    // routes/auth.js) - offer to resend rather than just saying "no".
    if (err.code === "EMAIL_NOT_VERIFIED") {
      pendingVerificationEmail = email;
      resendVerificationBtn.hidden = false;
    }
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  authNotice.hidden = true;
  const displayName = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  try {
    // No token/session comes back anymore - the account can't log in
    // until its email is verified (see routes/auth.js's /register), so
    // there's nothing to establishSession() with yet.
    await register({ email, password, displayName });
    registerForm.reset();
    switchAuthTab("login");
    showAuthNotice(`Account created! Check ${email} for a verification link, then log in.`);
  } catch (err) {
    showAuthError(err.message);
  }
});

// Shared by the topbar's Log out menu item and the "your session
// expired" auto-logout below - works from any screen, including from
// inside a shop (leaveShop() tears that down first instead of leaving
// the Phaser game/call running underneath the auth screen).
function doLogout() {
  leaveShop();
  session = null;
  socketListenersAttached = false;
  clearToken();
  disconnectSocket();
  navigate("/login", { replace: true });
}

// Wires webrtc/callManager.js (the actual WebRTC/mesh logic) to
// ui/call.js (the DOM panel), and returns the one hook ShopScene needs:
// "the player is now at this table (or none)". Call membership is scoped
// to whichever table the player's currently seated at, so walking away
// always ends the call - joining one is always an explicit button press
// (getUserMedia needs a user gesture, and this is also where the
// server's 10-voice/4-video-per-table caps get enforced - see README).
function setupCall(callUI, chatUI) {
  const manager = createCallManager({
    onLocalStream: (stream) => callUI.setLocalStream(stream),
    onPeerJoined: (peer) => {
      callUI.addPeer(peer);
      chatUI.addVoiceParticipant(peer);
    },
    onPeerLeft: (id) => {
      callUI.removePeer(id);
      chatUI.removeVoiceParticipant(id);
    },
    onPeerStream: (id, stream) => callUI.setPeerStream(id, stream),
    onPeerVideoChanged: (id, on) => callUI.setPeerVideoState(id, on),
    onPeerMicChanged: (id, muted) => {
      callUI.setPeerMicMuted(id, muted);
      chatUI.setVoiceParticipantMicMuted(id, muted);
    },
    onPeerDeafenChanged: (id, deafened) => {
      callUI.setPeerDeafened(id, deafened);
      chatUI.setVoiceParticipantDeafened(id, deafened);
    },
    // Deafening also mutes your own mic (see webrtc/callManager.js's
    // deafen()) - this is that auto-mute reaching the UI, same as if
    // the mute button had been clicked directly.
    onMicAutoMuted: (muted) => {
      callUI.showMicMuted(muted);
      chatUI.setVoiceParticipantMicMuted("local", muted);
    },
    onSpeakingChanged: (id, speaking) => {
      callUI.setPeerSpeaking(id, speaking);
      chatUI.setVoiceParticipantSpeaking(id, speaking);
    },
    onError: (message) => callUI.showError(message),
  });

  callUI.setHandlers({
    onJoin: async () => {
      callUI.setJoinBusy(true);
      const result = await manager.join();
      callUI.setJoinBusy(false);
      if (result.ok) {
        callUI.showJoined(true);
        chatUI.addVoiceParticipant({ id: "local", name: "You" });
      }
    },
    onLeave: () => {
      manager.leave();
      callUI.showJoined(false);
      callUI.clearTiles();
      chatUI.clearVoiceRoster();
    },
    onEnableVideo: async () => {
      callUI.setCameraBusy(true);
      const result = await manager.enableVideo();
      callUI.setCameraBusy(false);
      if (result.ok) callUI.showVideoOn(true);
    },
    onDisableVideo: () => {
      manager.disableVideo();
      callUI.showVideoOn(false);
    },
    onMuteMic: () => {
      manager.muteMic();
      callUI.showMicMuted(true);
      chatUI.setVoiceParticipantMicMuted("local", true);
    },
    onUnmuteMic: () => {
      manager.unmuteMic();
      callUI.showMicMuted(false);
      chatUI.setVoiceParticipantMicMuted("local", false);
    },
    onDeafen: () => {
      manager.deafen();
      callUI.showDeafened(true);
      chatUI.setVoiceParticipantDeafened("local", true);
    },
    onUndeafen: () => {
      manager.undeafen();
      callUI.showDeafened(false);
      chatUI.setVoiceParticipantDeafened("local", false);
    },
    // Device picker (ui/call.js) - live-swaps the track if already in a
    // call, otherwise just remembered for the next join()/enableVideo()
    // (see webrtc/callManager.js).
    onMicDeviceChange: (deviceId) => manager.setAudioDevice(deviceId),
    onCameraDeviceChange: (deviceId) => manager.setVideoDevice(deviceId),
  });

  return {
    onTableChanged(tableLabel) {
      // Leaving the table (or switching to a different one) always ends
      // the call - the server does the same server-side (see
      // endCallForSocket in server/src/index.js) so other peers get
      // told too; this is the leaving player's own cleanup.
      if (!tableLabel && manager.isInCall()) {
        manager.leave();
      }
      callUI.setSeatedAt(!!tableLabel);
      if (!tableLabel) chatUI.clearVoiceRoster();
    },
    // Unregisters this manager's socket listeners (see callManager.js's
    // destroy()) - needed because the socket itself stays connected
    // across a "leave shop" (see main.js's leaveShop()), so without
    // this, re-entering a shop would stack a second copy of every
    // call-signaling listener on top of the first.
    destroy: manager.destroy,
  };
}

// Actually joins `roomId` over the socket and spins up the Phaser game -
// called by the /shop/:roomId route handler below, never directly.
function enterShop(roomId) {
  joinBtn.disabled = true;
  lobbyError.hidden = true;

  const socket = connectSocket(session.token);

  console.log("[vobblix] connecting to server, socket id (pending):", socket.id);

  socket.once("connect", () => {
    console.log("[vobblix] socket connected:", socket.id);
  });

  socket.once("connect_error", (err) => {
    console.error("[vobblix] connect_error:", err.message);
    joinBtn.disabled = false;
    if (err.message === "unauthorized") {
      // The saved token is missing/expired/invalid - send them back to
      // the login form rather than leaving them stuck on a shop URL
      // that can never actually load.
      doLogout();
      showAuthError("Your session expired - please log in again.");
      return;
    }
    navigate("/lobby", { replace: true });
    showLobbyError("Can't reach the server. Is it running? See README for `npm run dev`.");
  });

  // If the server never acks (e.g. it's up but something's wrong server-side),
  // don't leave the button stuck disabled with no feedback.
  const ackTimeout = setTimeout(() => {
    console.error("[vobblix] join-shop timed out waiting for server ack");
    navigate("/lobby", { replace: true });
    showLobbyError("Server didn't respond in time. Check the server terminal for errors.");
    joinBtn.disabled = false;
  }, 6000);

  console.log("[vobblix] emitting join-shop", { roomId });

  socket.emit("join-shop", { roomId }, (payload) => {
    clearTimeout(ackTimeout);
    console.log("[vobblix] join-shop ack received:", payload);

    if (payload?.error) {
      navigate("/lobby", { replace: true });
      showLobbyError(payload.error);
      joinBtn.disabled = false;
      return;
    }

    document
      .querySelectorAll("#auth, #lobby, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
      .forEach((s) => (s.hidden = true));
    gameScreen.hidden = false;
    activeMainPath = `/shop/${encodeURIComponent(payload.roomId)}`;
    currentShopRoomId = payload.roomId;

    // chatUI/callUI are created once (see their initChatUI()/initCallUI()
    // calls near the top of this file) and reused across every shop
    // visit - reset() reconfigures them for this (possibly new) shop
    // instead of rebinding their DOM listeners a second time.
    chatUI.reset(payload.roomId);
    // Replay the persisted shop-wide log (server/src/db/shops.js) before
    // the "you just joined" system line, so it reads like walking into a
    // room mid-conversation rather than a blank chat.
    for (const msg of payload.shopHistory || []) {
      chatUI.appendShopMessage({ from: msg.author_name, text: msg.text, authorId: msg.user_id });
    }
    chatUI.appendShopMessage({
      system: true,
      text: `You're in shop "${payload.roomId}". Walk up to a table to open a private chat with whoever's sitting there.`,
    });

    callUI.reset();
    currentCallTeardown = setupCall(callUI, chatUI);

    // Only an owner-created marketplace shop has listings - an ad-hoc
    // hangout room's panel just stays hidden (see ui/shopListings.js).
    shopListings.loadForShop({ isOwnedShop: payload.isOwnedShop, shopDbId: payload.shopDbId });

    // Floor size and table layout come entirely from the server (see
    // server/src/scenes/) - the client never hardcodes a shop layout, so
    // a new scene/event type on the server needs no client change here.
    currentGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game",
      width: payload.floor.width,
      height: payload.floor.height,
      backgroundColor: "#1b2634",
      physics: { default: undefined },
    });

    // Added (rather than listed in the config above) so we can hand it
    // the join payload as scene data on the very first start.
    currentGame.scene.add(
      "ShopScene",
      ShopScene,
      true,
      {
        you: payload.you,
        roomId: payload.roomId,
        players: payload.players,
        tables: payload.tables,
        floorWidth: payload.floor.width,
        floorHeight: payload.floor.height,
        chatUI,
        callHooks: currentCallTeardown,
      },
    );
  });
}

// Leaves the current shop (if any) and tears it down - used by the
// /lobby route (going back to the lobby from inside a shop), switching
// straight to a different shop, and logging out from inside a shop.
// Tells the server explicitly via "leave-shop" (unlike disconnecting,
// this keeps the socket itself alive, so order push notifications keep
// working once back on the lobby - see server/src/index.js's handler
// for it) and tears down the Phaser game + any active call instead of
// just hiding the DOM and leaving them running in the background.
function leaveShop() {
  if (!currentGame) return;
  getSocket().emit("leave-shop");
  currentCallTeardown?.destroy();
  currentCallTeardown = null;
  currentGame.destroy(true);
  currentGame = null;
  currentShopRoomId = null;
  gameScreen.hidden = true;
}

// navigate() (not leaveShop() directly) so the /lobby route handler
// does the actual teardown + screen swap in one place, same as the
// topbar brand link and the browser's own Back button.
leaveShopBtn.addEventListener("click", () => navigate("/lobby"));

joinBtn.addEventListener("click", () => joinShopByCode(roomInput.value));
roomInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinShopByCode(roomInput.value);
});

// ---------- Route handlers ----------
// Each one assumes it might be reached from anywhere: a click inside the
// app, a browser Back/Forward, a pasted link, or a page refresh - so
// every one of them re-derives the full visible state from scratch
// (including the "not logged in" guard) rather than assuming anything
// about how it got here.

route("/login", () => {
  if (session) {
    navigate("/lobby", { replace: true });
    return;
  }
  document
    .querySelectorAll("#lobby, #game-screen, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
    .forEach((s) => (s.hidden = true));
  topbar.hidden = true;
  authScreen.hidden = false;
  switchAuthTab("login");
  loginForm.reset();
  registerForm.reset();
});

// Landed on from the link in a verification email - redeems ?token=...
// immediately (see routes/auth.js's /verify-email) and reports the
// result right on the auth screen, same shape as /login above.
route("/verify-email", async () => {
  if (session) {
    navigate("/lobby", { replace: true });
    return;
  }
  document
    .querySelectorAll("#lobby, #game-screen, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
    .forEach((s) => (s.hidden = true));
  topbar.hidden = true;
  authScreen.hidden = false;
  switchAuthTab("login");

  const token = new URLSearchParams(location.search).get("token") || "";
  if (!token) {
    showAuthError("Missing verification token.");
    return;
  }
  try {
    await verifyEmail(token);
    showAuthNotice("Email verified! You can log in now.");
  } catch (err) {
    showAuthError(err.message);
  }
});

// Landed on from the link in a password-reset email - shows the "pick
// a new password" form with the token held for its submit handler (see
// resetPasswordForm's listener above) rather than redeeming it here,
// since redeeming it IS changing the password, not just reading state.
route("/reset-password", () => {
  if (session) {
    navigate("/lobby", { replace: true });
    return;
  }
  document
    .querySelectorAll("#lobby, #game-screen, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
    .forEach((s) => (s.hidden = true));
  topbar.hidden = true;
  authScreen.hidden = false;

  const token = new URLSearchParams(location.search).get("token") || "";
  if (!token) {
    switchAuthTab("login");
    showAuthError("That reset link is missing its token.");
    return;
  }
  pendingResetToken = token;
  authError.hidden = true;
  authNotice.hidden = true;
  resetPasswordForm.reset();
  showAuthForm(resetPasswordForm);
});

route("/lobby", () => {
  if (!session) {
    navigate("/login", { replace: true });
    return;
  }
  leaveShop(); // no-op if we weren't in a shop
  document
    .querySelectorAll("#owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
    .forEach((s) => (s.hidden = true));
  authScreen.hidden = true;
  lobby.hidden = false;
  activeMainPath = "/lobby";
  lobbyError.hidden = true;
  // enterShop() disables this while a join is in flight, but only
  // re-enables it on a *failed* join (see its connect_error/timeout/
  // payload.error branches) - a successful join leaves it disabled
  // forever, since the button is hidden behind the game screen from
  // then on and nothing else was resetting it. Landing back on the
  // lobby - the only screen this button is ever visible on - is the
  // one place that always needs to be true, so reset it here instead
  // of chasing every individual success/failure path.
  joinBtn.disabled = false;
  refreshLobbyExtras();
});

route("/shop/:roomId", ({ roomId }) => {
  if (!session) {
    navigate("/login", { replace: true });
    return;
  }
  if (currentGame && currentShopRoomId === roomId) {
    // Already in this shop (e.g. Back from an overlay panel that was
    // opened over it) - just make sure it's the one showing, no need to
    // rejoin anything.
    document
      .querySelectorAll("#auth, #lobby, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #settings-panel")
      .forEach((s) => (s.hidden = true));
    gameScreen.hidden = false;
    activeMainPath = `/shop/${encodeURIComponent(roomId)}`;
    return;
  }
  if (currentGame) leaveShop(); // switching straight to a different shop
  enterShop(roomId);
});

route("/settings", () => {
  if (!session) {
    navigate("/login", { replace: true });
    return;
  }
  settingsPanel.open();
});

route("/orders", () => {
  if (!session) {
    navigate("/login", { replace: true });
    return;
  }
  ordersPanel.open();
});

route("/my-shop", () => {
  if (!session) {
    navigate("/login", { replace: true });
    return;
  }
  ownerDashboard.open();
});

route("/admin", () => {
  if (!session) {
    navigate("/login", { replace: true });
    return;
  }
  adminPanel.open();
});

route("/", () => {
  navigate(session ? "/lobby" : "/login", { replace: true });
});

setNotFound(() => navigate(session ? "/lobby" : "/login", { replace: true }));

// Restore a saved login on page load, so a returning player skips the
// login form entirely - then let the router take over from whatever URL
// the page actually loaded with (not always the lobby: a refresh or a
// shared link on /shop/foo, /settings, etc. should restore that screen,
// not bounce back to square one - see the route guards above, which
// each fall back to /login on their own if this didn't find a session).
(async function restoreSession() {
  const token = getSavedToken();
  if (token) {
    try {
      const { user } = await me(token);
      session = { token, user };
      establishSession();
    } catch {
      clearToken();
    }
  }
  startRouter();
})();
