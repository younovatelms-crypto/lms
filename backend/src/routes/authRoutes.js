// src/routes/authRoutes.js
'use strict';
const express = require('express');
const {
  register, login, logout, refresh, getMe,
  updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
// POST /api/auth/register
//   Body: { name: string, email: string, password: string, role?: 'admin'|'trainer'|'trainee'|'hr' }
router.post('/register', register);

// POST /api/auth/login
//   Body: { email: string, password: string }
router.post('/login', login);

// POST /api/auth/refresh
//   Cookie: refreshToken (httpOnly, set on login)
router.post('/refresh', refresh);

// POST /api/auth/forgot-password
//   Body: { email: string }
router.post('/forgot-password', forgotPassword);

// POST /api/auth/verify-otp
//   Body: { email: string, otp: string }
router.post('/verify-otp', verifyOtp);

// POST /api/auth/reset-password
//   Body: { email: string, otp: string, newPassword: string }
router.post('/reset-password', resetPassword);

// ── Protected ─────────────────────────────────────────────────────────────────
// POST /api/auth/logout   [requires JWT]
router.post('/logout', protect, logout);

// GET  /api/auth/me       [requires JWT]
router.get('/me', protect, getMe);

// PUT  /api/auth/profile  [requires JWT]
//   Body: { name?, phone?, bio?, profilePicture?, linkedIn?, github?, skills?, expertise? }
router.put('/profile', protect, updateProfile);

// PUT  /api/auth/change-password  [requires JWT]
//   Body: { currentPassword: string, newPassword: string }
router.put('/change-password', protect, changePassword);

module.exports = router;
