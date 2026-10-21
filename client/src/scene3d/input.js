// Keyboard (and, on touch screens, the thumbstick - see setAnalog)
// movement input for the 3D shop.
//
// Same rule the Phaser scene had: arrow keys / WASD move the character
// and have their default (page scroll) suppressed - but only while no
// text field has focus, so typing "wasd" or using the arrow keys inside
// the shop/table chat boxes still works normally there.

const KEY_DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

/**
 * Whether the shop's own keys (walking, E/Enter to interact) should act
 * right now: not while a panel is open over the shop (Settings, Orders,
 * ...), the ⊞ menu is open, or a dialog is up - those keys belong to
 * whatever the player is looking at. `doc` is a parameter for tests.
 */
export function shopKeysActive(doc = document) {
  return !doc.querySelector(".over-shop:not([hidden]), #hud-menu:not([hidden]), dialog[open]");
}

export function isTextInputFocused() {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

import { joystickVector } from "./joystick.js";

/**
 * On-screen thumbstick: drag inside `baseEl`; calls onVector({x, y})
 * (length <= 1, floor space - up on screen is -y) as the thumb moves,
 * and {0, 0} on release. Every way a touch can end - lifting the thumb,
 * the OS cancelling it (a notification, rotation), losing capture, the
 * tab going to the background - releases, so the character never keeps
 * walking on its own. Returns a detach function.
 */
export function attachJoystick(baseEl, knobEl, onVector) {
  let activeId = null;
  let center = null;
  const radius = () => baseEl.clientWidth / 2;

  function move(e) {
    const dx = e.clientX - center.x;
    const dy = e.clientY - center.y;
    const v = joystickVector(dx, dy, radius());
    knobEl.style.transform = `translate(${v.x * radius() * 0.6}px, ${v.y * radius() * 0.6}px)`;
    onVector(v);
  }

  function release() {
    if (activeId === null) return;
    activeId = null;
    knobEl.style.transform = "";
    onVector({ x: 0, y: 0 });
  }

  const onDown = (e) => {
    if (activeId !== null) return;
    activeId = e.pointerId;
    const r = baseEl.getBoundingClientRect();
    center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    baseEl.setPointerCapture(e.pointerId);
    e.preventDefault();
    move(e);
  };
  const onMove = (e) => {
    if (e.pointerId === activeId) move(e);
  };
  const onEnd = (e) => {
    if (e.pointerId === activeId) release();
  };
  const onHidden = () => {
    if (document.hidden) release();
  };

  baseEl.addEventListener("pointerdown", onDown);
  baseEl.addEventListener("pointermove", onMove);
  baseEl.addEventListener("pointerup", onEnd);
  baseEl.addEventListener("pointercancel", onEnd);
  baseEl.addEventListener("lostpointercapture", onEnd);
  document.addEventListener("visibilitychange", onHidden);

  return () => {
    release();
    baseEl.removeEventListener("pointerdown", onDown);
    baseEl.removeEventListener("pointermove", onMove);
    baseEl.removeEventListener("pointerup", onEnd);
    baseEl.removeEventListener("pointercancel", onEnd);
    baseEl.removeEventListener("lostpointercapture", onEnd);
    document.removeEventListener("visibilitychange", onHidden);
  };
}

export function createInput() {
  const held = new Set();
  let analog = { x: 0, y: 0 };

  const onKeyDown = (e) => {
    if (!(e.code in KEY_DIRS) || isTextInputFocused() || !shopKeysActive() || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    held.add(e.code);
  };
  const onKeyUp = (e) => held.delete(e.code);
  // Keys released while focus was elsewhere (another window, a chat box)
  // never send keyup here - drop everything rather than walk forever.
  const clear = () => held.clear();
  const onFocusIn = () => {
    if (isTextInputFocused()) clear();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clear);
  document.addEventListener("focusin", onFocusIn);

  return {
    /** Current direction in floor space; keyboard is unit length, the stick analog. */
    getDirection() {
      let x = analog.x;
      let y = analog.y;
      for (const code of held) {
        x += KEY_DIRS[code][0];
        y += KEY_DIRS[code][1];
      }
      return { x, y };
    },
    setAnalog(vec) {
      analog = vec;
    },
    clear() {
      clear();
      analog = { x: 0, y: 0 };
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      document.removeEventListener("focusin", onFocusIn);
    },
  };
}
