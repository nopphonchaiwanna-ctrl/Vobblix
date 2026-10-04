// One order's negotiation thread (#order-thread in index.html) - shared
// by "My orders" (ui/ordersPanel.js) and a shop's listings panel
// (ui/shopListings.js), since both just need to open the same order by
// id and return to wherever they were opened from when closed. See
// server/src/routes/orders.js for the status-transition rules this
// mirrors client-side for which buttons to show.

import { getOrder, postOrderMessage, setOrderStatus } from "../net/api.js";
import { formatTHB, escapeHtml, statusLabel } from "./format.js";

function el(id) {
  return document.getElementById(id);
}

const NEXT_STATUS = {
  buyer: { inquiry: [["cancelled", "Cancel order"]], confirmed: [["cancelled", "Cancel order"]] },
  seller: {
    inquiry: [["confirmed", "Confirm order"], ["cancelled", "Decline"]],
    confirmed: [["completed", "Mark completed"], ["cancelled", "Cancel order"]],
  },
};

// Every other full-screen panel in the app - opening the thread hides
// whichever of these is currently showing; closing it restores whichever
// one the caller says to go back to (see `returnTo` in open()).
const SCREEN_IDS = ["lobby", "owner-dashboard", "admin-panel", "orders-panel", "game-screen"];

export function initOrderThread({ getToken, getUserId }) {
  const screen = el("order-thread");
  const backBtn = el("order-thread-back");
  const titleEl = el("order-thread-title");
  const metaEl = el("order-thread-meta");
  const actionsEl = el("order-thread-actions");
  const logEl = el("order-thread-log");
  const form = el("order-thread-form");
  const input = el("order-thread-input");
  const errorEl = el("order-thread-error");

  let current = null; // { order, messages }
  let returnToEl = null;

  function renderMessages() {
    logEl.innerHTML = current.messages
      .map(
        (m) =>
          `<div class="chat-msg"><span class="from">${escapeHtml(m.author_name)}:</span> ${escapeHtml(m.text)}</div>`
      )
      .join("");
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderHeader() {
    const { order } = current;
    const role = order.buyer_id === getUserId() ? "buyer" : "seller";
    titleEl.textContent = order.listing_title;
    metaEl.innerHTML =
      `${escapeHtml(order.shop_name)} &middot; qty ${order.quantity} &middot; ${formatTHB(order.price_cents_snapshot * order.quantity)} ` +
      `&middot; <span class="status-pill ${order.status}">${statusLabel(order.status)}</span> ` +
      `&middot; you're the ${role}`;

    const options = NEXT_STATUS[role]?.[order.status] || [];
    actionsEl.innerHTML = "";
    for (const [status, label] of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if (status === "cancelled") btn.className = "secondary";
      btn.addEventListener("click", () => changeStatus(status));
      actionsEl.appendChild(btn);
    }
  }

  async function changeStatus(status) {
    errorEl.hidden = true;
    try {
      const { order } = await setOrderStatus(getToken(), current.order.id, status);
      current.order = order;
      renderHeader();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  }

  async function open(orderId, { returnTo } = {}) {
    errorEl.hidden = true;
    try {
      const { order, messages } = await getOrder(getToken(), orderId);
      current = { order, messages };
      returnToEl = returnTo || null;
      renderHeader();
      renderMessages();
      for (const id of SCREEN_IDS) {
        const s = el(id);
        if (s) s.hidden = true;
      }
      screen.hidden = false;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  }

  function close() {
    screen.hidden = true;
    current = null;
    if (returnToEl) returnToEl.hidden = false;
    returnToEl = null;
  }

  backBtn.addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !current) return;
    errorEl.hidden = true;
    try {
      const { message } = await postOrderMessage(getToken(), current.order.id, text);
      current.messages.push(message);
      renderMessages();
      input.value = "";
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  return {
    open,
    close,
    // Called from main.js's socket listeners so a message/status change
    // from the other party shows up immediately if this thread happens
    // to be open right now (see routes/orders.js's `notify()`).
    handleIncomingMessage(orderId, message) {
      if (current?.order.id !== orderId) return;
      current.messages.push(message);
      renderMessages();
    },
    handleIncomingStatus(orderId, status) {
      if (current?.order.id !== orderId) return;
      current.order.status = status;
      renderHeader();
    },
  };
}
