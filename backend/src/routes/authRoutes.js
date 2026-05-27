// src/routes/authRoutes.js
const express = require("express");

const {
  register,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

// ✅ Correct path — your file is middleware/auth.js NOT middleware/authMiddleware.js
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ── Public routes (no auth required) ────────────────────────────────────── */
router.post("/register",        register);
router.post("/login",           login);
router.post("/refresh",         refresh);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp",      verifyOtp);
router.post("/reset-password",  resetPassword);

/* ── Protected routes (valid JWT required) ───────────────────────────────── */
router.post("/logout",          protect, logout);
router.get ("/me",              protect, getMe);

module.exports = router;