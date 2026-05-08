require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Shared hosting certs are issued to the server hostname, not your domain
    rejectUnauthorized: false,
  },
});

console.log("SMTP Config:");
console.log("  Host  :", process.env.SMTP_HOST);
console.log("  Port  :", process.env.SMTP_PORT);
console.log("  Secure:", process.env.SMTP_SECURE);
console.log("  User  :", process.env.SMTP_USER);
console.log("");

async function main() {
  // 1. Verify connection
  console.log("Verifying SMTP connection...");
  try {
    await transporter.verify();
    console.log("✓ SMTP connection OK\n");
  } catch (err) {
    console.error("✗ SMTP connection FAILED:", err.message);
    process.exit(1);
  }

  // 2. Send a test email to the same address
  const to = process.env.SMTP_USER;
  console.log(`Sending test email to: ${to}`);
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: "SMTP Test — Aura CMS",
      text: "This is a test email from Aura CMS SMTP connection test.",
      html: "<p>This is a <strong>test email</strong> from Aura CMS SMTP connection test.</p>",
    });
    console.log("✓ Email sent successfully");
    console.log("  Message ID:", info.messageId);
    if (info.preview) console.log("  Preview URL:", info.preview);
  } catch (err) {
    console.error("✗ Failed to send email:", err.message);
    process.exit(1);
  }
}

main();
