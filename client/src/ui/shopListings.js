// In-shop listings panel (#shop-listings-panel, in the game sidebar) -
// only shown while standing in an owner-created marketplace shop (see
// main.js's isOwnedShop flag from join-shop's ack). "Message seller"
// starts a new order (server/src/routes/orders.js's POST /orders) and
// hands off to ui/orderThread.js for the actual conversation, returning
// to the live game screen when the thread is closed.

import { shopListings as fetchListings, createOrder } from "../net/api.js";
import { formatTHB, escapeHtml } from "./format.js";
import { icon } from "./icons.js";

function el(id) {
  return document.getElementById(id);
}

export function initShopListings({ getToken, orderThread }) {
  const panel = el("shop-listings-panel");
  const listEl = el("shop-listings-list");
  const errorEl = el("shop-listings-error");

  let shopDbId = null;
  let listings = [];
  let composingId = null;

  function render() {
    if (listings.length === 0) {
      listEl.innerHTML = `<p class="list-empty">Nothing for sale here yet.</p>`;
      return;
    }
    listEl.innerHTML = listings
      .map((l) => {
        const composer =
          composingId === l.id
            ? `<div class="order-actions" style="margin-top:8px">
                 <input type="text" class="listing-compose-input" placeholder="Say hi to the seller..." maxlength="500" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:var(--text);font-size:13px" />
                 <button type="button" data-send="${l.id}">Send</button>
               </div>`
            : "";
        return `
          <div class="row" data-listing-id="${l.id}" style="flex-direction:column;align-items:stretch">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="row-main">
                <div class="row-title">${escapeHtml(l.title)} &middot; ${formatTHB(l.price_cents)}</div>
                <div class="row-meta">${l.description ? escapeHtml(l.description) : (l.stock_qty == null ? "in stock" : `${l.stock_qty} left`)}</div>
              </div>
              <div class="row-actions"><button type="button" data-message="${l.id}">${icon("message-square")}Message seller</button></div>
            </div>
            ${composer}
          </div>`;
      })
      .join("");
  }

  listEl.addEventListener("click", async (e) => {
    const messageId = e.target.dataset.message;
    const sendId = e.target.dataset.send;
    if (messageId) {
      composingId = composingId === messageId ? null : messageId;
      render();
      return;
    }
    if (sendId) {
      const input = listEl.querySelector(".listing-compose-input");
      const text = input?.value.trim();
      if (!text) return;
      errorEl.hidden = true;
      try {
        const { order } = await createOrder(getToken(), { listingId: sendId, message: text });
        composingId = null;
        await orderThread.open(order.id, { returnTo: el("game-screen") });
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    }
  });

  return {
    async loadForShop({ isOwnedShop, shopDbId: id }) {
      if (!isOwnedShop) {
        panel.hidden = true;
        shopDbId = null;
        return;
      }
      shopDbId = id;
      panel.hidden = false;
      try {
        const res = await fetchListings(shopDbId);
        listings = res.listings || [];
      } catch {
        listings = [];
      }
      composingId = null;
      render();
    },
  };
}
