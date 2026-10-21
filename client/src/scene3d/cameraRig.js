// The shop camera: follows the player from behind and above at a fixed
// angle while walking; moves in over a table while seated (see
// ShopWorld.joinTable). Transitions are eased, or instant when the
// player prefers reduced motion.

import * as THREE from "three";
import { floorToWorld } from "./coords.js";

const FOLLOW_OFFSET = new THREE.Vector3(0, 4.2, 5.2);
const SEATED_OFFSET = new THREE.Vector3(0, 2.4, 2.2);
const FOLLOW_SMOOTHING = 6; // per second; higher = snappier
const TRANSITION_MS = 600;

export function createCameraRig(camera) {
  const target = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let mode = "follow";
  let seatedAt = null; // world-space table center while seated
  let transition = null; // { fromPos, fromLook, start }

  function desired() {
    const focus = mode === "seated" ? seatedAt : target;
    const offset = mode === "seated" ? SEATED_OFFSET : FOLLOW_OFFSET;
    return { pos: focus.clone().add(offset), look: focus.clone().setY(mode === "seated" ? 0.4 : 0.6) };
  }

  function beginTransition(instant) {
    if (instant) {
      const d = desired();
      camera.position.copy(d.pos);
      lookAt.copy(d.look);
      camera.lookAt(lookAt);
      transition = null;
      return;
    }
    transition = { fromPos: camera.position.clone(), fromLook: lookAt.clone(), start: performance.now() };
  }

  return {
    /** Snap to the player without easing - on entering the shop. */
    snapTo(x, y) {
      const w = floorToWorld(x, y);
      target.set(w.x, 0, w.z);
      beginTransition(true);
    },
    setTarget(x, y) {
      const w = floorToWorld(x, y);
      target.set(w.x, 0, w.z);
    },
    toSeated(table, { instant }) {
      const w = floorToWorld(table.x, table.y);
      seatedAt = new THREE.Vector3(w.x, 0, w.z);
      mode = "seated";
      beginTransition(instant);
    },
    toFollow({ instant }) {
      mode = "follow";
      beginTransition(instant);
    },
    update(dtSec) {
      const d = desired();
      if (transition) {
        const t = Math.min(1, (performance.now() - transition.start) / TRANSITION_MS);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
        camera.position.lerpVectors(transition.fromPos, d.pos, e);
        lookAt.lerpVectors(transition.fromLook, d.look, e);
        if (t >= 1) transition = null;
      } else {
        const k = 1 - Math.exp(-FOLLOW_SMOOTHING * dtSec);
        camera.position.lerp(d.pos, k);
        lookAt.lerp(d.look, k);
      }
      camera.lookAt(lookAt);
    },
  };
}
