// src/utils/emailUtils.js
'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from:    process.env.SMTP_FROM || `"Younovate LMS" <noreply@younovate.in>`,
    to, subject, html,
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧  Email sent to ${to} — messageId: ${info.messageId}`);
  }
  return info;
};

// ── OTP email template ────────────────────────────────────────────────────────
const otpTemplate = (name, otp) => `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1E;font-family:system-ui,sans-serif">
<div style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e2a3f">
  <div style="background:#6366f1;padding:28px 32px"><h1 style="margin:0;font-size:22px;color:#fff;font-weight:700">Younovate LMS</h1>
  <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe">Password Reset Request</p></div>
  <div style="padding:32px">
    <p style="color:#94a3b8;font-size:15px;margin:0 0 8px">Hi ${name},</p>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.6">Your one-time password — expires in <strong style="color:#f1f5f9">5 minutes</strong>.</p>
    <div style="background:#1a2235;border:1.5px solid #1e2a3f;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
      <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#a5b4fc;font-family:monospace">${otp}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#475569">One-time password · Valid for 5 minutes</p>
    </div>
    <p style="color:#475569;font-size:12px;margin:0;line-height:1.6">If you didn't request this, ignore this email. Your password won't change.</p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e2a3f;text-align:center">
    <p style="color:#374151;font-size:11px;margin:0">© 2026 Younovate Labs · All rights reserved</p>
  </div>
</div></body></html>`;

// ── Password changed confirmation ──────────────────────────────────────────────
const pwChangedTemplate = (name) => `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1E;font-family:system-ui,sans-serif">
<div style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e2a3f">
  <div style="background:#15803d;padding:28px 32px"><h1 style="margin:0;font-size:22px;color:#fff;font-weight:700">Younovate LMS</h1>
  <p style="margin:4px 0 0;font-size:13px;color:#bbf7d0">Password Changed Successfully</p></div>
  <div style="padding:32px">
    <p style="color:#94a3b8;font-size:15px;margin:0 0 8px">Hi ${name},</p>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6">Your password was successfully changed. Sign in with your new password.</p>
    <p style="color:#f87171;font-size:13px;background:#1a2235;border:1px solid #991b1b;border-radius:8px;padding:14px 16px;margin:0;line-height:1.6">
      If you did not make this change, contact <a href="mailto:support@younovate.in" style="color:#fca5a5">support@younovate.in</a> immediately.
    </p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e2a3f;text-align:center"><p style="color:#374151;font-size:11px;margin:0">© 2026 Younovate Labs</p></div>
</div></body></html>`;

module.exports = { sendEmail, otpTemplate, pwChangedTemplate };
