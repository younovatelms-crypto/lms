// src/controllers/authController.js
// ════════════════════════════════════════════════════════════════════════════
// AUTH FLOW:
//   POST /api/auth/register        → create account, return accessToken
//   POST /api/auth/login           → verify credentials, return accessToken + refreshToken cookie
//   POST /api/auth/refresh         → rotate accessToken using refreshToken cookie
//   POST /api/auth/logout          → rotate sessionToken (invalidates all devices)
//   GET  /api/auth/me              → return current user profile
//   PUT  /api/auth/profile         → update name/phone/bio/profilePicture/linkedIn/github
//   PUT  /api/auth/change-password → verify currentPassword, set newPassword
//   POST /api/auth/forgot-password → generate OTP, email it (5-min TTL)
//   POST /api/auth/verify-otp      → verify OTP (max 5 attempts)
//   POST /api/auth/reset-password  → re-verify OTP + set new password
// ════════════════════════════════════════════════════════════════════════════
'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  generateSessionToken, generateAccessToken, generateRefreshToken,
  setRefreshCookie, clearAuthCookies,
} = require('../utils/tokenUtils');
const { sendEmail, otpTemplate, pwChangedTemplate } = require('../utils/emailUtils');

/* ── REGISTER ────────────────────────────────────────────────────────────────
   POST /api/auth/register
   Body: { name, email, password, role? }
   Response: { success, accessToken, user, role }
──────────────────────────────────────────────────────────────────────────── */
const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'name, email and password are required' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists)
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });

  const sessionToken = generateSessionToken();
  const user = await User.create({
    name, email: email.toLowerCase(), password,
    role: role || 'trainee', sessionToken, isActive: true,
  });

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setRefreshCookie(res, refreshToken);

  return res.status(201).json({ success: true, accessToken, user: user.toPublic(), role: user.role });
};

/* ── LOGIN ───────────────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
   Response: { success, accessToken, user, role }
   Sets httpOnly refreshToken cookie
──────────────────────────────────────────────────────────────────────────── */
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +sessionToken');
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  if (!user.isActive)
    return res.status(403).json({ success: false, message: 'Account has been deactivated. Contact admin.' });

  user.sessionToken = generateSessionToken();
  user.lastLoginAt  = new Date();
  await user.save();

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setRefreshCookie(res, refreshToken);

  return res.json({ success: true, accessToken, user: user.toPublic(), role: user.role });
};

/* ── LOGOUT ──────────────────────────────────────────────────────────────────
   POST /api/auth/logout   [protected]
   Response: { success, message }
──────────────────────────────────────────────────────────────────────────── */
const logout = async (req, res) => {
  // Rotate sessionToken → invalidates all existing refresh tokens on all devices
  await User.findByIdAndUpdate(req.user._id, { sessionToken: generateSessionToken() });
  clearAuthCookies(res);
  return res.json({ success: true, message: 'Logged out successfully' });
};

/* ── REFRESH ─────────────────────────────────────────────────────────────────
   POST /api/auth/refresh
   Cookie: refreshToken (httpOnly)
   Response: { success, accessToken }
──────────────────────────────────────────────────────────────────────────── */
const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token)
    return res.status(401).json({ success: false, message: 'No refresh token — please log in' });

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user    = await User.findById(decoded.userId).select('+sessionToken');

  if (!user || user.sessionToken !== decoded.sessionToken)
    return res.status(401).json({ success: false, message: 'Refresh token invalid or revoked' });

  const accessToken = generateAccessToken(user);
  return res.json({ success: true, accessToken });
};

/* ── GET ME ──────────────────────────────────────────────────────────────────
   GET /api/auth/me   [protected]
   Response: { success, user, role }
──────────────────────────────────────────────────────────────────────────── */
const getMe = async (req, res) => {
  return res.json({ success: true, user: req.user.toPublic(), role: req.user.role });
};

