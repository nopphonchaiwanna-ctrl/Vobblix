// Settings panel (#settings-panel): edit profile (display name, avatar
// photo), change password, check your shop-owner application status,
// and request account deletion. Reachable from the lobby for any
// logged-in account - see main.js. Deletion is request-only: an admin
// processes it by hand for now (see routes/account.js), there's no
// self-service "delete immediately" button.
//
// The avatar photo is picked from disk, resized/re-encoded entirely in
// the browser (fileToResizedDataUrl() from imageUpload.js, shared with
// ownerDashboard.js's shop-logo upload), and sent up as a small
// data: URL - it's saved in the exact same avatar_url column a plain
// image URL used to go in, so no upload endpoint/file storage exists
// or is needed (see server/src/routes/auth.js's PATCH /me).

import { fileToResizedDataUrl } from "./imageUpload.js";
import {
  updateProfile,
  changePassword,
  myApplication,
  requestAccountDeletion,
  myDeletionRequest,
  listBlockedUsers,
  unblockUser,
} from "../net/api.js";
import { escapeHtml } from "./format.js";
import { attachPasswordChecklist, attachConfirmPasswordCheck } from "./passwordChecklist.js";
import { requestAccountDeletionDialog } from "./confirmDialog.js";
import { getNotifyOrders, setNotifyOrders, getNotifySound, setNotifySound } from "../prefs.js";

function el(id) {
  return document.getElementById(id);
}

const APPLICATION_STATUS_TEXT = {
  pending: "Your shop-owner application is pending review.",
  approved: "Approved - you're a shop owner.",
};

export function initSettingsPanel({ getToken, getSession, onBack, onProfileChanged, onBlockedUsersChanged }) {
  const screen = el("settings-panel");
  const backBtn = el("settings-back");

  const profileForm = el("settings-profile-form");
  const displayNameInput = el("settings-display-name");
  const avatarPreview = el("settings-avatar-preview");
  const avatarFallback = el("settings-avatar-fallback");
  const avatarFileInput = el("settings-avatar-file");
  const avatarChooseBtn = el("settings-avatar-choose-btn");
  const avatarRemoveBtn = el("settings-avatar-remove-btn");
  const avatarError = el("settings-avatar-error");
  const profileSuccess = el("settings-profile-success");
  const profileError = el("settings-profile-error");

  const passwordForm = el("settings-password-form");
  const currentPasswordInput = el("settings-current-password");
  const newPasswordInput = el("settings-new-password");
  const confirmPasswordInput = el("settings-confirm-password");
  const passwordSuccess = el("settings-password-success");
  const passwordError = el("settings-password-error");

  attachPasswordChecklist(newPasswordInput, el("settings-password-rules"));
  attachConfirmPasswordCheck(
    newPasswordInput,
    confirmPasswordInput,
    el("settings-confirm-rules")
  );

  const applicationStatusEl = el("settings-application-status");

  const deletionStatusEl = el("settings-deletion-status");
  const deleteBtn = el("settings-delete-account-btn");
  const deleteError = el("settings-delete-error");

  const blockedEmptyEl = el("settings-blocked-empty");
  const blockedListEl = el("settings-blocked-list");
  const blockedErrorEl = el("settings-blocked-error");

  const notifyOrdersToggle = el("settings-notify-orders");
  const notifySoundToggle = el("settings-notify-sound");

  // The value that will actually be sent as avatarUrl on save - starts
  // as whatever the account already has, and only changes when a new
  // photo is picked or "Remove" is clicked (never by typing, there's no
  // text field for it anymore).
  let avatarValue = "";

  const MAX_AVATAR_DIMENSION = 256;
  const MAX_AVATAR_SOURCE_BYTES = 12 * 1024 * 1024; // 12MB raw upload, before resizing

  function setAvatarPreview(url) {
    avatarPreview.hidden = !url;
    avatarPreview.src = url || "";
    avatarFallback.hidden = Boolean(url);
    avatarRemoveBtn.hidden = !url;
  }

  // Resizing/re-encoding itself (caps the longest side at 256px, JPEG
  // quality 0.85) lives in imageUpload.js's fileToResizedDataUrl() -
  // shared with ownerDashboard.js's shop-logo upload. A multi-megabyte
  // phone photo turns into a data: URL of a few tens of KB (small
  // enough for the DB column, the PATCH /me request body, and getting
  // broadcast to other players in a shop as a character texture - see
  // ShopScene.js's applyAvatarImage()). Deliberately NOT baked into the
  // login JWT like displayName is (see server/src/auth.js) - that would
  // blow well past the ~16KB HTTP header limit the moment anyone
  // uploaded a real photo and break every authenticated request.

  avatarChooseBtn.addEventListener("click", () => avatarFileInput.click());

  avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files?.[0];
    avatarFileInput.value = ""; // lets the same file be re-picked later (e.g. after Remove)
    if (!file) return;
    avatarError.hidden = true;
    try {
      avatarValue = await fileToResizedDataUrl(file, {
        maxDimension: MAX_AVATAR_DIMENSION,
        maxSourceBytes: MAX_AVATAR_SOURCE_BYTES,
      });
      setAvatarPreview(avatarValue);
    } catch (err) {
      avatarError.textContent = err.message;
      avatarError.hidden = false;
    }
  });

  avatarRemoveBtn.addEventListener("click", () => {
    avatarValue = "";
    setAvatarPreview("");
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    profileError.hidden = true;
    profileSuccess.hidden = true;
    try {
      const { user } = await updateProfile(getToken(), {
        displayName: displayNameInput.value.trim(),
        avatarUrl: avatarValue,
      });
      onProfileChanged?.(user);
      profileSuccess.hidden = false;
    } catch (err) {
      profileError.textContent = err.message;
      profileError.hidden = false;
    }
  });

  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    passwordError.hidden = true;
    passwordSuccess.hidden = true;
    try {
      await changePassword(getToken(), currentPasswordInput.value, newPasswordInput.value);
      passwordForm.reset();
      passwordSuccess.hidden = false;
    } catch (err) {
      passwordError.textContent = err.message;
      passwordError.hidden = false;
    }
  });

  async function refreshApplicationStatus() {
    try {
      const { application } = await myApplication(getToken());
      if (!application) {
        applicationStatusEl.textContent = "You haven't applied to become a shop owner yet.";
      } else if (application.status === "rejected") {
        applicationStatusEl.textContent =
          "Rejected" + (application.rejection_reason ? `: ${application.rejection_reason}` : ".") + " You can apply again from the lobby.";
      } else {
        applicationStatusEl.textContent = APPLICATION_STATUS_TEXT[application.status] || application.status;
      }
    } catch {
      applicationStatusEl.textContent = "Couldn't load your application status right now.";
    }
  }

  async function refreshDeletionStatus() {
    try {
      const { request } = await myDeletionRequest(getToken());
      const pending = request?.status === "pending";
      deletionStatusEl.hidden = !pending;
      if (pending) {
        deletionStatusEl.textContent = "Account deletion requested - an admin will process it soon.";
      }
      deleteBtn.disabled = pending;
      deleteBtn.textContent = pending ? "Deletion pending" : "Request account deletion";
    } catch {
      deletionStatusEl.hidden = true;
    }
  }

  async function refreshBlockedList() {
    blockedErrorEl.hidden = true;
    try {
      const { blocked } = await listBlockedUsers(getToken());
      blockedEmptyEl.hidden = blocked.length > 0;
      blockedListEl.innerHTML = blocked
        .map(
          (u) => `
            <div class="row">
              <div class="row-main">
                <div class="row-title">${escapeHtml(u.displayName)}</div>
              </div>
              <div class="row-actions">
                <button type="button" class="secondary" data-unblock="${escapeHtml(u.id)}">Unblock</button>
              </div>
            </div>`
        )
        .join("");
    } catch (err) {
      blockedErrorEl.textContent = err.message;
      blockedErrorEl.hidden = false;
    }
  }

  blockedListEl.addEventListener("click", async (e) => {
    const userId = e.target.dataset.unblock;
    if (!userId) return;
    blockedErrorEl.hidden = true;
    try {
      await unblockUser(getToken(), userId);
      await refreshBlockedList();
      onBlockedUsersChanged?.();
    } catch (err) {
      blockedErrorEl.textContent = err.message;
      blockedErrorEl.hidden = false;
    }
  });

  // These take effect immediately (no "save" button) - they're just
  // local display preferences (see ../prefs.js), not account data.
  notifyOrdersToggle.addEventListener("change", () => {
    setNotifyOrders(notifyOrdersToggle.checked);
  });
  notifySoundToggle.addEventListener("change", () => {
    setNotifySound(notifySoundToggle.checked);
  });

  deleteBtn.addEventListener("click", async () => {
    deleteError.hidden = true;
    const { confirmed, reason } = await requestAccountDeletionDialog();
    if (!confirmed) return;
    try {
      await requestAccountDeletion(getToken(), reason);
      await refreshDeletionStatus();
    } catch (err) {
      deleteError.textContent = err.message;
      deleteError.hidden = false;
    }
  });

  backBtn.addEventListener("click", () => {
    screen.hidden = true;
    onBack?.();
  });

  return {
    async open() {
      document
        .querySelectorAll("#auth, #lobby, #game-screen, #owner-dashboard, #admin-panel, #orders-panel, #order-thread, #events-panel")
        .forEach((s) => (s.hidden = true));
      screen.hidden = false;

      profileError.hidden = true;
      profileSuccess.hidden = true;
      avatarError.hidden = true;
      passwordError.hidden = true;
      passwordSuccess.hidden = true;
      deleteError.hidden = true;
      passwordForm.reset();

      const session = getSession();
      displayNameInput.value = session?.user?.displayName || "";
      avatarValue = session?.user?.avatarUrl || "";
      setAvatarPreview(avatarValue);

      notifyOrdersToggle.checked = getNotifyOrders();
      notifySoundToggle.checked = getNotifySound();

      await Promise.all([refreshApplicationStatus(), refreshDeletionStatus(), refreshBlockedList()]);
    },
  };
}
