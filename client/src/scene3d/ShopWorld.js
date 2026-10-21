// The 3D shop floor (replaces the old Phaser ShopScene). Owns the
// WebGL renderer, the room, every character on the floor, and this
// shop's socket presence events. Everything else (chat, call, listings,
// events) stays DOM layered over the canvas, as before.
//
// Positions stay in the server's floor pixels everywhere (see
// coords.js); only drawing converts to world units.

import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CHARACTERS, DEFAULT_CHARACTER_ID, PROPS } from "./assets.js";
import { loadModel, normalizeModel } from "./loader.js";
import { createAvatar } from "./avatars.js";
import { createCameraRig } from "./cameraRig.js";
import { createInput } from "./input.js";
import { floorToWorld, WORLD_SCALE } from "./coords.js";
import { stepPosition, solidsFor } from "./movement.js";
import { nearestInteractable } from "./interactables.js";
import { resolveCharacter } from "./characters.js";
import { paletteFor } from "./themes.js";
import { strings } from "./strings.js";

const MOVE_EMIT_INTERVAL = 50; // ms between "move" events sent to server
const REMOTE_LERP = 0.25; // per-frame smoothing for remote player positions
const WALL_HEIGHT = 2.4;
const SEAT_RING_COLOR = "#facc15";

export default class ShopWorld {
  /**
   * @param {{ container: HTMLElement, socket: object, you: object, players: object[],
   *   tables: object[], counter: object, board: object, floor: {width:number,height:number},
   *   theme: string, chatUI: object, callHooks?: object }} opts
   */
  constructor(opts) {
    this.container = opts.container;
    this.socket = opts.socket;
    this.you = opts.you;
    this.tables = opts.tables || [];
    this.counter = opts.counter || null;
    this.board = opts.board || null;
    this.floor = opts.floor;
    this.palette = paletteFor(opts.theme);
    this.chatUI = opts.chatUI;
    this.callHooks = opts.callHooks || null;

    this.solids = solidsFor(this.tables, this.counter, this.board);
    this.pos = { x: this.you.x, y: this.you.y };
    this.remotePlayers = new Map(); // id -> { avatar, pos, target, tableId }
    this.currentTableId = null;
    this.movementLocked = false;
    this.nearListeners = [];
    this.near = null;
    this.moveAccumulator = 0;
    this.lastSent = { x: NaN, y: NaN };
    this.disposables = [];
    this.destroyed = false;

    if (!this.createRenderer()) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.palette.sky);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.rig = createCameraRig(this.camera);
    this.input = createInput();

    this.addLights();
    this.buildRoom();
    this.buildTables();
    this.buildCounter();
    this.buildBoard();
    this.buildDecor();

    this.player = this.addAvatar(this.you);
    this.player.setFloorPosition(this.pos.x, this.pos.y);
    for (const p of opts.players || []) this.addRemotePlayer(p);

    this.rig.snapTo(this.pos.x, this.pos.y);
    this.wireSocketEvents();
    this.wireChat();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();