/* ── UPDATE PROFILE ──────────────────────────────────────────────────────────
   PUT /api/auth/profile   [protected]
   Body: { name?, phone?, bio?, profilePicture?, linkedIn?, github? }
   Response: { success, user }
──────────────────────────────────────────────────────────────────────────── */
const updateProfile = async (req, res) => {
  const allowed = ['name', 'phone', 'bio', 'profilePicture', 'linkedIn', 'github', 'skills', 'expertise'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ success: false, message: 'No valid fields provided' });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  return res.json({ success: true, user: user.toPublic() });
};

/* ── CHANGE PASSWORD ─────────────────────────────────────────────────────────
   PUT /api/auth/change-password   [protected]
   Body: { currentPassword, newPassword }
   Response: { success, message }
──────────────────────────────────────────────────────────────────────────── */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, message: 'currentPassword and newPassword required' });
  if (newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'newPassword must be at least 8 characters' });

  const user = await User.findById(req.user._id).select('+password +sessionToken');
  if (!(await user.comparePassword(currentPassword)))
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  const same = await user.comparePassword(newPassword);
  if (same)
    return res.status(400).json({ success: false, message: 'New password must differ from the current one' });

  user.password     = newPassword;
  user.sessionToken = generateSessionToken(); // invalidate all sessions
  await user.save();

  return res.json({ success: true, message: 'Password changed. Please log in again with your new password.' });
};

/* ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
   POST /api/auth/forgot-password
   Body: { email }
   Response: { success, message }  — always 200 (anti-enumeration)
──────────────────────────────────────────────────────────────────────────── */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'email is required' });

  const ok = () => res.json({ success: true, message: 'If that email is registered, an OTP has been sent' });

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
    .select('+passwordResetToken +passwordResetExpires +passwordResetAttempts');
  if (!user) return ok(); // silent — don't reveal existence

  const otp = await user.createPasswordResetOtp();
  await user.save();

  await sendEmail({ to: user.email, subject: 'Younovate — Your password reset code', html: otpTemplate(user.name, otp) });
  return ok();
};

/* ── VERIFY OTP ──────────────────────────────────────────────────────────────
   POST /api/auth/verify-otp
   Body: { email, otp }
   Response: { success, verified }
──────────────────────────────────────────────────────────────────────────── */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'email and otp required' });

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+passwordResetToken +passwordResetExpires +passwordResetAttempts');
  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

  const result = await user.verifyPasswordResetOtp(otp);
  await user.save();

  if (result === 'expired')      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
  if (result === 'max_attempts') return res.status(400).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
  if (result === 'invalid')      return res.status(400).json({ success: false, message: 'Incorrect OTP.' });

  return res.json({ success: true, message: 'OTP verified', verified: true });
};

/* ── RESET PASSWORD ──────────────────────────────────────────────────────────
   POST /api/auth/reset-password
   Body: { email, otp, newPassword }
   Response: { success, message }
   NOTE: Full re-verification — never trusts client-side verified state
──────────────────────────────────────────────────────────────────────────── */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ success: false, message: 'email, otp and newPassword required' });
  if (newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  if (!/[0-9]/.test(newPassword))
    return res.status(400).json({ success: false, message: 'Password must include at least one number' });

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password +passwordResetToken +passwordResetExpires +passwordResetAttempts +sessionToken');
  if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

  const result = await user.verifyPasswordResetOtp(otp);
  if (result !== 'valid') {
    await user.save();
    const msgs = { expired: 'OTP expired.', max_attempts: 'Too many attempts.', invalid: 'Incorrect OTP.' };
    return res.status(400).json({ success: false, message: msgs[result] || 'Invalid OTP' });
  }

  const same = await user.comparePassword(newPassword);
  if (same) return res.status(400).json({ success: false, message: 'New password must differ from the current one' });

  user.password = newPassword;
  user.clearPasswordResetOtp();
  user.sessionToken = generateSessionToken(); // revoke all refresh tokens
  await user.save();

  await sendEmail({ to: user.email, subject: 'Younovate — Password changed', html: pwChangedTemplate(user.name) });
  return res.json({ success: true, message: 'Password reset. Please log in with your new password.' });
};

module.exports = { register, login, logout, refresh, getMe, updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword };
