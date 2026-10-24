// The in-shop HUD (top-right): shop chat (with an unread count),
// notifications, and the ⊞ menu - a 3x3 grid holding everything else
// (shop listings, events, orders, decks, settings, ...). Takes the
// place of the topbar while you're inside a shop, so the 3D view gets
// the whole screen; new menu items only need another entry in `items`.

import { icon } from "./icons.js";
import { isTextInputFocused, shopKeysActive } from "../scene3d/input.js";

/**
 * @param {{ onToggleShopChat: () => void, onOpenNotifications: (anchor: HTMLElement) => void,
 *   items: Array<{ id: string, label: string, icon: string, onSelect: () => void, visible?: () => boolean }> }} opts
 */
export function initHud({ onToggleShopChat, onOpenNotifications, items }) {
  const root = document.getElementById("shop-hud");
  const chatBtn = document.getElementById("hud-chat-btn");
  const chatBadge = document.getElementById("hud-chat-badge");
  const bellBtn = document.getElementById("hud-bell-btn");
  const bellBadge = document.getElementById("hud-bell-badge");
  const menuBtn = document.getElementById("hud-menu-btn");
  const grid = document.getElementById("hud-menu");

  chatBtn.insertAdjacentHTML("afterbegin", icon("message-square", "icon-only"));
  bellBtn.insertAdjacentHTML("afterbegin", icon("bell", "icon-only"));
  menuBtn.insertAdjacentHTML("afterbegin", icon("layout-grid", "icon-only"));

  function setBadge(badge, count) {
    badge.hidden = count === 0;
    badge.textContent = count > 9 ? "9+" : String(count);
  }

  function renderItems() {
    grid.innerHTML = items
      .filter((item) => item.visible?.() ?? true)
      .map(
        (item) =>
          `<button type="button" role="menuitem" class="hud-menu-item" data-item="${item.id}">${icon(item.icon, "icon-only")}<span>${item.label}</span></button>`
      )
      .join("");
  }

  function openMenu() {
    renderItems();
    grid.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    grid.querySelector("button")?.focus();
  }

  function closeMenu({ refocus = false } = {}) {
    if (grid.hidden) return;
    grid.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    if (refocus) menuBtn.focus();
  }

  chatBtn.addEventListener("click", () => onToggleShopChat());
  bellBtn.addEventListener("click", () => onOpenNotifications(bellBtn));
  menuBtn.addEventListener("click", () => (grid.hidden ? openMenu() : closeMenu()));

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-item]");
    if (!btn) return;
    closeMenu();
    items.find((item) => item.id === btn.dataset.item)?.onSelect();
  });

  // Arrow keys move around the 3x3 grid; Escape closes back to the button.
  grid.addEventListener("keydown", (e) => {
    const buttons = [...grid.querySelectorAll("button")];
    const i = buttons.indexOf(document.activeElement);
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key];
    if (step && i >= 0) {
      e.preventDefault();
      e.stopPropagation(); // don't walk the character too
      buttons[Math.min(buttons.length - 1, Math.max(0, i + step))].focus();
    }
    if (e.key === "Escape") {
      e.stopPropagation(); // this Esc closes the menu - it mustn't also stand you up from a table
      closeMenu({ refocus: true });
    }
  });

  document.addEventListener("click", (e) => {
    if (!grid.hidden && !grid.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
  });

  // C / N / M press the matching HUD button (the label on each button
  // says which). e.code, not e.key, so they work on a Thai layout too.
  // Same rule as walking: not while typing, a dialog is up or a panel
  // is open over the shop - except M, which also closes its own menu.
  const shortcuts = { KeyC: chatBtn, KeyN: bellBtn, KeyM: menuBtn };
  window.addEventListener("keydown", (e) => {
    const btn = shortcuts[e.code];
    if (!btn || root.hidden || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTextInputFocused()) return;
    if (btn === menuBtn && !grid.hidden) {
      if (document.querySelector(".over-shop:not([hidden]), dialog[open]")) return;
      e.preventDefault();
      closeMenu({ refocus: true });
      return;
    }
    if (!shopKeysActive()) return;
    e.preventDefault();
    btn.click();
  });

  return {
    show(visible) {
      root.hidden = !visible;
      if (!visible) closeMenu();
    },
    setShopUnread(count) {
      setBadge(chatBadge, count);
    },
    setNotifCount(count) {
      setBadge(bellBadge, count);
    },
    setShopChatOpen(open) {
      chatBtn.setAttribute("aria-pressed", String(open));
    },
    closeMenu,
  };
}
