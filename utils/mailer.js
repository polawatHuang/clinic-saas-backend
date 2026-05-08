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
    rejectUnauthorized: false,
  },
});

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Aura CMS" <${process.env.SMTP_USER}>`,
    to,
    subject: "รีเซ็ตรหัสผ่าน Aura CMS",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="display:inline-flex;width:56px;height:56px;background:#16a34a;border-radius:12px;align-items:center;justify-content:center;">
            <span style="color:#fff;font-size:24px;font-weight:700;line-height:56px;display:block;text-align:center;">A</span>
          </div>
          <h1 style="margin:16px 0 0;font-size:20px;color:#111827;">Aura CMS</h1>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">สวัสดี${name ? ` ${name}` : ""},</h2>
          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
            เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่<br>
            ลิงก์นี้จะหมดอายุใน <strong>1 ชั่วโมง</strong>
          </p>
        </td></tr>
        <tr><td align="center" style="padding:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
            รีเซ็ตรหัสผ่าน
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid #f3f4f6;padding-top:20px;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
            หากคุณไม่ได้ทำการขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้<br>
            ลิงก์จะหมดอายุอัตโนมัติและบัญชีของคุณจะปลอดภัย
          </p>
          <p style="margin:12px 0 0;color:#d1d5db;font-size:11px;">
            หากปุ่มด้านบนใช้งานไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
            <span style="word-break:break-all;color:#6b7280;">${resetUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

module.exports = { sendPasswordResetEmail };
