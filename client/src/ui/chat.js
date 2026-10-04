// Small DOM-based chat UI. Kept separate from Phaser since text input
// and scrolling logs are much easier to do with plain HTML than with
// Phaser's canvas text objects.

import { icon } from "./icons.js";

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// `authorId` (the sender's stable account id - see server/src/index.js's
// shop-chat/table-chat "fromUserId" and the shopHistory replay's
// "user_id") drives two things: a blocked sender's message is skipped
// entirely instead of rendered (see `blockedIds` below), and everyone
// else's name becomes a clickable "block this person" trigger (handled
// by one delegated click listener per log - see initChatUI - rather
// than per-message, since messages come and go constantly).
function appendMessage(logEl, { from, text, system, authorId }, { blockedIds, ownUserId }) {
  if (!system && authorId && blockedIds.has(authorId)) return;

  const row = document.createElement("div");
  row.className = system ? "chat-msg system" : "chat-msg";
  if (system) {
    row.textContent = text;
  } else if (authorId && authorId !== ownUserId) {
    row.innerHTML = `<span class="from" data-user-id="${escapeHtml(authorId)}" title="Click to block this person">${escapeHtml(from)}:</span>${escapeHtml(text)}`;
  } else {
    row.innerHTML = `<span class="from">${escapeHtml(from)}:</span>${escapeHtml(text)}`;
  }
  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;
}

// Created once at startup (see main.js) and reused across every shop
// visit - re-running this per shop-entry would bind a second copy of
// the form submit listeners below on top of the first, since the DOM
// elements it binds to are the same ones every time. Use setShopName()
// + reset() (below) to reconfigure it for a freshly-entered shop
// instead of calling this again.
export function initChatUI() {
  const shopLog = el("shop-chat-log");
  const tableLog = el("table-chat-log");
  const shopForm = el("shop-chat-form");
  const tableForm = el("table-chat-form");
  const shopInput = el("shop-chat-input");
  const tableInput = el("table-chat-input");
  const tableTitle = el("table-chat-title");
  const tableSendBtn = tableForm.querySelector("button");
  const voiceRoster = el("voice-roster");
  const voiceRosterList = el("voice-roster-list");
  const shopNameLabel = el("shop-name-label");

  // Handlers are wired up later (once the socket connection exists), via
  // setHandlers(). Kept mutable so the form listeners below always call
  // whatever is current.
  let handlers = { onShopSend: null, onTableSend: null, onBlockUser: null };
  // Account-level, set once via setOwnUserId()/setBlockedUserIds() (see
  // main.js) rather than threaded through every append call.
  let ownUserId = null;
  let blockedIds = new Set();

  shopForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = shopInput.value.trim();
    if (!text) return;
    handlers.onShopSend?.(text);
    shopInput.value = "";
  });

  tableForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = tableInput.value.trim();
    if (!text) return;
    handlers.onTableSend?.(text);
    tableInput.value = "";
  });

  // One delegated "click a name to block" listener per log, instead of
  // one per message - chat messages come and go constantly, a listener
  // on each would mean binding (and eventually garbage-collecting) one
  // per line forever.
  function wireBlockClicks(logEl) {
    logEl.addEventListener("click", (e) => {
      const nameEl = e.target.closest(".from[data-user-id]");
      if (!nameEl) return;
      const userId = nameEl.dataset.userId;
      const name = nameEl.textContent.replace(/:$/, "");
      handlers.onBlockUser?.(userId, name);
    });
  }
  wireBlockClicks(shopLog);
  wireBlockClicks(tableLog);

  return {
    setHandlers(next) {
      handlers = { ...handlers, ...next };
    },
    // The logged-in account's own id - so its own messages never grow a
    // "block" trigger - and the current set of blocked ids, re-sent
    // whenever it changes (see main.js's refreshBlockedUsers()). Set
    // once at login, not per shop visit.
    setOwnUserId(id) {
      ownUserId = id;
    },
    setBlockedUserIds(ids) {
      blockedIds = new Set(ids);
    },
    setShopName(shopName) {
      shopNameLabel.textContent = shopName ? `(${shopName})` : "";
    },
    // Called when (re-)entering a shop - clears out whatever the
    // previous shop's chat/call UI left behind so a freshly-joined shop
    // never briefly shows the last one's messages or roster.
    reset(shopName) {
      this.setShopName(shopName);
      shopLog.innerHTML = "";
      this.clearTableLog();
      this.setSeatedAt(null);
      this.clearVoiceRoster();
    },
    appendShopMessage(msg) {
      appendMessage(shopLog, msg, { blockedIds, ownUserId });
    },
    appendTableMessage(msg) {
      appendMessage(tableLog, msg, { blockedIds, ownUserId });
    },
    setSeatedAt(tableLabel) {
      if (tableLabel) {
        tableTitle.textContent = tableLabel;
        tableInput.disabled = false;
        tableSendBtn.disabled = false;
        tableInput.placeholder = "Message this table only...";
      } else {
        tableTitle.textContent = "Walk up to a table";
        tableInput.disabled = true;
        tableSendBtn.disabled = true;
        tableInput.placeholder = "Sit at a table to chat here";
      }
    },
    clearTableLog() {
      tableLog.innerHTML = "";
    },

    // "Who's in this table's call" roster - see the comment on
    // #voice-roster in index.html for why this lives here instead of
    // inside the call panel's video-tile grid.
    addVoiceParticipant({ id, name }) {
      const chip = voiceRosterChip(voiceRosterList, id);
      chip.querySelector(".voice-roster-name").textContent = name;
      voiceRoster.hidden = voiceRosterList.children.length === 0;
    },
    removeVoiceParticipant(id) {
      voiceRosterList.querySelector(`[data-peer="${id}"]`)?.remove();
      voiceRoster.hidden = voiceRosterList.children.length === 0;
    },
    setVoiceParticipantMicMuted(id, muted) {
      const chip = voiceRosterList.querySelector(`[data-peer="${id}"]`);
      if (chip) chip.querySelector(".badge-mic").hidden = !muted;
    },
    setVoiceParticipantDeafened(id, deafened) {
      const chip = voiceRosterList.querySelector(`[data-peer="${id}"]`);
      if (chip) chip.querySelector(".badge-deaf").hidden = !deafened;
    },
    setVoiceParticipantSpeaking(id, speaking) {
      const chip = voiceRosterList.querySelector(`[data-peer="${id}"]`);
      chip?.classList.toggle("speaking", speaking);
    },
    clearVoiceRoster() {
      voiceRosterList.innerHTML = "";
      voiceRoster.hidden = true;
    },
  };
}

function voiceRosterChip(listEl, peerId) {
  let chip = listEl.querySelector(`[data-peer="${peerId}"]`);
  if (!chip) {
    chip = document.createElement("div");
    chip.className = "voice-roster-chip";
    chip.dataset.peer = peerId;
    chip.innerHTML =
      '<span class="voice-roster-dot"></span>' +
      '<span class="voice-roster-name"></span>' +
      `<span class="voice-roster-badge badge-mic" hidden title="Mic muted">${icon("mic-off", "icon-only")}</span>` +
      `<span class="voice-roster-badge badge-deaf" hidden title="Deafened">${icon("volume-x", "icon-only")}</span>`;
    listEl.appendChild(chip);
  }
  return chip;
}
