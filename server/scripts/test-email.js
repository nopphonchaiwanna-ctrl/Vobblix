// One-off CLI to check the SMTP setup in server/.env actually works,
// and to preview the real verification/reset email designs in an
// actual inbox (not just read the HTML) - without needing the full
// register/login flow, a database, or a real token. Usage:
//
//   cd server
//   node scripts/test-email.js you@example.com            # plain test message
//   node scripts/test-email.js you@example.com verify     # preview the verification email
//   node scripts/test-email.js you@example.com reset      # preview the password-reset email
//
// The verify/reset previews use a fake token in the link (it won't
// actually verify/reset anything if clicked) - this is purely for
// looking at the design. With SMTP_HOST/SMTP_USER/SMTP_PASS unset, this
// takes the same console-log fallback as routes/auth.js's real emails
// (see src/email.js) - useful to confirm the script itself runs before
// worrying about real credentials.

import "dotenv/config";
import { sendEmail, verificationEmail, passwordResetEmail } from "../src/email.js";

const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

async function main() {
  const [to, kind] = process.argv.slice(2);
  if (!to) {
    console.error("Usage: node scripts/test-email.js <your-email@example.com> [verify|reset]");
    process.exit(1);
  }

  let subject, html, text;
  if (kind === "verify") {
    ({ subject, html, text } = verificationEmail(`${CLIENT_URL}/verify-email?token=preview-only-fake-token`));
  } else if (kind === "reset") {
    ({ subject, html, text } = passwordResetEmail(`${CLIENT_URL}/reset-password?token=preview-only-fake-token`));
  } else {
    subject = "VobbLiX - SMTP test";
    text = "If you're reading this in your inbox, the SMTP setup in server/.env works.";
    html = "<p>If you're reading this in your inbox, the SMTP setup in <code>server/.env</code> works.</p>";
  }

  console.log(`Sending a test email (${kind || "plain"}) to ${to}...`);
  await sendEmail({ to, subject, html, text });
  console.log(`Done - check the inbox (and spam folder) at ${to}.`);
}

main().catch((err) => {
  console.error("Failed to send:", err.message);
  process.exit(1);
});
