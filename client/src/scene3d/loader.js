// Loads and prepares the 3D models listed in assets.js. Separate from
// the manifest so Settings (character picker) and node tests can import
// the manifest without pulling three.js in.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const loader = new GLTFLoader();
const cache = new Map(); // file -> Promise<{scene, animations} | null>
const warned = new Set();

function loadOnce(file) {
  if (!cache.has(file)) {
    cache.set(
      file,
      loader.loadAsync(file).catch((err) => {
        if (!warned.has(file)) {
          warned.add(file);
          console.warn(`[scene3d] couldn't load ${file} - using a placeholder`, err);
        }
        return null;
      })
    );
  }
  return cache.get(file);
}

/**
 * A fresh copy of `file`'s scene, ready to add to the world (skinned
 * meshes cloned properly so each character animates on its own), plus
 * its animation clips. A file that fails to load gives a plain capsule
 * instead - a missing model must never take the shop down.
 */
export async function loadModel(file) {
  const gltf = await loadOnce(file);
  if (!gltf) return { scene: placeholder(), animations: [], placeholder: true };
  return { scene: cloneSkinned(gltf.scene), animations: gltf.animations, placeholder: false };
}

function placeholder() {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 12), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  mesh.position.y = 0.5;
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/**
 * Wraps `object` so its footprint is centered on the origin with its
 * base at y=0, scaled so its height (or its widest side, with
 * `{ width }`) matches the target in world units. Kenney models come
 * with assorted pivots (some sit at a corner), so everything goes
 * through here before being placed.
 */
export function normalizeModel(object, { height, width }) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = height ? height / (size.y || 1) : width / (Math.max(size.x, size.z) || 1);
  object.scale.multiplyScalar(scale);
  const scaled = new THREE.Box3().setFromObject(object);
  const center = scaled.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= scaled.min.y;
  const wrapper = new THREE.Group();
  wrapper.add(object);
  return wrapper;
}
