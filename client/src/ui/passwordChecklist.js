// Live, per-rule feedback for the "1 uppercase + 1 number + 1 special
// character + 8 chars min" password policy (see server/src/auth.js's
// isStrongPassword()/PASSWORD_REQUIREMENT_MESSAGE, which this list of
// rules must stay in sync with). Used by the register, reset-password,
// and settings "change password" forms - each has its own
// <input type="password"> plus a <ul class="password-rules"> of
// <li data-rule="...">  items right after it in index.html.
//
// Deliberately plain `input` events rather than the `:user-invalid`
// CSS pseudo-class used for the input's own border color: :user-invalid
// only flips once per field (after the first blur) and can't tell you
// which part of the pattern failed, just invalid-or-not. This needs to
// update every keystroke and say exactly which rule(s) are still
// unmet, so it's driven from JS instead.
//
// Only ONE failing rule is ever shown at a time (the first one in
// RULES order that still fails) rather than piling up every unmet
// rule at once - fix it and the next failing rule takes its place.

import { icon } from "./icons.js";

const RULES = [
  { key: "length", test: (value) => value.length >= 8 },
  { key: "upper", test: (value) => /[A-Z]/.test(value) },
  { key: "number", test: (value) => /\d/.test(value) },
  { key: "special", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

/**
 * @param {HTMLInputElement} input
 * @param {HTMLElement} list - the <ul> holding one <li data-rule="..."> per RULES entry
 */
export function attachPasswordChecklist(input, list) {
  if (!input || !list) return;

  const rows = RULES.map((rule) => ({
    rule,
    li: list.querySelector(`[data-rule="${rule.key}"]`),
  })).filter((row) => row.li);

  function update() {
    const value = input.value;
    // Before the user has typed anything, don't show anything at all -
    // an empty field obviously hasn't met any rule yet, but that's not
    // a useful thing to flag.
    const started = value.length > 0;

    // Walk RULES in order and surface only the first one that's still
    // failing. Everything after it stays hidden even if it's also
    // unmet - no point listing 3 problems when the user hasn't fixed
    // the first one yet.
    const current = started ? rows.find((row) => !row.rule.test(value)) : undefined;

    for (const row of rows) {
      const isShown = row === current;
      row.li.classList.toggle("unmet", isShown);

      const iconSlot = row.li.querySelector(".rule-icon");
      if (iconSlot) {
        iconSlot.innerHTML = isShown ? icon("x", "icon-only") : "";
      }
    }
  }

  input.addEventListener("input", update);
  update();
}

/**
 * Cross-field "does this match the password I just set" check for a
 * "Confirm password" input, reusing the exact same pop-one-chip-at-a-
 * time UI as attachPasswordChecklist() above (same CSS classes, same
 * .password-rules markup, just a single data-rule="match" <li>).
 *
 * @param {HTMLInputElement} passwordInput - the primary "new password" field
 * @param {HTMLInputElement} confirmInput - the "confirm password" field
 * @param {HTMLElement} list - the <ul> holding the single <li data-rule="match">
 */
export function attachConfirmPasswordCheck(passwordInput, confirmInput, list) {
  if (!passwordInput || !confirmInput || !list) return;

  const li = list.querySelector('[data-rule="match"]');
  if (!li) return;
  const iconSlot = li.querySelector(".rule-icon");

  function update() {
    const mismatch = confirmInput.value.length > 0 && confirmInput.value !== passwordInput.value;

    li.classList.toggle("unmet", mismatch);
    if (iconSlot) {
      iconSlot.innerHTML = mismatch ? icon("x", "icon-only") : "";
    }

    // Feed the result into the browser's own constraint validation too
    // (not just this visual chip), so a mismatched confirm field blocks
    // submit the same native way an unmet pattern/required field
    // already does - and so it picks up the shared
    // input:user-invalid border-color rule for free.
    confirmInput.setCustomValidity(mismatch ? "Passwords don't match." : "");
  }

  // Re-check on either field changing - editing the password after
  // already typing a confirmation should re-validate the match too.
  confirmInput.addEventListener("input", update);
  passwordInput.addEventListener("input", update);
  update();
}
