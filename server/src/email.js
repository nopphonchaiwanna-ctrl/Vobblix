// Sends transactional email (account verification, password reset).
// Two transports, first one configured wins:
//   1. Brevo's HTTP API (BREVO_API_KEY + EMAIL_FROM) - for hosting that
//      blocks outbound SMTP ports, e.g. Render's free plan. The sender
//      address must be verified in Brevo (Senders & IP); a plain Gmail
//      address works, no domain needed.
//   2. SMTP (SMTP_HOST/PORT/USER/PASS) - any SMTP provider, e.g. a Gmail
//      account with an app password for local development.
//
// If neither is configured, sendEmail() logs the message to the
// console instead of sending it - so register/login/forgot-password
// can be exercised locally (reading the token out of the server log)
// without needing a real mailbox wired up first.

import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, BREVO_API_KEY } = process.env;

const brevoConfigured = Boolean(BREVO_API_KEY && EMAIL_FROM);
const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

if (BREVO_API_KEY && !EMAIL_FROM) {
  console.warn("[email] BREVO_API_KEY is set but EMAIL_FROM isn't - Brevo needs a verified sender address.");
}
if (!brevoConfigured && !smtpConfigured) {
  console.warn(
    "[email] Neither BREVO_API_KEY nor SMTP_HOST/SMTP_USER/SMTP_PASS is set - " +
      "verification/reset emails will be logged to the console instead of " +
      "actually sent. See server/.env.example."
  );
}

const transporter =
  !brevoConfigured && smtpConfigured
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

// "VobbLiX <me@gmail.com>" or a bare address -> Brevo's { name, email }.
function parseFrom(from) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return match ? { name: match[1].replace(/^"|"$/g, "") || "VobbLiX", email: match[2] } : { name: "VobbLiX", email: from.trim() };
}

async function sendViaBrevo({ to, subject, html, text }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender: parseFrom(EMAIL_FROM), to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Brevo HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

export async function sendEmail({ to, subject, html, text }) {
  if (brevoConfigured) {
    await sendViaBrevo({ to, subject, html, text });
    return;
  }
  if (!transporter) {
    console.log(
      `[email] (email not configured, not actually sent)\n` +
        `  To: ${to}\n  Subject: ${subject}\n  ${text || html}`
    );
    return;
  }
  await transporter.sendMail({ from: EMAIL_FROM || SMTP_USER, to, subject, html, text });
}

// Shared HTML shell for both emails below - a single dark card on a
// light page, deliberately echoing the client's own #auth .lobby-card
// (same background var(--panel) #0f172a, 16px radius, var(--accent)
// #38bdf8 button) so the email looks like it actually came from Card
// Cafe rather than a generic "here's a link" system email. Built with
// a table + inline styles rather than client/src/style.css's real CSS
// (classes, custom properties, flexbox) because email clients strip
// <style> blocks and custom properties, and plenty still render on
// Word's HTML engine (Outlook desktop), which only reliably lays out
// <table>-based markup.
function emailShell({ heading, bodyHtml, ctaLabel, ctaUrl, footnote }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0; padding:32px 16px; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:480px; width:100%; background:#0f172a; border-radius:16px;">
            <tr>
              <td style="padding:32px 32px 0; text-align:center;">
                <span style="font-size:22px; line-height:1;">&#127185;</span>
                <div style="font-size:18px; font-weight:700; color:#38bdf8; margin-top:6px;">
                  VobbLiX
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <h1 style="font-size:17px; font-weight:600; color:#e2e8f0; margin:0 0 12px;">
                  ${heading}
                </h1>
                <div style="font-size:14px; line-height:1.6; color:#cbd5e1;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0; text-align:center;">
                <a href="${ctaUrl}"
                   style="display:inline-block; background:#38bdf8; color:#06202f; font-weight:600; font-size:14px; text-decoration:none; padding:12px 28px; border-radius:8px;">
                  ${ctaLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <p style="font-size:12px; color:#94a3b8; line-height:1.5; word-break:break-all; margin:0;">
                  Or paste this link into your browser:<br />
                  <a href="${ctaUrl}" style="color:#38bdf8;">${ctaUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="font-size:12px; color:#94a3b8; line-height:1.5; margin:0; border-top:1px solid #1f2937; padding-top:16px;">
                  ${footnote}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmail(link) {
  return {
    subject: "Verify your VobbLiX email",
    text: `Welcome to VobbLiX! Verify your email to finish creating your account:\n${link}\n\nThis link expires in 24 hours.`,
    html: emailShell({
      heading: "Verify your email",
      bodyHtml: `<p style="margin:0;">Welcome to VobbLiX! Click the button below to verify your email and finish creating your account.</p>`,
      ctaLabel: "Verify email",
      ctaUrl: link,
      footnote: "This link expires in 24 hours. If you didn't create a VobbLiX account, you can ignore this email - nothing happens until it's clicked.",
    }),
  };
}

export function passwordResetEmail(link) {
  return {
    subject: "Reset your VobbLiX password",
    text: `Reset your password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: emailShell({
      heading: "Reset your password",
      bodyHtml: `<p style="margin:0;">We got a request to reset your VobbLiX password. Click the button below to choose a new one.</p>`,
      ctaLabel: "Reset password",
      ctaUrl: link,
      footnote: "This link expires in 1 hour. If you didn't request this, you can safely ignore this email - your password won't change.",
    }),
  };
}
