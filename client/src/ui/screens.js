// Showing one full-screen panel (Settings, My orders, an order thread,
// Events, My decks) - the one place that knows every main screen id,
// instead of each panel hard-coding its own hide-list.
//
// Inside a shop (body.in-shop) the 3D shop stays visible and running
// underneath: the panel opens as an overlay (.over-shop) so the
// player's character, their table seat and any live call carry on, and
// closing the panel drops them straight back where they were.

const SCREEN_IDS = [
  "auth",
  "lobby",
  "game-screen",
  "owner-dashboard",
  "admin-panel",
  "orders-panel",
  "order-thread",
  "settings-panel",
  "events-panel",
  "decks-panel",
  "history-panel",
];

export function showPanelScreen(panelEl) {
  const overShop = document.body.classList.contains("in-shop");
  for (const id of SCREEN_IDS) {
    const s = document.getElementById(id);
    if (!s || s === panelEl) continue;
    if (overShop && id === "game-screen") continue;
    s.hidden = true;
  }
  panelEl.classList.toggle("over-shop", overShop);
  panelEl.hidden = false;
}
