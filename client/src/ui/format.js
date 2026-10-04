// Tiny shared helpers for the marketplace UI modules (ownerDashboard,
// adminPanel, ordersPanel, orderThread, shopListings) - kept here so
// each of those stays focused on its own screen instead of redefining
// the same two one-liners.

export function formatTHB(cents) {
  return `฿${(cents / 100).toFixed(2)}`;
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function statusLabel(status) {
  return (status || "").replaceAll("_", " ");
}
