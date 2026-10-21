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

export function isTextInputFocused() {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export function createInput() {
  const held = new Set();
  let analog = { x: 0, y: 0 };

  const onKeyDown = (e) => {
    if (!(e.code in KEY_DIRS) || isTextInputFocused() || e.metaKey || e.ctrlKey || e.altKey) return;
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
