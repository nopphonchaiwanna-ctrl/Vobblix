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
} from "../net/api.js";
import { escapeHtml } from "./format.js";

function el(id) {
  return document.getElementById(id);
}

export function initAdminPanel({ getToken, onBack }) {
  const screen = el("admin-panel");
  const backBtn = el("admin-panel-back");
  const applicationsEl = el("admin-applications-list");
  const shopsEl = el("admin-shops-list");

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

  async function renderShops() {
    const { shops } = await adminListShops(getToken(), "pending_review");
    if (shops.length === 0) {
      shopsEl.innerHTML = `<p class="list-empty">No shops waiting for review.</p>`;
      return;
    }
    shopsEl.innerHTML = shops
      .map(
        (s) => `
          <div class="row" data-shop-id="${s.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(s.name)} <span class="row-meta">(${escapeHtml(s.code)})</span></div>
              <div class="row-meta">by ${escapeHtml(s.owner_name)} &lt;${escapeHtml(s.owner_email)}&gt; &middot; ${escapeHtml(s.description || "no description")}</div>
            </div>
            <div class="row-actions">
              <button type="button" data-shop-approve="${s.id}">Publish</button>
              <button type="button" class="secondary" data-shop-reject="${s.id}">Reject</button>
            </div>
          </div>`
      )
      .join("");
  }

  applicationsEl.addEventListener("click", async (e) => {
    const approveId = e.target.dataset.appApprove;
    const rejectId = e.target.dataset.appReject;
    if (approveId) {
      await adminApproveApplication(getToken(), approveId);
      renderApplications();
    } else if (rejectId) {
      const reason = window.prompt("Reason for rejecting this application (shown to the applicant):") || "";
      await adminRejectApplication(getToken(), rejectId, reason);
      renderApplications();
    }
  });

  shopsEl.addEventListener("click", async (e) => {
    const approveId = e.target.dataset.shopApprove;
    const rejectId = e.target.dataset.shopReject;
    if (approveId) {
      await adminApproveShop(getToken(), approveId);
      renderShops();
    } else if (rejectId) {
      const reason = window.prompt("Reason for rejecting this shop (shown to the owner):") || "";
      await adminRejectShop(getToken(), rejectId, reason);
      renderShops();
    }
  });

  backBtn.addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      document.querySelectorAll("#auth, #lobby, #game-screen, #owner-dashboard, #orders-panel, #order-thread, #settings-panel").forEach((s) => (s.hidden = true));
      screen.hidden = false;
      await Promise.all([renderApplications(), renderShops()]);
    },
  };
}
