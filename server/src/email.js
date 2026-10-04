// Sends transactional email (account verification, password reset)
// over SMTP. Deliberately provider-agnostic - fill in SMTP_HOST/PORT/
// USER/PASS in .env and any SMTP-speaking provider works (Resend,
// SendGrid, Mailtrap for local testing, a personal Gmail account with
// an app password, ...). See README's "Planned: mandatory email
// verification..." section for why a Thailand-local provider isn't
// relevant here - this is plain SMTP, not the SMS-OTP cost comparison
// that applies to the phone-verification idea.
//
// If SMTP isn't configured at all, sendEmail() logs the message to the
// console instead of sending it - so register/login/forgot-password
// can be exercised locally (reading the token out of the server log)
// without needing a real mailbox wired up first.

import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

if (!configured) {
  console.warn(
    "[email] SMTP_HOST/SMTP_USER/SMTP_PASS not set - verification/reset " +
      "emails will be logged to the console instead of actually sent. " +
      "See server/.env.example."
  );
}

const transporter = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(
      `[email] (SMTP not configured, not actually sent)\n` +
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
