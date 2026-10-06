// "My orders" screen (#orders-panel) - every buy/sell thread the account
// is part of, as either buyer or seller. Opening a row hands off to
// ui/orderThread.js for the actual conversation.

import { myOrders } from "../net/api.js";
import { formatTHB, escapeHtml, statusLabel } from "./format.js";
import { initDashboardNav } from "./dashboardNav.js";

function el(id) {
  return document.getElementById(id);
}

export function initOrdersPanel({ getToken, getUserId, orderThread, onBack }) {
  const screen = el("orders-panel");
  const backBtn = el("orders-panel-back");
  const listEl = el("orders-list");
  // Only one section today ("All orders"), but shares the same
  // dashboard-shell chrome as owner-dashboard/admin-panel for visual
  // consistency rather than keeping the old floating-card look.
  initDashboardNav(screen.querySelector(".dashboard-shell"), { defaultSection: "orders" });

  async function render() {
    const { orders } = await myOrders(getToken());
    if (orders.length === 0) {
      listEl.innerHTML = `<p class="list-empty">No orders yet - browse a shop's listings and message a seller to start one.</p>`;
      return;
    }
    listEl.innerHTML = orders
      .map((o) => {
        const role = o.buyer_id === getUserId() ? "buying from " + o.seller_name : "selling to " + o.buyer_name;
        return `
          <div class="row" data-order-id="${o.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(o.listing_title)}</div>
              <div class="row-meta">${escapeHtml(o.shop_name)} &middot; ${escapeHtml(role)} &middot; ${formatTHB(o.price_cents_snapshot * o.quantity)}</div>
            </div>
            <span class="status-pill ${o.status}">${statusLabel(o.status)}</span>
            <div class="row-actions"><button type="button" data-open="${o.id}">Open</button></div>
          </div>`;
      })
      .join("");
  }

  listEl.addEventListener("click", (e) => {
    const id = e.target.dataset.open;
    if (id) orderThread.open(id, { returnTo: screen });
  });

  backBtn.addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      document.querySelectorAll("#auth, #lobby, #game-screen, #owner-dashboard, #admin-panel, #order-thread, #settings-panel, #events-panel").forEach((s) => (s.hidden = true));
      screen.hidden = false;
      await render();
    },
    refresh: render,
  };
}
