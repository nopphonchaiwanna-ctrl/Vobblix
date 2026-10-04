import Phaser from "phaser";
import { getSocket } from "../net/socket.js";

const PLAYER_SPEED = 220; // px/sec
const PLAYER_RADIUS = 16;
const TABLE_SOLID_RADIUS = 46; // can't walk inside this
const MOVE_EMIT_INTERVAL = 50; // ms between "move" events sent to server
const REMOTE_LERP = 0.25; // smoothing for remote player positions

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super("ShopScene");
  }

  /**
   * @param {{you: object, roomId: string, players: object[], tables: object[], floorWidth: number, floorHeight: number, chatUI: object}} data
   */
  init(data) {
    this.you = data.you;
    this.roomId = data.roomId;
    this.initialPlayers = data.players || [];
    this.chatUI = data.chatUI;
    // Voice/video call lifecycle for whichever table the player is
    // currently at - see main.js's setupCall(). Optional so this scene
    // still works if a caller doesn't wire calls up.
    this.callHooks = data.callHooks || null;
    // Layout comes from the server (see server/src/scenes/) rather than a
    // local import, so this scene just renders whatever floor the server
    // says this room is using - it doesn't need to know how many
    // shop/event types exist.
    this.tables = data.tables || [];
    this.floorWidth = data.floorWidth;
    this.floorHeight = data.floorHeight;
  }

  create() {
    this.socket = getSocket();
    this.avatarTextureKeys = new Set();
    // Player ids whose sprite is currently showing a real avatar image
    // (not the color-circle placeholder) -> the Graphics object used to
    // mask that sprite into a circle, kept in sync with the sprite's
    // position every frame (see applyAvatarImage/update). Most players
    // won't have set an avatar, so this stays empty for them - no extra
    // per-frame cost.
    this.avatarMasks = new Map();
    this.remotePlayers = new Map(); // id -> { sprite, nameText, seatRing, target: {x,y}, tableId }
    this.currentTableId = null;
    this.moveAccumulator = 0;

    this.cameras.main.setBackgroundColor("#1b2634");

    this.drawFloor();
    this.drawTables();

    // Local player - starts on the color-circle placeholder immediately
    // (no network wait), then swaps to the real avatar image once/if it
    // finishes loading (see applyAvatarImage).
    const tex = this.ensureAvatarTexture(this.you.color);
    this.player = this.add.sprite(this.you.x, this.you.y, tex);
    this.playerName = this.makeNameLabel(this.you.x, this.you.y, this.you.name);
    this.playerSeatRing = this.makeSeatRing(this.you.x, this.you.y);
    if (this.you.avatarUrl) this.applyAvatarImage("local", this.player, this.you.avatarUrl);

    // Camera follows the local player, clamped to the floor
    this.cameras.main.setBounds(0, 0, this.floorWidth, this.floorHeight);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // Existing players already in the room
    for (const p of this.initialPlayers) {
      this.addRemotePlayer(p);
    }

    this.wireSocketEvents();
    this.wireChat();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Both createCursorKeys()/addKeys() above capture these keys by
    // default (Phaser calls preventDefault() on their keydown events),
    // which is exactly what stops the arrow keys from also scrolling
    // the page while walking around - without it, pressing the down
    // arrow moves the character AND scrolls the whole page down.
    // The catch: Phaser listens on the whole page, not just the game
    // canvas, so that same capture would also preventDefault() these
    // keys while typing "wasd" or arrows into the shop/table chat
    // boxes, breaking the cursor-keys/letters there too - that's a
    // *different* problem than the movement-while-typing one
    // handleMovement() already guards against with isTextInputFocused()
    // below (that only stops the character from moving; it doesn't
    // stop Phaser from calling preventDefault() on the keydown first).
    // So: capture these keys only while nothing text-editable has
    // focus, and release capture the moment a chat box does.
    const movementKeyCodes = [
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ];
    this.updateKeyCapture = () => {
      if (isTextInputFocused()) {
        this.input.keyboard.removeCapture(movementKeyCodes);
      } else {
        this.input.keyboard.addCapture(movementKeyCodes);
      }
    };
    this.updateKeyCapture();
    // focusin/focusout bubble to the document, so one pair of listeners
    // here covers both chat inputs (and anything else) without needing
    // to know their element ids.
    document.addEventListener("focusin", this.updateKeyCapture);
    document.addEventListener("focusout", this.updateKeyCapture);
    this.events.once("shutdown", () => {
      document.removeEventListener("focusin", this.updateKeyCapture);
      document.removeEventListener("focusout", this.updateKeyCapture);
      // Leaving the scene with capture off (mid-chat) shouldn't leak
      // into whatever's shown next.
      this.input.keyboard.addCapture(movementKeyCodes);
    });
  }

  // ---------- Setup helpers ----------

  drawFloor() {
    const g = this.add.graphics();
    g.fillStyle(0x27364a, 1);
    g.fillRect(0, 0, this.floorWidth, this.floorHeight);
    g.lineStyle(2, 0x3a4a63, 1);
    for (let x = 0; x <= this.floorWidth; x += 50) g.lineBetween(x, 0, x, this.floorHeight);
    for (let y = 0; y <= this.floorHeight; y += 50) g.lineBetween(0, y, this.floorWidth, y);
    g.lineStyle(4, 0x0f172a, 1);
    g.strokeRect(0, 0, this.floorWidth, this.floorHeight);
  }

  drawTables() {
    for (const table of this.tables) {
      const g = this.add.graphics();
      g.fillStyle(0x4b3621, 1);
      g.fillRoundedRect(table.x - 45, table.y - 45, 90, 90, 12);
      g.lineStyle(3, 0x2d2013, 1);
      g.strokeRoundedRect(table.x - 45, table.y - 45, 90, 90, 12);

      this.add
        .text(table.x, table.y - 62, table.label, {
          fontSize: "13px",
          color: "#cbd5e1",
          fontFamily: "system-ui, sans-serif",
        })
        .setOrigin(0.5);

      // Faint circle showing the "you're at this table" proximity zone
      const zone = this.add.circle(table.x, table.y, table.radius);
      zone.setStrokeStyle(1, 0x38bdf8, 0.15);
    }
  }

  ensureAvatarTexture(colorHex) {
    const key = `avatar-${colorHex}`;
    if (!this.avatarTextureKeys.has(key)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(Phaser.Display.Color.HexStringToColor(colorHex).color, 1);
      g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
      g.lineStyle(2, 0x0f172a, 1);
      g.strokeCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
      g.generateTexture(key, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
      g.destroy();
      this.avatarTextureKeys.add(key);
    }
    return key;
  }

  makeNameLabel(x, y, name) {
    return this.add
      .text(x, y - PLAYER_RADIUS - 14, name, {
        fontSize: "12px",
        color: "#e2e8f0",
        backgroundColor: "#0f172aaa",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
  }

  makeSeatRing(x, y) {
    const ring = this.add.circle(x, y, PLAYER_RADIUS + 5);
    ring.setStrokeStyle(2, 0xfacc15, 1);
    ring.setVisible(false);
    return ring;
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.id)) return;
    const tex = this.ensureAvatarTexture(p.color);
    const sprite = this.add.sprite(p.x, p.y, tex);
    const nameText = this.makeNameLabel(p.x, p.y, p.name);
    const seatRing = this.makeSeatRing(p.x, p.y);
    this.remotePlayers.set(p.id, {
      sprite,
      nameText,
      seatRing,
      target: { x: p.x, y: p.y },
      tableId: p.tableId || null,
    });
    if (p.avatarUrl) this.applyAvatarImage(p.id, sprite, p.avatarUrl);
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (!rp) return;
    rp.sprite.destroy();
    rp.nameText.destroy();
    rp.seatRing.destroy();
    this.remotePlayers.delete(id);
    this.avatarMasks.get(id)?.destroy();
    this.avatarMasks.delete(id);
  }

  // Swaps `sprite`'s texture from the color-circle placeholder to the
  // player's real avatar image once it's loaded, cropped to a circle
  // with a Graphics-based mask (so it reads the same as the existing
  // avatar style) - see loadAvatarTexture() below. Silently keeps the
  // placeholder if the image fails to load (bad URL, host blocks
  // hotlinking, etc.) - a broken avatar should never break the game.
  applyAvatarImage(id, sprite, url) {
    loadAvatarTexture(this, url, (key) => {
      if (!key) return;
      // The player could have left (or the scene could have shut down)
      // by the time a slow image finishes loading.
      if (!sprite.scene) return;

      sprite.setTexture(key);
      const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
      maskShape.fillStyle(0xffffff);
      maskShape.fillCircle(sprite.x, sprite.y, PLAYER_RADIUS);
      sprite.setMask(maskShape.createGeometryMask());
      this.avatarMasks.set(id, maskShape);
    });
  }

  // ---------- Networking ----------

  wireSocketEvents() {
    // Stored as instance properties (not inline arrows) so they can be
    // precisely un-registered on shutdown below - socket.off() needs the
    // exact function reference that was passed to socket.on().
    this.onPlayerJoined = (p) => this.addRemotePlayer(p);
    this.onPlayerMoved = ({ id, x, y }) => {
      const rp = this.remotePlayers.get(id);
      if (rp) {
        rp.target.x = x;
        rp.target.y = y;
      }
    };
    this.onPlayerLeft = ({ id }) => this.removeRemotePlayer(id);
    this.onPlayerTableChanged = ({ id, tableId }) => {
      const rp = this.remotePlayers.get(id);
      if (rp) rp.tableId = tableId;
    };
    this.onShopChat = (msg) => {
      this.chatUI.appendShopMessage({ from: msg.from, text: msg.text, authorId: msg.fromUserId });
    };
    this.onTableChat = (msg) => {
      if (msg.tableId === this.currentTableId) {
        this.chatUI.appendTableMessage({ from: msg.from, text: msg.text, authorId: msg.fromUserId });
      }
    };

    this.socket.on("player-joined", this.onPlayerJoined);
    this.socket.on("player-moved", this.onPlayerMoved);
    this.socket.on("player-left", this.onPlayerLeft);
    this.socket.on("player-table-changed", this.onPlayerTableChanged);
    this.socket.on("shop-chat", this.onShopChat);
    this.socket.on("table-chat", this.onTableChat);

    // The socket itself stays connected across a "leave shop" (see
    // main.js's leaveShop() - it only destroys this Phaser game, not the
    // socket, so order-notification pushes keep working on the lobby).
    // Without this, re-entering a shop would stack a second copy of
    // every listener above on the same long-lived socket, each one
    // still pointing at this scene's by-then-destroyed sprites.
    this.events.once("shutdown", () => {
      this.socket.off("player-joined", this.onPlayerJoined);
      this.socket.off("player-moved", this.onPlayerMoved);
      this.socket.off("player-left", this.onPlayerLeft);
      this.socket.off("player-table-changed", this.onPlayerTableChanged);
      this.socket.off("shop-chat", this.onShopChat);
      this.socket.off("table-chat", this.onTableChat);
    });
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

  // ---------- Main loop ----------

  update(_time, delta) {
    this.handleMovement(delta);
    this.updateSeatRing(this.player, this.playerSeatRing, this.currentTableId !== null);
    this.playerName.setPosition(this.player.x, this.player.y - PLAYER_RADIUS - 14);

    for (const rp of this.remotePlayers.values()) {
      rp.sprite.x = Phaser.Math.Linear(rp.sprite.x, rp.target.x, REMOTE_LERP);
      rp.sprite.y = Phaser.Math.Linear(rp.sprite.y, rp.target.y, REMOTE_LERP);
      rp.nameText.setPosition(rp.sprite.x, rp.sprite.y - PLAYER_RADIUS - 14);
      this.updateSeatRing(rp.sprite, rp.seatRing, rp.tableId !== null);
    }

    // Avatar-image sprites are masked to a circle via a Graphics shape
    // drawn in world space (see applyAvatarImage) - it has to be
    // re-drawn at the sprite's current position every frame, same idea
    // as the seat ring above. Only populated for players who actually
    // have an avatar image applied, so this is a no-op for everyone else.
    for (const [id, maskShape] of this.avatarMasks) {
      const sprite = id === "local" ? this.player : this.remotePlayers.get(id)?.sprite;
      if (!sprite) {
        maskShape.destroy();
        this.avatarMasks.delete(id);
        continue;
      }
      maskShape.clear();
      maskShape.fillStyle(0xffffff);
      maskShape.fillCircle(sprite.x, sprite.y, PLAYER_RADIUS);
    }
  }

  updateSeatRing(sprite, ring, visible) {
    ring.setPosition(sprite.x, sprite.y);
    ring.setVisible(visible);
  }

  handleMovement(delta) {
    let dx = 0;
    let dy = 0;

    // Phaser listens for keydown on the whole page, not just the game
    // canvas - so without this check, typing "wasd" into the chat boxes
    // would also drive the character around the map.
    const typingIntoChat = isTextInputFocused();

    if (!typingIntoChat) {
      if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;

      const step = (PLAYER_SPEED * delta) / 1000;
      let nx = this.player.x + dx * step;
      let ny = this.player.y + dy * step;

      // Clamp to floor bounds
      nx = Phaser.Math.Clamp(nx, PLAYER_RADIUS, this.floorWidth - PLAYER_RADIUS);
      ny = Phaser.Math.Clamp(ny, PLAYER_RADIUS, this.floorHeight - PLAYER_RADIUS);

      // Simple circle-vs-circle collision against each table's solid core
      for (const table of this.tables) {
        const d = Phaser.Math.Distance.Between(nx, ny, table.x, table.y);
        const minDist = TABLE_SOLID_RADIUS + PLAYER_RADIUS;
        if (d < minDist) {
          const angle = Phaser.Math.Angle.Between(table.x, table.y, nx, ny);
          nx = table.x + Math.cos(angle) * minDist;
          ny = table.y + Math.sin(angle) * minDist;
        }
      }

      this.player.setPosition(nx, ny);
    }

    this.moveAccumulator += delta;
    if (this.moveAccumulator >= MOVE_EMIT_INTERVAL) {
      this.moveAccumulator = 0;
      this.socket.emit("move", { x: this.player.x, y: this.player.y });
    }

    this.updateTableProximity();
  }

  updateTableProximity() {
    let closest = null;
    for (const table of this.tables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, table.x, table.y);
      if (d <= table.radius) {
        closest = table;
        break;
      }
    }
    const newTableId = closest?.id || null;
    if (newTableId !== this.currentTableId) {
      this.currentTableId = newTableId;
      this.chatUI.clearTableLog();
      this.chatUI.setSeatedAt(closest?.label || null);
      this.callHooks?.onTableChanged(closest?.label || null);
      if (newTableId) {
        this.socket.emit("join-table", { tableId: newTableId }, (payload) => {
          // Only replay history if we're still at the table we asked
          // about - a quick walk-through could otherwise render a stale
          // table's log after the player has already left it.
          if (this.currentTableId !== newTableId) return;
          for (const msg of payload?.history || []) {
            this.chatUI.appendTableMessage({ from: msg.author_name, text: msg.text, authorId: msg.user_id });
          }
        });
      } else {
        this.socket.emit("leave-table");
      }
    }
  }
}

