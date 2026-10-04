// Account HTTP endpoints: register, login, "who am I" (used by the
// client to skip the login form when a saved token is still valid, and
// to know the account's role - customer/shop_owner/admin - for which UI
// to show), PATCH /me for the settings panel (display name, avatar
// URL - see ui/settings.js), and the email-verification/password-reset
// flows below. Password changes (while logged in) and account-deletion
// requests live in routes/account.js instead, since they're not part of
// the "me" resource shape.
//
// Email verification is mandatory, not a soft reminder: /login returns
// 403 EMAIL_NOT_VERIFIED until the account's email_verified_at is set,
// and /register no longer hands back a usable session token - it just
// kicks off the verification email. See README's "Planned: mandatory
// email verification, password reset, and phone OTP" section for the
// reasoning (now mostly "done", not "planned" - phone OTP is still the
// open part).

import { Router } from "express";
import { pool } from "../db/pool.js";
import { hashPassword, verifyPassword, signToken, isStrongPassword, PASSWORD_REQUIREMENT_MESSAGE } from "../auth.js";
import { requireAuth } from "../middleware/auth.js";
import { updateProfile, findByEmail, markEmailVerified, updatePasswordHash } from "../db/users.js";
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "../db/tokens.js";
import { sendEmail, verificationEmail, passwordResetEmail } from "../email.js";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Used to build links that land back on the client (a separately
// deployed static site - see README's "Architecture") from inside an
// emailed verification/reset link. Defaults to the Vite dev server so
// this works out of the box locally.
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

async function issueVerificationEmail(user) {
  const rawToken = await createEmailVerificationToken(user.id);
  const link = `${CLIENT_URL}/verify-email?token=${rawToken}`;
  await sendEmail({ to: user.email, ...verificationEmail(link) });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (displayName || "").trim().slice(0, 24);

    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENT_MESSAGE });
    }
    if (!cleanName) {
      return res.status(400).json({ error: "Enter a display name." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, avatar_url, role`,
      [cleanEmail, passwordHash, cleanName]
    );
    const user = rows[0];
    await issueVerificationEmail(user);

    // Deliberately no token/session here anymore - the account can't
    // log in until the email is verified, so handing back a working
    // JWT would just be a session that every other check then has to
    // remember to distrust. The client shows a "check your email"
    // notice instead of navigating into the app - see main.js.
    res.status(201).json({ verificationRequired: true, email: user.email });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();

    const { rows } = await pool.query(
      "SELECT id, email, display_name, avatar_url, role, password_hash, email_verified_at FROM users WHERE email = $1",
      [cleanEmail]
    );
    const user = rows[0];
    const ok = user && (await verifyPassword(password || "", user.password_hash));
    if (!ok) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    if (!user.email_verified_at) {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    res.json({ token: signToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

// Redeems a verification link's token (?token=... on the client's
// /verify-email page - see main.js). Not behind requireAuth: whoever
// clicks the emailed link isn't logged in yet, by definition.
authRouter.post("/verify-email", async (req, res, next) => {
  try {
    const token = (req.body?.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Missing verification token." });
    }
    const userId = await consumeEmailVerificationToken(token);
    if (!userId) {
      return res.status(400).json({ error: "That verification link is invalid or has expired." });
    }
    await markEmailVerified(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Lets someone stuck on the EMAIL_NOT_VERIFIED login error (or who lost
// the first email) get a fresh link. Always responds the same way
// whether or not the address is registered/already verified, so this
// can't be used to probe which emails have accounts - see
// /forgot-password below for the same reasoning.
authRouter.post("/resend-verification", async (req, res, next) => {
  try {
    const cleanEmail = (req.body?.email || "").trim().toLowerCase();
    const user = cleanEmail ? await findByEmail(cleanEmail) : null;
    if (user && !user.email_verified_at) {
      await issueVerificationEmail(user);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Always responds { ok: true } regardless of whether the email exists -
// a different response for "no account with that email" would let
// anyone enumerate registered addresses one guess at a time.
authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const cleanEmail = (req.body?.email || "").trim().toLowerCase();
    const user = cleanEmail ? await findByEmail(cleanEmail) : null;
    if (user) {
      const rawToken = await createPasswordResetToken(user.id);
      const link = `${CLIENT_URL}/reset-password?token=${rawToken}`;
      await sendEmail({ to: user.email, ...passwordResetEmail(link) });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const token = (req.body?.token || "").trim();
    const { newPassword } = req.body || {};
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: PASSWORD_REQUIREMENT_MESSAGE });
    }
    if (!token) {
      return res.status(400).json({ error: "Missing reset token." });
    }
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: "That reset link is invalid or has expired." });
    }
    const passwordHash = await hashPassword(newPassword);
    await updatePasswordHash(userId, passwordHash);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, display_name, avatar_url, role FROM users WHERE id = $1",
      [req.auth.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: "Not authenticated." });
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// Settings panel's "Save profile" - only the fields actually sent are
// changed (see db/users.js's updateProfile), so the client can send just
// displayName, just avatarUrl, or both.
authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body?.displayName === "string") {
      const cleanName = req.body.displayName.trim().slice(0, 24);
      if (!cleanName) {
        return res.status(400).json({ error: "Display name can't be empty." });
      }
      updates.displayName = cleanName;
    }

    if (typeof req.body?.avatarUrl === "string") {
      const avatarUrl = req.body.avatarUrl.trim();
      // Used to silently .slice(0, 500) this, back when it could only
      // ever be a plain link - now it can be a resized-photo data: URL
      // (tens of KB; see client/src/ui/settings.js's
      // fileToAvatarDataUrl()), and slicing one of those would just
      // corrupt it into base64 that fails to decode. Reject instead of
      // truncating; 500,000 chars is generous headroom over what the
      // 256px/JPEG-0.85 client-side resize actually produces.
      if (avatarUrl.length > 500_000) {
        return res.status(400).json({ error: "That image is too large. Try a smaller picture." });
      }
      // An empty string clears it back to no avatar - not "leave unchanged".
      updates.avatarUrl = avatarUrl || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update." });
    }

    const user = await updateProfile(req.auth.userId, updates);
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || null,
    role: row.role,
  };
}
