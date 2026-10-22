// Tiny shared helpers for the marketplace UI modules (ownerDashboard,
// adminPanel, ordersPanel, orderThread, shopListings) - kept here so
// each of those stays focused on its own screen instead of redefining
// the same two one-liners.

export function formatTHB(cents) {
  return `฿${(cents / 100).toFixed(2)}`;
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Safe in element text and in quoted attributes (title="...", src="..."). */
export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function statusLabel(status) {
  return (status || "").replaceAll("_", " ");
}

export function formatDate(isoString) {
  if (!isoString) return "unknown date";
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
