// Shared sidebar-nav behavior for the "dashboard shell" layout (see
// style.css's ".dashboard-shell" block): a sidebar of
// [data-dashboard-section] buttons and a content area with one
// [data-dashboard-panel] per section, only one visible at a time.
// Used by ownerDashboard.js, adminPanel.js, and ordersPanel.js so the
// click-to-switch-section wiring isn't written three times.
export function initDashboardNav(shellEl, { defaultSection } = {}) {
  const navButtons = Array.from(shellEl.querySelectorAll("[data-dashboard-section]"));
  const panels = Array.from(shellEl.querySelectorAll("[data-dashboard-panel]"));

  function setActive(name) {
    navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.dashboardSection === name));
    panels.forEach((p) => {
      p.hidden = p.dataset.dashboardPanel !== name;
    });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.hidden || btn.disabled) return;
      setActive(btn.dataset.dashboardSection);
    });
  });

  if (defaultSection) setActive(defaultSection);

  return { setActive };
}
