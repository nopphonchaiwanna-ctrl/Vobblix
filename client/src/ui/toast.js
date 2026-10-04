// Floating order-alert toasts (see main.js's order:new/order:message/
// order:status socket listeners and the Notifications settings in
// ui/settings.js). Deliberately not the browser Notification API - that
// needs its own OS-level permission prompt and (on most browsers) only
// fires while the tab/window is unfocused; this is a plain in-app
// banner that shows up regardless of focus, which is enough for an app
// where orders only matter while you're actually using it.

import { icon } from "./icons.js";

function el(id) {
  return document.getElementById(id);
}

const DEFAULT_DURATION_MS = 6000;
// Keep in sync with .toast's transition duration in style.css.
const FADE_OUT_MS = 200;

/**
 * @param {string} message
 * @param {{ onClick?: () => void, duration?: number }} [options]
 */
export function showToast(message, { onClick, duration = DEFAULT_DURATION_MS } = {}) {
  const container = el("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  if (onClick) {
    toast.classList.add("clickable");
    toast.addEventListener("click", () => {
      onClick();
      dismiss();
    });
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close";
  closeBtn.innerHTML = icon("x", "icon-only");
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // don't also trigger the toast's own onClick
    dismiss();
  });
  toast.appendChild(closeBtn);

  container.appendChild(toast);
  // 0 -> 1 toasts: open the popover so this (and any that stack on top
  // of it) render in the browser's top layer, above everything else in
  // the page, with no z-index guesswork needed. showPopover() is
  // undefined on browsers that don't support the Popover API yet, so
  // `?.()` just quietly no-ops there - style.css's z-index fallback on
  // .toast-container is what keeps it on top in that case instead.
  if (container.childElementCount === 1) container.showPopover?.();

  let timer = window.setTimeout(dismiss, duration);
  function dismiss() {
    if (toast.classList.contains("leaving")) return; // already dismissing - e.g. clicked while the timer was also about to fire
    window.clearTimeout(timer);
    toast.classList.add("leaving");
    window.setTimeout(() => {
      toast.remove();
      // Last toast gone - close the popover too (no-op if unsupported).
      if (container.childElementCount === 0) container.hidePopover?.();
    }, FADE_OUT_MS);
  }
}
