// Themed <dialog> replacements for window.confirm()/window.prompt().
// showModal() gives focus-trapping, background inertness, and Esc-to-
// close for free - no custom keydown handling or [inert] needed. The
// only thing not universally supported yet is closedby="any" (backdrop
// click to dismiss, set in index.html's markup): Safari doesn't have
// it yet, so dialogsNeedingClickFallback() below adds the click-on-
// backdrop behavior by hand for browsers missing it. Esc already works
// everywhere `<dialog>` itself does, so that part needs no fallback.

function needsClosedByFallback() {
  return !("closedBy" in HTMLDialogElement.prototype);
}

// Applies the fallback once per dialog element (safe to call every
// time confirmDialog()/requestAccountDeletionDialog() runs - the
// `applied` flag on the element keeps a second listener from stacking).
function withClickOutsideFallback(dialog) {
  if (!needsClosedByFallback() || dialog.dataset.clickFallbackApplied) return;
  dialog.dataset.clickFallbackApplied = "true";
  dialog.addEventListener("click", (event) => {
    // showModal() makes the dialog itself fill the space behind its
    // content box, so a click that lands on the dialog element itself
    // (rather than something inside it) is a click on the backdrop.
    if (event.target === dialog) dialog.close();
  });
}

/**
 * Replaces `window.confirm(message)`.
 *
 * @param {string} message
 * @param {{ title?: string, confirmLabel?: string, danger?: boolean }} [options]
 * @returns {Promise<boolean>} resolves true only if "Confirm" was clicked/submitted
 */
export function confirmDialog(message, { title = "Are you sure?", confirmLabel = "Confirm", danger = false } = {}) {
  const dialog = document.getElementById("confirm-dialog");
  const titleEl = document.getElementById("confirm-dialog-title");
  const messageEl = document.getElementById("confirm-dialog-message");
  const confirmBtn = document.getElementById("confirm-dialog-confirm-btn");
  if (!dialog || !titleEl || !messageEl || !confirmBtn) {
    // Markup missing for some reason - fall back rather than throwing.
    return Promise.resolve(window.confirm(message));
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.classList.toggle("danger", danger);
  withClickOutsideFallback(dialog);

  return new Promise((resolve) => {
    // Reset before opening so dismissing via Esc or backdrop-click
    // (neither of which goes through the <form method="dialog">
    // submit, so returnValue wouldn't otherwise change) reads as
    // "cancelled" rather than whatever the last invocation left behind.
    dialog.returnValue = "";
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true }
    );
    dialog.showModal();
  });
}

/**
 * Replaces the old window.prompt() + window.confirm() pair used for
 * account-deletion requests, collecting the optional reason and the
 * confirmation in one dialog instead of two stacked browser popups.
 *
 * @returns {Promise<{ confirmed: boolean, reason: string }>}
 */
export function requestAccountDeletionDialog() {
  const dialog = document.getElementById("delete-account-dialog");
  const reasonInput = document.getElementById("delete-account-reason");
  if (!dialog || !reasonInput) {
    const confirmed = window.confirm("This asks an admin to permanently delete your account. Continue?");
    return Promise.resolve({ confirmed, reason: "" });
  }

  reasonInput.value = "";
  withClickOutsideFallback(dialog);

  return new Promise((resolve) => {
    dialog.returnValue = "";
    dialog.addEventListener(
      "close",
      () => resolve({ confirmed: dialog.returnValue === "confirm", reason: reasonInput.value.trim() }),
      { once: true }
    );
    dialog.showModal();
  });
}