    this.clock = new THREE.Clock();
    this.frame = requestAnimationFrame(this.tick);
    if (import.meta.env?.DEV) (window.__shopWorlds ||= []).push(this); // handles for headless checks in dev only
  }

  // ---------- Setup ----------

  createRenderer() {
    try {
      const coarse = matchMedia("(pointer: coarse)").matches;
      this.renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (err) {
      console.error("[scene3d] WebGL unavailable:", err);
      const msg = document.createElement("p");
      msg.className = "scene3d-fallback";
      msg.textContent = strings.noWebgl;
      this.container.replaceChildren(msg);
      this.renderer = null;
      return false;
    }
    this.renderer.domElement.className = "scene3d-canvas";
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = "scene3d-labels";
    this.container.replaceChildren(this.renderer.domElement, this.labels.domElement);
    return true;
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6b5a48, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-4, 8, 6);
    this.scene.add(sun);
  }

  track(obj) {
    this.disposables.push(obj);
    return obj;
  }

  buildRoom() {
    const w = this.floor.width * WORLD_SCALE;
    const d = this.floor.height * WORLD_SCALE;

    const floor = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(w, d)),
      this.track(new THREE.MeshLambertMaterial({ map: this.track(floorTexture(this.palette.floor, w, d)) }))
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(w / 2, 0, d / 2);
    this.scene.add(floor);

    // Back wall + both side walls; the front stays open toward the camera.
    const wallMat = this.track(new THREE.MeshLambertMaterial({ color: this.palette.wall }));
    const trimMat = this.track(new THREE.MeshLambertMaterial({ color: this.palette.wood }));
    const addWall = (length, x, z, rotY) => {
      const wall = new THREE.Mesh(this.track(new THREE.BoxGeometry(length, WALL_HEIGHT, 0.1)), wallMat);
      wall.position.set(x, WALL_HEIGHT / 2, z);
      wall.rotation.y = rotY;
      this.scene.add(wall);
      const trim = new THREE.Mesh(this.track(new THREE.BoxGeometry(length, 0.12, 0.14)), trimMat);
      trim.position.set(x, 0.06, z);
      trim.rotation.y = rotY;
      this.scene.add(trim);
    };
    addWall(w, w / 2, -0.05, 0);
    addWall(d, -0.05, d / 2, Math.PI / 2);
    addWall(d, w + 0.05, d / 2, Math.PI / 2);
  }

  buildTables() {
    for (const table of this.tables) {
      const { x, z } = floorToWorld(table.x, table.y);
      this.placeProp(PROPS.table.file, { width: 0.95 }, x, z);
      // Faint marker of the "you can join here" zone, like the 2D floor had.
      const zone = new THREE.Mesh(
        this.track(new THREE.RingGeometry(table.radius * WORLD_SCALE - 0.03, table.radius * WORLD_SCALE, 48)),
        this.track(new THREE.MeshBasicMaterial({ color: this.palette.accent, transparent: true, opacity: 0.25 }))
      );
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(x, 0.015, z);
      this.scene.add(zone);
    }
  }

  buildCounter() {
    if (!this.counter) return;
    const { x, z } = floorToWorld(this.counter.x, this.counter.y);
    // Three bar segments side by side, facing into the shop.
    for (const dx of [-0.45, 0, 0.45]) this.placeProp(PROPS.counter.file, { width: 0.45 }, x + dx, z - 0.15, Math.PI);
    this.placeProp(PROPS.books.file, { width: 0.25 }, x - 0.4, z - 0.15, 0, 0.47);
    this.placeProp(PROPS.box.file, { width: 0.25 }, x + 0.4, z - 0.15, 0.3, 0.47);
    // Shelves of stock behind it, against the back wall.
    for (const dx of [-0.55, 0.55]) this.placeProp(PROPS.shelf.file, { height: 1.5 }, x + dx, 0.25, 0);
  }

  buildBoard() {
    if (!this.board) return;
    const { x, z } = floorToWorld(this.board.x, this.board.y);
    const group = new THREE.Group();
    const woodMat = this.track(new THREE.MeshLambertMaterial({ color: this.palette.wood }));
    const frame = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.5, 1.0, 0.06)), woodMat);
    frame.position.y = 1.35;
    group.add(frame);
    const face = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(1.38, 0.88)),
      this.track(new THREE.MeshLambertMaterial({ map: this.track(boardTexture(this.palette.accent)) }))
    );
    face.position.set(0, 1.35, 0.035);
    group.add(face);
    for (const px of [-0.68, 0.68]) {
      const post = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.08, 1.85, 0.08)), woodMat);
      post.position.set(px, 0.925, 0);
      group.add(post);
    }
    group.position.set(x, 0, Math.max(z, 0.2));
    this.scene.add(group);
  }

  buildDecor() {
    const w = this.floor.width * WORLD_SCALE;
    const d = this.floor.height * WORLD_SCALE;
    this.placeProp(PROPS.plant.file, { height: 0.9 }, 0.35, 0.35);
    this.placeProp(PROPS.plant.file, { height: 0.9 }, w - 0.35, 0.35);
    this.placeProp(PROPS.plant.file, { height: 0.9 }, 0.35, d - 0.35);
    this.placeProp(PROPS.plant.file, { height: 0.9 }, w - 0.35, d - 0.35);
    // Entrance rug where players spawn.
    this.placeProp(PROPS.rug.file, { width: 1.6 }, w / 2, 1.2, 0, 0.005);
  }

  /** Loads a prop model, normalizes it, and places it at world (x, z). */
  placeProp(file, size, x, z, rotY = 0, y = 0) {
    loadModel(file).then(({ scene }) => {
      if (this.destroyed) return;
      const obj = normalizeModel(scene, size);
      obj.position.set(x, y, z);
      obj.rotation.y = rotY;
      this.scene.add(obj);
    });
  }

  addAvatar(p) {
    const character = resolveCharacter(p.avatarConfig, CHARACTERS, DEFAULT_CHARACTER_ID);
    const avatar = createAvatar({
      file: character.file,
      color: character.color || p.color || null,
      name: p.name,
      accent: SEAT_RING_COLOR,
    });
    this.scene.add(avatar.root);
    return avatar;
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.id) || this.destroyed) return;
    const avatar = this.addAvatar(p);
    avatar.setFloorPosition(p.x, p.y);
    avatar.setAtTable(!!p.tableId);
    this.remotePlayers.set(p.id, { avatar, pos: { x: p.x, y: p.y }, target: { x: p.x, y: p.y }, tableId: p.tableId || null });
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (!rp) return;
    rp.avatar.dispose();
    this.remotePlayers.delete(id);
  }

  // ---------- Networking ----------

  wireSocketEvents() {
    // Kept as properties so destroy() can socket.off() the exact same
    // function references - the socket outlives the shop (see main.js's
    // leaveShop()), so a leftover listener would fire into a dead world.
    this.handlers = {
      "player-joined": (p) => this.addRemotePlayer(p),
      "player-moved": ({ id, x, y }) => {
        const rp = this.remotePlayers.get(id);
        if (rp) rp.target = { x, y };
      },
      "player-left": ({ id }) => this.removeRemotePlayer(id),
      "player-table-changed": ({ id, tableId }) => {
        const rp = this.remotePlayers.get(id);
        if (!rp) return;
        rp.tableId = tableId;
        rp.avatar.setAtTable(!!tableId);
      },
      "shop-chat": (msg) => this.chatUI.appendShopMessage({ from: msg.from, text: msg.text, authorId: msg.fromUserId }),
      "table-chat": (msg) => {
        if (msg.tableId === this.currentTableId) {
          this.chatUI.appendTableMessage({ from: msg.from, text: msg.text, authorId: msg.fromUserId });
        }
      },
    };
    for (const [event, fn] of Object.entries(this.handlers)) this.socket.on(event, fn);
  }

  wireChat() {
    this.chatUI.setHandlers({
      onShopSend: (text) => this.socket.emit("shop-chat", { text }),
      onTableSend: (text) => {
        if (!this.currentTableId) return;
        this.socket.emit("table-chat", { text });
      },
    });
  }

  // ---------- Public API ----------

  /** cb(interactable|null) whenever what the player stands at changes - see interactables.js. */
  onNearChange(cb) {
    this.nearListeners.push(cb);
    cb(this.near);
  }

  setMovementLocked(locked) {
    this.movementLocked = locked;
    if (locked) this.input?.clear();
  }

  /** Thumbstick input from the mobile HUD, floor-space vector of length <= 1. */
  setAnalogInput(vec) {
    this.input?.setAnalog(vec);
  }

  resize() {
    if (!this.renderer) return;
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.labels.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    if (this.handlers) for (const [event, fn] of Object.entries(this.handlers)) this.socket.off(event, fn);
    this.resizeObserver?.disconnect();
    this.input?.destroy();
    this.player?.dispose();
    for (const id of [...this.remotePlayers.keys()]) this.removeRemotePlayer(id);
    this.scene?.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        for (const m of [].concat(o.material || [])) m.dispose();
      }
    });
    for (const d of this.disposables) d.dispose?.();
    this.renderer?.dispose();
    this.container.replaceChildren();
    this.nearListeners = [];
  }

  // ---------- Main loop ----------

  tick = () => {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.tick);
    const dtSec = Math.min(this.clock.getDelta(), 0.1);
    const dtMs = dtSec * 1000;

    const dir = this.movementLocked ? { x: 0, y: 0 } : this.input.getDirection();
    const next = stepPosition(this.pos, dir, dtMs, { floor: this.floor, solids: this.solids });
    const moved = next.x !== this.pos.x || next.y !== this.pos.y;
    this.player.faceToward(next.x - this.pos.x, next.y - this.pos.y);
    this.pos = next;
    this.player.setFloorPosition(next.x, next.y);
    this.player.setAtTable(this.currentTableId !== null);
    this.player.update(dtSec, moved);

    // Only send when the position actually changed - standing still
    // costs the server nothing (the old scene sent 20/s regardless).
    this.moveAccumulator += dtMs;
    if (this.moveAccumulator >= MOVE_EMIT_INTERVAL) {
      this.moveAccumulator = 0;
      if (this.pos.x !== this.lastSent.x || this.pos.y !== this.lastSent.y) {
        this.socket.emit("move", { x: this.pos.x, y: this.pos.y });
        this.lastSent = { ...this.pos };
      }
    }

    for (const rp of this.remotePlayers.values()) {
      const nx = rp.pos.x + (rp.target.x - rp.pos.x) * REMOTE_LERP;
      const ny = rp.pos.y + (rp.target.y - rp.pos.y) * REMOTE_LERP;
      rp.avatar.faceToward(nx - rp.pos.x, ny - rp.pos.y);
      const moving = Math.hypot(rp.target.x - nx, rp.target.y - ny) > 2;
      rp.pos = { x: nx, y: ny };
      rp.avatar.setFloorPosition(nx, ny);
      rp.avatar.update(dtSec, moving);
    }

    this.updateNear();
    if (this.currentTableId === null) this.rig.setTarget(this.pos.x, this.pos.y);
    this.rig.update(dtSec);
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  };

  updateNear() {
    const found = this.currentTableId ? null : nearestInteractable(this.pos, this);
    const key = found ? `${found.kind}:${found.id}` : null;
    const prevKey = this.near ? `${this.near.kind}:${this.near.id}` : null;
    if (key === prevKey) return;
    this.near = found;
    for (const cb of this.nearListeners) cb(found);
  }
}

