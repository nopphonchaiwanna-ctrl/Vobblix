// Call panel UI: join/leave voice, mute mic, deafen (mute what you hear),
// toggle camera, expand/collapse, and a tile grid for local + remote
// audio/video with Discord-style mic/deafen badges. Kept separate from
// the WebRTC logic (webrtc/callManager.js) the same way ui/chat.js is
// kept separate from its socket wiring - this module only touches the
// DOM.

import { escapeHtml } from "./format.js";
import { icon } from "./icons.js";

function el(id) {
  return document.getElementById(id);
}

export function initCallUI() {
  const panel = el("call-panel");
  const joinBtn = el("call-join-btn");
  const muteBtn = el("call-mute-btn");
  const deafenBtn = el("call-deafen-btn");
  const cameraBtn = el("call-camera-btn");
  const expandBtn = el("call-expand-btn");
  const statusEl = el("call-status");
  const tilesEl = el("call-tiles");
  const hintEl = el("call-hint");
  const muteSplit = el("call-mute-split"); // wrapper around #call-mute-btn + the mic caret/select
  const deafenSplit = el("call-deafen-split"); // wrapper around #call-deafen-btn + the speaker caret/select
  const cameraSplit = el("call-camera-split"); // wrapper around #call-camera-btn + the camera caret/select
  const micSelect = el("call-mic-select");
  const cameraSelect = el("call-camera-select");
  const speakerSelect = el("call-speaker-select"); // audio OUTPUT device - purely local playback routing (HTMLMediaElement.setSinkId), no WebRTC renegotiation involved

  let handlers = {
    onJoin: null,
    onLeave: null,
    onEnableVideo: null,
    onDisableVideo: null,
    onMuteMic: null,
    onUnmuteMic: null,
    onDeafen: null,
    onUndeafen: null,
    onMicDeviceChange: null,
    onCameraDeviceChange: null,
  };
  let hintTimer = null;
  let deafenedLocally = false;

  // Expanded = the panel grows to fill the game canvas area (see the
  // #call-panel.expanded rules in style.css, positioned relative to
  // #game-screen) instead of a real second OS window, so the same video
  // elements/streams keep working without being handed across documents.
  // The sidebar (shop/table chat, listings) stays visible and usable
  // next to it - it's not a full-viewport overlay, so there's no
  // "outside" region to click-to-dismiss; collapsing is always explicit
  // (the ⤡ button or Esc).
  function setExpanded(expanded) {
    panel.classList.toggle("expanded", expanded);
    expandBtn.innerHTML = icon(expanded ? "minimize-2" : "maximize-2", "icon-only");
    expandBtn.title = expanded ? "Shrink call panel" : "Expand call panel";
    expandBtn.setAttribute("aria-label", expandBtn.title);
  }

  expandBtn.addEventListener("click", () => {
    setExpanded(!panel.classList.contains("expanded"));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("expanded")) setExpanded(false);
  });

  // Mic/camera picker - works whether or not a call is active (see
  // webrtc/callManager.js's setAudioDevice/setVideoDevice: live-swaps
  // the track if already in a call, otherwise just remembered for next
  // time). Device labels are blank until the browser has granted mic/
  // camera permission at least once, so this is re-run after joining a
  // call too (see showJoined below), not just on panel open.
  function fillDeviceSelect(select, devices, fallbackLabel) {
    const previous = select.value;
    select.innerHTML = devices
      .map((d, i) => `<option value="${escapeHtml(d.deviceId)}">${escapeHtml(d.label || `${fallbackLabel} ${i + 1}`)}</option>`)
      .join("");
    if (devices.some((d) => d.deviceId === previous)) select.value = previous;
  }

  async function refreshDevicePicker() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      fillDeviceSelect(micSelect, devices.filter((d) => d.kind === "audioinput"), "Microphone");
      fillDeviceSelect(cameraSelect, devices.filter((d) => d.kind === "videoinput"), "Camera");
      fillDeviceSelect(speakerSelect, devices.filter((d) => d.kind === "audiooutput"), "Speaker");
    } catch (err) {
      console.warn("[call] couldn't list devices", err);
    }
  }

  // Speaker/output routing is purely local playback - which physical
  // device a <video>/<audio> element's sound comes out of - so unlike
  // mic/camera it never touches webrtc/callManager.js at all. Not every
  // browser supports setSinkId (Firefox/Safari don't), so this quietly
  // no-ops there instead of throwing.
  let selectedSinkId = "";
  function applySinkId(videoEl) {
    if (!selectedSinkId || typeof videoEl.setSinkId !== "function") return;
    videoEl.setSinkId(selectedSinkId).catch((err) => {
      console.warn("[call] couldn't switch speaker", err);
    });
  }
  function applySinkIdToAllTiles() {
    tilesEl.querySelectorAll("video").forEach(applySinkId);
  }

  micSelect.addEventListener("change", () => handlers.onMicDeviceChange?.(micSelect.value));
  cameraSelect.addEventListener("change", () => handlers.onCameraDeviceChange?.(cameraSelect.value));
  speakerSelect.addEventListener("change", () => {
    selectedSinkId = speakerSelect.value;
    applySinkIdToAllTiles();
  });
  navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevicePicker);
  refreshDevicePicker();

  joinBtn.addEventListener("click", () => {
    if (joinBtn.dataset.state === "joined") {
      handlers.onLeave?.();
    } else {
      handlers.onJoin?.();
    }
  });

  muteBtn.addEventListener("click", () => {
    if (muteBtn.dataset.state === "muted") {
      handlers.onUnmuteMic?.();
    } else {
      handlers.onMuteMic?.();
    }
  });

  deafenBtn.addEventListener("click", () => {
    if (deafenBtn.dataset.state === "deafened") {
      handlers.onUndeafen?.();
    } else {
      handlers.onDeafen?.();
    }
  });

  cameraBtn.addEventListener("click", () => {
    if (cameraBtn.dataset.state === "on") {
      handlers.onDisableVideo?.();
    } else {
      handlers.onEnableVideo?.();
    }
  });

  function tileFor(peerId) {
    let tile = tilesEl.querySelector(`[data-peer="${peerId}"]`);
    if (!tile) {
      tile = document.createElement("div");
      tile.className = "call-tile";
      tile.dataset.peer = peerId;
      tile.innerHTML =
        '<video autoplay playsinline></video>' +
        `<div class="call-tile-avatar">${icon("mic", "icon-only")}</div>` +
        '<div class="call-tile-badges">' +
        `<span class="call-tile-badge badge-mic" hidden title="Mic muted">${icon("mic-off", "icon-only")}</span>` +
        `<span class="call-tile-badge badge-deaf" hidden title="Deafened">${icon("volume-x", "icon-only")}</span>` +
        "</div>" +
        '<div class="call-tile-name"></div>';
      tilesEl.appendChild(tile);
      applySinkId(tile.querySelector("video"));
      // A freshly-created remote tile should start muted if we're
      // currently deafened ourselves - otherwise a peer who joins after
      // we deafened would briefly play audio before the next toggle.
      if (peerId !== "local" && deafenedLocally) {
        tile.querySelector("video").muted = true;
      }
    }
    return tile;
  }

  const api = {
    setHandlers(next) {
      handlers = { ...handlers, ...next };
    },

    // Shows/hides the whole panel depending on whether the player is
    // currently standing at a table - mirrors chatUI.setSeatedAt().
    setSeatedAt(seated) {
      panel.hidden = !seated;
      if (!seated) api.reset();
    },

    showJoined(joined) {
      joinBtn.innerHTML = joined ? `${icon("phone-off")}Leave call` : `${icon("mic")}Join voice`;
      joinBtn.dataset.state = joined ? "joined" : "idle";
      joinBtn.classList.toggle("danger", joined);
      muteSplit.hidden = !joined;
      deafenSplit.hidden = !joined;
      cameraSplit.hidden = !joined;
      statusEl.textContent = joined ? "In call" : "";
      if (joined) {
        // Labels are blank until permission is granted - now that
        // getUserMedia has run once, re-list so they show real names.
        refreshDevicePicker();
      }
      if (!joined) {
        cameraBtn.dataset.state = "off";
        cameraSplit.dataset.state = "off";
        cameraBtn.innerHTML = `${icon("video-off")}Turn on camera`;
        cameraBtn.disabled = false;
        api.showMicMuted(false);
        api.showDeafened(false);
      }
    },

    showVideoOn(on) {
      cameraBtn.dataset.state = on ? "on" : "off";
      cameraSplit.dataset.state = on ? "on" : "off";
      cameraBtn.innerHTML = on ? `${icon("video")}Turn off camera` : `${icon("video-off")}Turn on camera`;
    },

    showMicMuted(muted) {
      muteBtn.dataset.state = muted ? "muted" : "unmuted";
      muteSplit.dataset.state = muted ? "muted" : "unmuted";
      muteBtn.innerHTML = muted ? `${icon("mic-off")}Unmute mic` : `${icon("mic")}Mute mic`;
      api.setPeerMicMuted("local", muted);
    },

    showDeafened(deafened) {
      deafenedLocally = deafened;
      deafenBtn.dataset.state = deafened ? "deafened" : "hearing";
      deafenSplit.dataset.state = deafened ? "deafened" : "hearing";
      deafenBtn.innerHTML = deafened ? `${icon("volume-x")}Undeafen` : `${icon("volume-2")}Deafen`;
      api.setPeerDeafened("local", deafened);
      // The actual "stop hearing others" effect: mute every remote
      // tile's <video> element locally (your own tile is always muted
      // already, to avoid echoing your mic back to you).
      tilesEl.querySelectorAll(".call-tile:not(.is-local) video").forEach((v) => {
        v.muted = deafened;
      });
    },

    setJoinBusy(busy) {
      joinBtn.disabled = busy;
    },

    setCameraBusy(busy) {
      cameraBtn.disabled = busy;
    },

    setLocalStream(stream) {
      const tile = tileFor("local");
      tile.classList.add("is-local");
      tile.querySelector(".call-tile-name").textContent = "You";
      const videoEl = tile.querySelector("video");
      const hasVideo = !!stream?.getVideoTracks().length;
      videoEl.muted = true; // never echo your own mic back to yourself
      videoEl.srcObject = hasVideo ? stream : null;
      tile.classList.toggle("has-video", hasVideo);
    },

    addPeer({ id, name }) {
      const tile = tileFor(id);
      tile.querySelector(".call-tile-name").textContent = name;
    },

    removePeer(id) {
      tilesEl.querySelector(`[data-peer="${id}"]`)?.remove();
    },

    setPeerStream(id, stream) {
      const tile = tileFor(id);
      const videoEl = tile.querySelector("video");
      videoEl.srcObject = stream || null;
      // The same <video> element carries audio too, whether or not it
      // currently has a video track - no separate <audio> element needed.
      if (id !== "local") videoEl.muted = deafenedLocally;
      tile.classList.toggle("has-video", !!stream?.getVideoTracks().length);
    },

    setPeerVideoState(id, videoOn) {
      const tile = tileFor(id);
      // "Their camera is on but the track hasn't arrived/renegotiated
      // yet" - distinct from "has-video" so the UI can show a brief
      // "connecting" state instead of just the mic icon.
      tile.classList.toggle("video-pending", videoOn && !tile.classList.contains("has-video"));
    },

    setPeerMicMuted(id, muted) {
      const tile = tileFor(id);
      tile.querySelector(".badge-mic").hidden = !muted;
    },

    setPeerDeafened(id, deafened) {
      const tile = tileFor(id);
      tile.querySelector(".badge-deaf").hidden = !deafened;
    },

    // Green ring around the video tile while that participant's mic is
    // picking up sound - see webrtc/callManager.js's Web Audio-based
    // attachSpeakingDetector. The same signal also drives the roster
    // chip in ui/chat.js, which is the more reliable place to look for
    // audio-only participants once a video tile is on screen.
    setPeerSpeaking(id, speaking) {
      const tile = tileFor(id);
      tile.classList.toggle("speaking", speaking);
    },

    showError(message) {
      hintEl.textContent = message;
      hintEl.hidden = false;
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => {
        hintEl.hidden = true;
      }, 5000);
    },

    clearTiles() {
      tilesEl.innerHTML = "";
    },

    reset() {
      api.clearTiles();
      api.showJoined(false);
      hintEl.hidden = true;
      deafenedLocally = false;
      setExpanded(false);
    },
  };

  return api;
}
