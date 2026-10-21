// One character on the shop floor: the model, its idle/walk animation,
// a soft blob shadow, the "at a table" ring, and a name tag (a DOM
// label via CSS2DRenderer, so Thai names render with the page's fonts).

import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CHARACTER_CLIPS } from "./assets.js";
import { loadModel, normalizeModel } from "./loader.js";
import { floorToWorld } from "./coords.js";

const CHARACTER_HEIGHT = 1.0; // world units (~1m, chibi proportions)
const BODY_TINT = 0.45; // how strongly the player's color tints the body (0 = none)

let blobTexture = null;
function getBlobTexture() {
  if (blobTexture) return blobTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blobTexture = new THREE.CanvasTexture(c);
  return blobTexture;
}

/**
 * @param {{ file: string, color: string|null, name: string, accent: string }} opts
 * Returns synchronously (the model streams in), so a player joining
 * shows up at once with just a shadow + name tag until it loads.
 */
export function createAvatar({ file, color, name, accent }) {
  const root = new THREE.Group();

  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ map: getBlobTexture(), transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.01;
  root.add(blob);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.4, 32),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.visible = false;
  root.add(ring);

  const facing = new THREE.Group(); // rotated toward the walking direction
  root.add(facing);

  const tag = document.createElement("div");
  tag.className = "name-tag";
  tag.textContent = name;
  if (color) tag.style.setProperty("--player-color", color);
  const label = new CSS2DObject(tag);
  label.position.y = CHARACTER_HEIGHT + 0.25;
  root.add(label);

  let mixer = null;
  let actions = {};
  let current = null;
  let disposed = false;
  const owned = []; // materials we cloned, to dispose

  loadModel(file).then(({ scene, animations }) => {
    if (disposed) return;
    if (color) tintBody(scene, color, owned);
    facing.add(normalizeModel(scene, { height: CHARACTER_HEIGHT }));
    if (animations.length) {
      mixer = new THREE.AnimationMixer(scene);
      for (const [key, clipName] of Object.entries(CHARACTER_CLIPS)) {
        const clip = THREE.AnimationClip.findByName(animations, clipName);
        if (clip) actions[key] = mixer.clipAction(clip);
      }
      play("idle");
    }
  });

  function play(key) {
    const next = actions[key];
    if (!next || next === current) return;
    next.reset().fadeIn(0.15).play();
    current?.fadeOut(0.15);
    current = next;
  }

  return {
    root,
    setFloorPosition(x, y) {
      const w = floorToWorld(x, y);
      root.position.set(w.x, 0, w.z);
    },
    /** Turns to face a floor-space direction (dx, dy); ignores tiny moves. */
    faceToward(dx, dy) {
      if (Math.hypot(dx, dy) < 0.5) return;
      facing.rotation.y = Math.atan2(dx, dy);
    },
    setAtTable(atTable) {
      ring.visible = atTable;
    },
    update(dtSec, moving) {
      play(moving ? "walk" : "idle");
      mixer?.update(dtSec);
    },
    dispose() {
      disposed = true;
      mixer?.stopAllAction();
      tag.remove();
      blob.geometry.dispose();
      blob.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      for (const m of owned) m.dispose();
      root.removeFromParent();
    },
  };
}

// Kenney's characters split into a body mesh and a head mesh sharing one
// palette texture - tinting only the body's (cloned) material colors the
// outfit while leaving the face alone.
function tintBody(scene, color, owned) {
  const tint = new THREE.Color("#ffffff").lerp(new THREE.Color(color), BODY_TINT);
  scene.traverse((o) => {
    if (o.isMesh && /body/i.test(o.name)) {
      o.material = o.material.clone();
      o.material.color.multiply(tint);
      owned.push(o.material);
    }
  });
}