function isTextInputFocused() {
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

/**
 * Loads `url` into the scene's texture manager under a stable key (one
 * fetch per distinct URL - reused instantly for every later call with
 * the same one) and calls `onReady(key)` once it's available, or
 * `onReady(null)` if it failed to load. Uses Phaser's own asset loader
 * (not a plain <img>/canvas) so it goes through the normal WebGL
 * texture-upload path - this still works for a cross-origin image URL
 * for plain rendering, it's only *reading pixels back* (canvas
 * toDataURL/getImageData) that cross-origin images block, which this
 * never does.
 */
function loadAvatarTexture(scene, url, onReady) {
  const key = `avatar-img:${url}`;
  if (scene.textures.exists(key)) {
    onReady(key);
    return;
  }

  const onComplete = () => {
    cleanup();
    onReady(key);
  };
  const onError = (file) => {
    if (file.key !== key) return; // some other in-flight load failed, not this one
    cleanup();
    onReady(null);
  };
  function cleanup() {
    scene.load.off(`filecomplete-image-${key}`, onComplete);
    scene.load.off("loaderror", onError);
  }

  scene.load.once(`filecomplete-image-${key}`, onComplete);
  scene.load.on("loaderror", onError); // .on (not .once) - an unrelated file's error must not unsubscribe this one early
  scene.load.image(key, url);
  if (!scene.load.isLoading()) scene.load.start();
}
