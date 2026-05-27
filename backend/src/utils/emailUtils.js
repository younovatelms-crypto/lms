// src/utils/emailUtils.js
// Reusable NodeMailer transporter for Younovate LMS
// npm install nodemailer

const nodemailer = require("nodemailer");

// Transporter is created once and reused — not recreated per email
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,  // Gmail: use an App Password, not your account password
  },
});

/**
 * sendEmail({ to, subject, html })
 * Throws on failure — controllers wrap in try/catch
 */
const sendEmail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from:    `"Younovate LMS" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("EMAIL SENT:", info.messageId);
  }

  return info;
};

module.exports = { sendEmail };

/*
─────────────────────────────────────────────────────
ADD TO YOUR .env FILE:

# Gmail (development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_16_char_app_password   # Google Account → Security → App Passwords
SMTP_FROM=Younovate LMS <your@gmail.com>

# SendGrid (production — recommended)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@younovate.com
─────────────────────────────────────────────────────
*/