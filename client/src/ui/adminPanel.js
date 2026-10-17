// Admin review screen (#admin-panel): shop-owner applications and
// owner-created shops waiting for review. Only reachable when
// session.user.role === "admin" (set with server/scripts/set-role.js -
// see README, there's no self-service path to become admin).

import {
  adminListApplications,
  adminApproveApplication,
  adminRejectApplication,
  adminListShops,
  adminApproveShop,
  adminRejectShop,
  adminListCentralShops,
  adminCreateCentralShop,
  adminListShopReviews,
  adminGetShopReviews,
  shopTemplates,
} from "../net/api.js";
import { escapeHtml, formatDate, statusLabel } from "./format.js";
import { initDashboardNav } from "./dashboardNav.js";
import { fileToResizedDataUrl } from "./imageUpload.js";
import { icon } from "./icons.js";
import { showToast } from "./toast.js";

function el(id) {
  return document.getElementById(id);
}

export function initAdminPanel({ getToken, onBack }) {
  const screen = el("admin-panel");
  const backBtn = el("admin-panel-back");
  const applicationsEl = el("admin-applications-list");
  const shopsEl = el("admin-shops-list");
  const dashboardNav = initDashboardNav(screen.querySelector(".dashboard-shell"), { defaultSection: "applications" });

  // ---------- Shop-detail page (a closer look before approve/reject) ----------
  // A real screen swap inside this section (list <-> detail), not a
  // popup - same pattern as the events panel's own list/detail modes
  // (see eventsPanel.js's renderList()/renderDetail()). Rejecting only
  // happens from the detail page now, since it needs a typed reason
  // (server/src/routes/admin.js requires one) that the compact list
  // row has no room for - the list keeps a one-click Publish button
  // for the no-reason-needed case, but no quick-reject button anymore.
  const shopsHeading = el("admin-shops-heading");
  let shopsMode = "list"; // 'list' | 'detail'
  // Keyed by shop id so opening the detail page re-uses the full row
  // (theme, layout_template_id, logo_url, created_at, ...)
  // adminListShops() already returned, without a second fetch.
  let pendingShopsById = new Map();

  // ---------- Central ("admin") shops ----------
  const centralShopsEl = el("admin-central-shops-list");
  const centralForm = el("central-shop-form");
  const centralNameInput = el("central-shop-name");
  const centralCodeInput = el("central-shop-code");
  const centralDescInput = el("central-shop-description");
  const centralThemeSelect = el("central-shop-theme");
  const centralSubmitBtn = el("central-shop-submit");
  const centralFormError = el("central-shop-error");
  const centralLogoPreview = el("central-shop-logo-preview");
  const centralLogoFallback = el("central-shop-logo-fallback");
  const centralLogoFileInput = el("central-shop-logo-file");
  const centralLogoChooseBtn = el("central-shop-logo-choose-btn");
  const centralLogoRemoveBtn = el("central-shop-logo-remove-btn");
  const centralLogoError = el("central-shop-logo-error");

  // Same picked-from-disk, resized-client-side pattern as the owner
  // dashboard's shop logo - see imageUpload.js's fileToResizedDataUrl().
  let centralLogoValue = "";
  const MAX_LOGO_DIMENSION = 256;
  const MAX_LOGO_SOURCE_BYTES = 12 * 1024 * 1024; // 12MB raw upload, before resizing
  let centralThemesLoaded = false;

  function setCentralLogoPreview(url) {
    centralLogoPreview.hidden = !url;
    centralLogoPreview.src = url || "";
    centralLogoFallback.hidden = Boolean(url);
    centralLogoRemoveBtn.hidden = !url;
  }

  centralLogoChooseBtn.addEventListener("click", () => centralLogoFileInput.click());

  centralLogoFileInput.addEventListener("change", async () => {
    const file = centralLogoFileInput.files?.[0];
    centralLogoFileInput.value = "";
    if (!file) return;
    centralLogoError.hidden = true;
    try {
      centralLogoValue = await fileToResizedDataUrl(file, {
        maxDimension: MAX_LOGO_DIMENSION,
        maxSourceBytes: MAX_LOGO_SOURCE_BYTES,
      });
      setCentralLogoPreview(centralLogoValue);
    } catch (err) {
      centralLogoError.textContent = err.message;
      centralLogoError.hidden = false;
    }
  });

  centralLogoRemoveBtn.addEventListener("click", () => {
    centralLogoValue = "";
    setCentralLogoPreview("");
  });

  // { templates, themes } from GET /shops/templates - shared between the
  // central-shop create form's theme <select> and the shop-detail
  // dialog's theme/layout labels below, so it's only fetched once.
  let shopTemplatesData = null;
  async function loadShopTemplatesData() {
    if (!shopTemplatesData) shopTemplatesData = await shopTemplates();
    return shopTemplatesData;
  }

  async function loadCentralThemesOnce() {
    if (centralThemesLoaded) return;
    const { themes } = await loadShopTemplatesData();
    centralThemeSelect.innerHTML = themes.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join("");
    centralThemesLoaded = true;
  }

  function themeLabel(themeId) {
    const match = shopTemplatesData?.themes.find((t) => t.id === themeId);
    return match ? match.label : themeId || "default theme";
  }

  function layoutLabel(templateId) {
    if (!templateId) return "default layout";
    const match = shopTemplatesData?.templates.find((t) => t.id === templateId);
    return match ? match.label : templateId;
  }

  async function renderCentralShops() {
    await loadCentralThemesOnce();
    const { shops } = await adminListCentralShops(getToken());
    if (shops.length === 0) {
      centralShopsEl.innerHTML = `<p class="list-empty">No central shops yet - create one above.</p>`;
      return;
    }
    centralShopsEl.innerHTML = shops
      .map(
        (s) => `
          <div class="row" data-central-shop-id="${s.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(s.name)} <span class="row-meta">(${escapeHtml(s.code)})</span></div>
              <div class="row-meta">created by ${escapeHtml(s.creator_name)} &middot; ${escapeHtml(s.description || "no description")}</div>
            </div>
            <span class="status-pill ${escapeHtml(s.status)}">${escapeHtml(s.status)}</span>
          </div>`
      )
      .join("");
  }

  centralForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    centralFormError.hidden = true;
    try {
      await adminCreateCentralShop(getToken(), {
        name: centralNameInput.value.trim(),
        code: centralCodeInput.value.trim().toLowerCase(),
        description: centralDescInput.value.trim(),
        theme: centralThemeSelect.value,
        logoUrl: centralLogoValue,
      });
      centralForm.reset();
      centralLogoValue = "";
      setCentralLogoPreview("");
      await renderCentralShops();
    } catch (err) {
      centralFormError.textContent = err.message;
      centralFormError.hidden = false;
    }
  });

  // ---------- Review history (migration 016's shop_review_events) ----------
  const historyEl = el("admin-review-history-list");
  const historyFilter = el("admin-review-history-filter");
  const historyFilterLabel = historyFilter.closest("label");
  let historyEvents = [];
  let historyMode = "list"; // 'list' | 'detail'

  const ACTION_LABELS = {
    submitted: "Submitted",
    resubmitted: "Resubmitted",
    published: "Approved",
    rejected: "Rejected",
  };

  // Re-uses the existing status-pill colors (amber/green/red).
  const ACTION_PILL = { submitted: "pending_review", resubmitted: "pending_review", published: "published", rejected: "rejected" };

  function formatDateTime(iso) {
    return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderHistoryList() {
    historyMode = "list";
    historyFilterLabel.hidden = false;
    const f = historyFilter.value;
    const rows = historyEvents.filter((e) => !f || e.action === f || (f === "submitted" && e.action === "resubmitted"));
    if (rows.length === 0) {
      historyEl.innerHTML = `<p class="list-empty">Nothing here yet.</p>`;
      return;
    }
    historyEl.innerHTML = rows
      .map((e) => {
        // Who did it: the admin for approve/reject, the owner for submits.
        const byWhom = e.actor_name ? ` by ${escapeHtml(e.actor_name)}` : "";
        return `
          <div class="row review-history-row" data-history-shop-id="${escapeHtml(e.shop_id)}">
            <span class="status-pill ${ACTION_PILL[e.action] || ""}">${escapeHtml(ACTION_LABELS[e.action] || e.action)}</span>
            <div class="row-main">
              <div class="row-title">${escapeHtml(e.shop_name)} <span class="row-meta">(${escapeHtml(e.shop_code)})</span></div>
              <div class="row-meta">${formatDateTime(e.created_at)}${byWhom} &middot; owner ${escapeHtml(e.owner_name || "unknown")} &middot; now ${escapeHtml(statusLabel(e.shop_status))}</div>
              ${e.reason ? `<div class="review-history-reason">Reason: ${escapeHtml(e.reason)}</div>` : ""}
            </div>
          </div>`;
      })
      .join("");
  }

  async function renderHistory() {
    const { events } = await adminListShopReviews(getToken());
    historyEvents = events;
    // Don't yank the admin out of a detail page they're reading just
    // because an approve/reject elsewhere refreshed the list.
    if (historyMode === "list") renderHistoryList();
  }

  /** One shop as it is now, plus its whole review timeline (oldest first). */
  function renderHistoryDetail({ shop, events }) {
    historyMode = "detail";
    historyFilterLabel.hidden = true;
    const logoHtml = shop.logo_url
      ? `<img class="settings-avatar-preview" src="${escapeHtml(shop.logo_url)}" alt="Shop logo" />`
      : `<div class="settings-avatar-fallback">${icon("store", "icon-only")}</div>`;
    const timeline = events
      .map((e) => {
        const byWhom = e.actor_name ? ` by ${escapeHtml(e.actor_name)}` : "";
        return `
          <div class="row review-history-row">
            <span class="status-pill ${ACTION_PILL[e.action] || ""}">${escapeHtml(ACTION_LABELS[e.action] || e.action)}</span>
            <div class="row-main">
              <div class="row-meta">${formatDateTime(e.created_at)}${byWhom}</div>
              ${e.reason ? `<div class="review-history-reason">Reason: ${escapeHtml(e.reason)}</div>` : ""}
            </div>
          </div>`;
      })
      .join("");
    historyEl.innerHTML = `
      <p><button type="button" class="link-btn" data-action="history-back-to-list">&larr; All review history</button></p>
      <div class="shop-detail-header">
        ${logoHtml}
        <div class="shop-detail-heading">
          <div class="row-title">${escapeHtml(shop.name)} <span class="row-meta">(${escapeHtml(shop.code)})</span></div>
          <div class="row-meta">by ${escapeHtml(shop.owner_name)} &lt;${escapeHtml(shop.owner_email)}&gt; &middot; created ${formatDate(shop.created_at)}</div>
        </div>
        <span class="status-pill ${escapeHtml(shop.status)}">${escapeHtml(statusLabel(shop.status))}</span>
      </div>
      <div class="row-meta">${escapeHtml(themeLabel(shop.theme))} theme &middot; ${escapeHtml(layoutLabel(shop.layout_template_id))}</div>
      <p>${escapeHtml(shop.description || "No description provided.")}</p>
      <h3 class="panel-subhead">Timeline</h3>
      ${timeline || `<p class="list-empty">No review events for this shop.</p>`}`;
  }

  historyFilter.addEventListener("change", renderHistoryList);

  historyEl.addEventListener("click", async (e) => {
    if (e.target.closest("[data-action='history-back-to-list']")) {
      renderHistoryList();
      return;
    }
    if (historyMode !== "list") return;
    const row = e.target.closest(".row[data-history-shop-id]");
    if (!row) return;
    try {
      const [detail] = await Promise.all([adminGetShopReviews(getToken(), row.dataset.historyShopId), loadShopTemplatesData()]);
      renderHistoryDetail(detail);
    } catch (err) {
      showToast(`Couldn't open this shop's history: ${err.message}`);
    }
  });

  async function renderApplications() {
    const { applications } = await adminListApplications(getToken(), "pending");
    if (applications.length === 0) {
      applicationsEl.innerHTML = `<p class="list-empty">No pending applications.</p>`;
      return;
    }
    applicationsEl.innerHTML = applications
      .map(
        (a) => `
          <div class="row" data-app-id="${a.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(a.display_name)} &lt;${escapeHtml(a.email)}&gt;</div>
              <div class="row-meta">${escapeHtml(a.message || "(no message)")}</div>
            </div>
            <div class="row-actions">
              <button type="button" data-app-approve="${a.id}">Approve</button>
              <button type="button" class="secondary" data-app-reject="${a.id}">Reject</button>
            </div>
          </div>`
      )
      .join("");
  }

  function renderShopRow(s) {
    return `
          <div class="row" data-shop-id="${s.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(s.name)} <span class="row-meta">(${escapeHtml(s.code)})</span></div>
              <div class="row-meta">by ${escapeHtml(s.owner_name)} &lt;${escapeHtml(s.owner_email)}&gt; &middot; ${escapeHtml(s.description || "no description")}</div>
            </div>
            <div class="row-actions">
              <button type="button" data-shop-approve="${s.id}">Publish</button>
            </div>
          </div>`;
  }

  function renderShopsList() {
    shopsMode = "list";
    shopsHeading.textContent = "Shops pending review";
    const shops = [...pendingShopsById.values()];
    shopsEl.innerHTML =
      shops.length === 0 ? `<p class="list-empty">No shops waiting for review.</p>` : shops.map(renderShopRow).join("");
  }

  /** Full detail page for one pending shop - logo, theme/layout, the
   *  untruncated description, and the only place left to reject (it
   *  needs a typed reason the compact list row has no room for - see
   *  the textarea below and server/src/routes/admin.js, which now
   *  requires one so rejecting always gives the owner something to
   *  act on). Rejecting pushes a realtime notice to the owner too -
   *  see main.js's "shop:rejected" socket listener. */
  function renderShopDetail(shop) {
    shopsMode = "detail";
    shopsHeading.textContent = shop.name;
    const logoHtml = shop.logo_url
      ? `<img class="settings-avatar-preview" src="${escapeHtml(shop.logo_url)}" alt="Shop logo" />`
      : `<div class="settings-avatar-fallback">${icon("store", "icon-only")}</div>`;
    shopsEl.innerHTML = `
      <p><button type="button" class="link-btn" data-action="shop-back-to-list">&larr; All pending shops</button></p>
      <div class="shop-detail-header">
        ${logoHtml}
        <div class="shop-detail-heading">
          <div class="row-title">${escapeHtml(shop.name)} <span class="row-meta">(${escapeHtml(shop.code)})</span></div>
          <div class="row-meta">by ${escapeHtml(shop.owner_name)} &lt;${escapeHtml(shop.owner_email)}&gt; &middot; applied ${formatDate(shop.created_at)}</div>
        </div>
      </div>
      <div class="row-meta">${escapeHtml(themeLabel(shop.theme))} theme &middot; ${escapeHtml(layoutLabel(shop.layout_template_id))}</div>
      <p>${escapeHtml(shop.description || "No description provided.")}</p>
      <div class="row-actions">
        <button type="button" data-shop-approve="${shop.id}">Publish</button>
      </div>
      <div class="shop-detail-reject">
        <label for="shop-reject-reason">Reason for rejecting (shown to the owner so they can fix it and resubmit)</label>
        <textarea id="shop-reject-reason" rows="3" placeholder="e.g. logo is hard to read, description needs more detail..."></textarea>
        <p class="error" id="shop-reject-error" hidden>Enter a reason so the owner knows what to fix.</p>
        <button type="button" class="secondary danger" data-shop-reject="${shop.id}">Reject with this reason</button>
      </div>`;
  }

  async function renderShops() {
    const [{ shops }] = await Promise.all([adminListShops(getToken(), "pending_review"), loadShopTemplatesData()]);
    pendingShopsById = new Map(shops.map((s) => [s.id, s]));
    renderShopsList();
  }

  applicationsEl.addEventListener("click", async (e) => {
    const approveId = e.target.dataset.appApprove;
    const rejectId = e.target.dataset.appReject;
    try {
      if (approveId) {
        await adminApproveApplication(getToken(), approveId);
        showToast("Application approved - they're a shop owner now.");
        renderApplications();
      } else if (rejectId) {
        const reason = window.prompt("Reason for rejecting this application (shown to the applicant):") || "";
        await adminRejectApplication(getToken(), rejectId, reason);
        showToast("Application rejected.");
        renderApplications();
      }
    } catch (err) {
      showToast(`Couldn't update the application: ${err.message}`);
    }
  });

  shopsEl.addEventListener("click", async (e) => {
    const approveId = e.target.dataset.shopApprove;
    const rejectId = e.target.dataset.shopReject;

    if (approveId) {
      try {
        const { shop } = await adminApproveShop(getToken(), approveId);
        showToast(`"${shop.name}" is published - the owner has been notified.`);
        await Promise.all([renderShops(), renderHistory()]);
      } catch (err) {
        showToast(`Couldn't publish this shop: ${err.message}`);
      }
      return;
    }
    if (rejectId) {
      const textarea = el("shop-reject-reason");
      const reason = textarea.value.trim();
      if (!reason) {
        el("shop-reject-error").hidden = false;
        textarea.focus();
        return;
      }
      try {
        const { shop } = await adminRejectShop(getToken(), rejectId, reason);
        showToast(`"${shop.name}" was rejected - the owner has been notified.`);
        await Promise.all([renderShops(), renderHistory()]);
      } catch (err) {
        showToast(`Couldn't reject this shop: ${err.message}`);
      }
      return;
    }
    if (e.target.dataset.action === "shop-back-to-list") {
      renderShopsList();
      return;
    }
    // Anywhere else on a row (list mode only - the detail page has no
    // more rows to click into) opens the full detail page.
    if (shopsMode !== "list") return;
    const row = e.target.closest(".row[data-shop-id]");
    if (!row) return;
    const shop = pendingShopsById.get(row.dataset.shopId);
    if (shop) renderShopDetail(shop);
  });

  backBtn.addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      document.querySelectorAll("#auth, #lobby, #game-screen, #owner-dashboard, #orders-panel, #order-thread, #settings-panel, #events-panel, #decks-panel").forEach((s) => (s.hidden = true));
      screen.hidden = false;
      dashboardNav.setActive("applications");
      historyMode = "list";
      await Promise.all([renderApplications(), renderShops(), renderCentralShops(), renderHistory()]);
    },
  };
}
