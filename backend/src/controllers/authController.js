// src/controllers/authController.js
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const {
  generateSessionToken,
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearAuthCookies,
} = require("../utils/tokenUtils");

const { sendEmail } = require("../utils/emailUtils");

/* ─────────────────────────────────────────────────────────────────────────────
   REGISTER
───────────────────────────────────────────────────────────────────────────── */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email:        email.toLowerCase(),
      password,
      role:         role || "trainee",
      sessionToken: generateSessionToken(),
      isActive:     true,
    });

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success:     true,
      message:     "Registration successful",
      accessToken,
      user:        user.toPublic(),
      role:        user.role,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────────────────────────────────────── */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    user.sessionToken = generateSessionToken();
    user.lastLoginAt  = new Date();
    await user.save();

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    return res.json({
      success:     true,
      accessToken,
      user:        user.toPublic(),
      role:        user.role,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   LOGOUT
───────────────────────────────────────────────────────────────────────────── */
const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      sessionToken: generateSessionToken(),
    });

    clearAuthCookies(res);

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   REFRESH TOKEN
───────────────────────────────────────────────────────────────────────────── */
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user || user.sessionToken !== decoded.sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const accessToken = generateAccessToken(user);

    return res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error("REFRESH ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Refresh token expired",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET CURRENT USER
───────────────────────────────────────────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user:    req.user.toPublic(),
      role:    req.user.role,
    });
  } catch (error) {
    console.error("GETME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   FORGOT PASSWORD
   POST /api/auth/forgot-password
   Body: { email }

   Delegates all OTP logic to user.createPasswordResetOtp() on the model.
───────────────────────────────────────────────────────────────────────────── */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Always return the same generic response — prevents email enumeration
    const genericOk = () =>
      res.json({
        success: true,
        message: "If that email is registered, an OTP has been sent",
      });

    const user = await User.findOne({
      email:    email.toLowerCase(),
      isActive: true,
    }).select(
      "+passwordResetToken +passwordResetExpires +passwordResetAttempts"
    );

    // Silent exit — do not reveal whether the email exists
    if (!user) return genericOk();

    // Generate OTP, hash + set expiry — all handled inside the model method
    const otp = await user.createPasswordResetOtp();
    await user.save();

    // Send the PLAIN otp to the user's email
    await sendEmail({
      to:      user.email,
      subject: "Younovate — Your password reset code",
      html:    otpEmailTemplate(user.name, otp),
    });

    return genericOk();
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   VERIFY OTP
   POST /api/auth/verify-otp
   Body: { email, otp }

   Delegates to user.verifyPasswordResetOtp() which handles:
     - expiry check
     - bcrypt.compare against passwordResetToken hash
     - brute-force counter (max 5 wrong guesses then OTP is cleared)
───────────────────────────────────────────────────────────────────────────── */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select(
      "+passwordResetToken +passwordResetExpires +passwordResetAttempts"
    );

    const fail = (msg = "Invalid or expired OTP") =>
      res.status(400).json({ success: false, message: msg });

    if (!user) return fail();

    const result = await user.verifyPasswordResetOtp(otp);

    // Persist attempt counter or cleared fields back to DB
    await user.save();

    if (result === "expired")
      return fail("OTP has expired. Please request a new one.");

    if (result === "max_attempts")
      return fail("Too many incorrect attempts. Please request a new OTP.");

    if (result === "invalid")
      return fail("Incorrect OTP. Please check and try again.");

    // result === "valid"
    return res.json({
      success:  true,
      message:  "OTP verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed. Please try again.",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   RESET PASSWORD
   POST /api/auth/reset-password
   Body: { email, otp, newPassword }

   Re-verifies OTP completely — never trusts the client-side verified state.
   On success: saves new password, clears OTP fields, rotates sessionToken
   which immediately invalidates all existing refresh tokens on all devices.
───────────────────────────────────────────────────────────────────────────── */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    // Mirror the frontend validation rules exactly
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must include at least one number",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select(
      "+password +passwordResetToken +passwordResetExpires +passwordResetAttempts"
    );

    const fail = (msg = "Invalid or expired OTP") =>
      res.status(400).json({ success: false, message: msg });

    if (!user) return fail();

    // Full re-verification — same flow as verifyOtp
    const result = await user.verifyPasswordResetOtp(otp);

    if (result === "expired")
      return fail("OTP has expired. Please request a new one.");

    if (result === "max_attempts")
      return fail("Too many incorrect attempts. Please request a new OTP.");

    if (result === "invalid") {
      await user.save(); // persist updated attempt count
      return fail();
    }

    // Prevent reusing the same password
    const isSamePassword = await user.comparePassword(newPassword);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password",
      });
    }

    // Assign new password — pre-save hook in User.js hashes it automatically
    user.password = newPassword;

    // Clear all OTP fields via model method
    user.clearPasswordResetOtp();

    // Rotate sessionToken — invalidates all existing refresh tokens across devices
    user.sessionToken = generateSessionToken();

    await user.save();

    // Send confirmation email
    await sendEmail({
      to:      user.email,
      subject: "Younovate — Password changed successfully",
      html:    pwChangedEmailTemplate(user.name),
    });

    return res.json({
      success: true,
      message: "Password reset successfully. Please sign in with your new password.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Password reset failed. Please try again.",
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   EMAIL TEMPLATES
───────────────────────────────────────────────────────────────────────────── */
const otpEmailTemplate = (name, otp) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:Inter,Arial,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e2a3f">
    <div style="background:#6366f1;padding:28px 32px">
      <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700">Younovate LMS</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe">Password Reset Request</p>
    </div>
    <div style="padding:32px">
      <p style="color:#94a3b8;font-size:15px;margin:0 0 8px">Hi ${name},</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.6">
        We received a request to reset your Younovate password.
        Use the code below — it expires in <strong style="color:#f1f5f9">5 minutes</strong>.
      </p>
      <div style="background:#1a2235;border:1.5px solid #1e2a3f;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
        <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#a5b4fc;font-family:monospace">${otp}</div>
        <p style="margin:10px 0 0;font-size:12px;color:#475569">One-time password · Valid for 5 minutes</p>
      </div>
      <p style="color:#475569;font-size:12px;margin:0;line-height:1.6">
        If you didn't request this, you can safely ignore this email.
        Your password will not change.
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1e2a3f;text-align:center">
      <p style="color:#374151;font-size:11px;margin:0">© 2026 Younovate Labs · All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;

const pwChangedEmailTemplate = (name) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:Inter,Arial,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e2a3f">
    <div style="background:#15803d;padding:28px 32px">
      <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700">Younovate LMS</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#bbf7d0">Password Changed Successfully</p>
    </div>
    <div style="padding:32px">
      <p style="color:#94a3b8;font-size:15px;margin:0 0 8px">Hi ${name},</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6">
        Your Younovate password was successfully changed.
        You can now sign in with your new password.
      </p>
      <p style="color:#f87171;font-size:13px;background:#1a2235;border:1px solid #991b1b;border-radius:8px;padding:14px 16px;margin:0;line-height:1.6">
        If you did not make this change, contact support immediately at
        <a href="mailto:support@younovate.com" style="color:#fca5a5">support@younovate.com</a>
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1e2a3f;text-align:center">
      <p style="color:#374151;font-size:11px;margin:0">© 2026 Younovate Labs · All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────────────────────── */
module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
};