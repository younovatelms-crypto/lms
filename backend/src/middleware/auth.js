// src/middleware/auth.js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/* ─────────────────────────────────────────────────────────────────────────────
   protect — verifies JWT and attaches req.user
   Accepts token from:
     1. Authorization: Bearer <token>  header
     2. accessToken cookie (fallback)
───────────────────────────────────────────────────────────────────────────── */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Single-device session enforcement
    if (
      user.sessionToken &&
      decoded.sessionToken &&
      user.sessionToken !== decoded.sessionToken
    ) {
      return res.status(401).json({
        success: false,
        message: 'Session expired — logged in on another device',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   authorize(...roles) — role-based access control
   Usage: router.get('/admin-only', protect, authorize('admin'), handler)
          router.get('/staff',      protect, authorize('admin', 'trainer'), handler)
───────────────────────────────────────────────────────────────────────────── */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied — requires role: ${roles.join(' or ')}`,
    });
  }
  next();
};

// Export all three names so any existing import works without changes
module.exports = { protect, authorize, authenticate: protect };