// ---------- Procedural textures ----------

function floorTexture(color, w, d) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(0,0,0,0.08)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 126, 126);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(w / 0.5, d / 0.5); // 50cm tiles
  return tex;
}

function boardTexture(accent) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 326;
  const g = c.getContext("2d");
  g.fillStyle = "#c79a63"; // cork
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = accent;
  g.fillRect(0, 0, c.width, 64);
  g.fillStyle = "#ffffff";
  g.font = "bold 40px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(strings.eventsBoard, c.width / 2, 34);
  const notes = ["#fef3c7", "#dbeafe", "#fce7f3", "#dcfce7", "#ffffff"];
  const spots = [[30, 90, -0.05], [180, 100, 0.04], [340, 88, -0.03], [90, 200, 0.06], [260, 205, -0.04]];
  spots.forEach(([x, y, r], i) => {
    g.save();
    g.translate(x + 65, y + 50);
    g.rotate(r);
    g.fillStyle = notes[i];
    g.fillRect(-65, -50, 130, 100);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let line = 0; line < 4; line++) g.fillRect(-50, -30 + line * 18, line === 0 ? 100 : 80, 6);
    g.fillStyle = "#e11d48";
    g.beginPath();
    g.arc(0, -42, 6, 0, Math.PI * 2);
    g.fill();
    g.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
