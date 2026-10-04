// Owner dashboard (#owner-dashboard): create/edit your one shop
// (template + theme + logo, not freeform design - see README's
// "Becoming a shop owner") and manage its listings. Only reachable once
// session.user.role === "shop_owner".

import {
  shopTemplates,
  myShop,
  createShop,
  updateShop,
  createListing,
  updateListing,
} from "../net/api.js";
import { formatTHB, escapeHtml, statusLabel } from "./format.js";

function el(id) {
  return document.getElementById(id);
}

const STATUS_HINTS = {
  draft: "Draft - not submitted yet.",
  pending_review: "Submitted - waiting for an admin to review it before it's visible to other players.",
  published: "Published - anyone can join it by its shop code, or find it in the lobby's shop list.",
  rejected: "Rejected.",
  suspended: "Suspended by an admin.",
};

export function initOwnerDashboard({ getToken, onBack, onShopChanged }) {
  const screen = el("owner-dashboard");
  const backBtn = el("owner-dashboard-back");
  const statusEl = el("owner-shop-status");

  const form = el("owner-shop-form");
  const nameInput = el("owner-shop-name");
  const codeInput = el("owner-shop-code");
  const descInput = el("owner-shop-description");
  const templateSelect = el("owner-shop-template");
  const themeSelect = el("owner-shop-theme");
  const logoInput = el("owner-shop-logo");
  const submitBtn = el("owner-shop-submit");
  const formError = el("owner-shop-error");

  const listingsSection = el("owner-listings-section");
  const listingsList = el("owner-listings-list");
  const listingForm = el("owner-listing-form");
  const listingTitle = el("listing-title");
  const listingPrice = el("listing-price");
  const listingStock = el("listing-stock");
  const listingDesc = el("listing-description");
  const listingPhoto = el("listing-photo");
  const listingError = el("owner-listing-error");

  let shop = null;
  let listings = [];
  let templatesLoaded = false;

  async function loadTemplatesOnce() {
    if (templatesLoaded) return;
    const { templates, themes } = await shopTemplates();
    templateSelect.innerHTML = templates.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join("");
    themeSelect.innerHTML = themes.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join("");
    templatesLoaded = true;
  }

  function fillForm() {
    nameInput.value = shop?.name || "";
    codeInput.value = shop?.code || "";
    codeInput.disabled = !!shop; // the join code is fixed once the shop exists
    descInput.value = shop?.description || "";
    if (shop?.layout_template_id) templateSelect.value = shop.layout_template_id;
    if (shop?.theme) themeSelect.value = shop.theme;
    logoInput.value = shop?.logo_url || "";
    submitBtn.textContent = shop ? "Save changes" : "Create shop & submit for review";
  }

  function renderStatus() {
    if (!shop) {
      statusEl.textContent = "You don't have a shop yet - fill in the form below to create one.";
      listingsSection.hidden = true;
      return;
    }
    let text = STATUS_HINTS[shop.status] || shop.status;
    if (shop.status === "rejected" && shop.rejection_reason) {
      text += ` Reason: ${shop.rejection_reason}`;
    }
    statusEl.textContent = text;
    listingsSection.hidden = false;
  }

  function renderListings() {
    if (listings.length === 0) {
      listingsList.innerHTML = `<p class="list-empty">No listings yet - add your first item below.</p>`;
      return;
    }
    listingsList.innerHTML = listings
      .map(
        (l) => `
          <div class="row" data-listing-id="${l.id}">
            <div class="row-main">
              <div class="row-title">${escapeHtml(l.title)} &middot; ${formatTHB(l.price_cents)}</div>
              <div class="row-meta">${l.stock_qty == null ? "unlimited stock" : `${l.stock_qty} in stock`}</div>
            </div>
            <span class="status-pill ${l.status}">${statusLabel(l.status)}</span>
            <div class="row-actions">
              ${
                l.status === "archived"
                  ? ""
                  : `<button type="button" data-toggle="${l.id}">${l.status === "active" ? "Pause" : "Resume"}</button>
                     <button type="button" class="secondary" data-archive="${l.id}">Archive</button>`
              }
            </div>
          </div>`
      )
      .join("");
  }

  async function refreshFromServer() {
    const res = await myShop(getToken());
    shop = res.shop;
    listings = res.listings || [];
    fillForm();
    renderStatus();
    renderListings();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.hidden = true;
    const fields = {
      name: nameInput.value.trim(),
      description: descInput.value.trim(),
      layoutTemplateId: templateSelect.value,
      theme: themeSelect.value,
      logoUrl: logoInput.value.trim(),
    };
    try {
      if (shop) {
        const res = await updateShop(getToken(), shop.id, fields);
        shop = res.shop;
      } else {
        const res = await createShop(getToken(), { ...fields, code: codeInput.value.trim().toLowerCase() });
        shop = res.shop;
      }
      fillForm();
      renderStatus();
      renderListings();
      onShopChanged?.(shop);
    } catch (err) {
      formError.textContent = err.message;
      formError.hidden = false;
    }
  });

  listingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    listingError.hidden = true;
    try {
      const { listing } = await createListing(getToken(), shop.id, {
        title: listingTitle.value.trim(),
        priceCents: Math.round(Number(listingPrice.value) * 100),
        stockQty: listingStock.value === "" ? null : Number(listingStock.value),
        description: listingDesc.value.trim(),
        photoUrl: listingPhoto.value.trim(),
      });
      listings.unshift(listing);
      renderListings();
      listingForm.reset();
    } catch (err) {
      listingError.textContent = err.message;
      listingError.hidden = false;
    }
  });

  listingsList.addEventListener("click", async (e) => {
    const toggleId = e.target.dataset.toggle;
    const archiveId = e.target.dataset.archive;
    const id = toggleId || archiveId;
    if (!id) return;
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;
    const nextStatus = archiveId ? "archived" : listing.status === "active" ? "sold_out" : "active";
    const { listing: updated } = await updateListing(getToken(), shop.id, id, { status: nextStatus });
    listings = listings.map((l) => (l.id === id ? updated : l));
    renderListings();
  });

  backBtn.addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      document.querySelectorAll("#auth, #lobby, #game-screen, #admin-panel, #orders-panel, #order-thread, #settings-panel").forEach((s) => (s.hidden = true));
      screen.hidden = false;
      await loadTemplatesOnce();
      await refreshFromServer();
    },
  };
}
