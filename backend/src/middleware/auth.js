// src/middleware/auth.js
'use strict';
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect / authenticate — verifies JWT and attaches req.user
 * Accepts:  Authorization: Bearer <token>  OR  accessToken cookie
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated — provide a Bearer token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }

    // Single-device session enforcement
    if (user.sessionToken && decoded.sessionToken && user.sessionToken !== decoded.sessionToken) {
      return res.status(401).json({ success: false, message: 'Session expired — logged in from another device' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired — use /api/auth/refresh' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * authorize(...roles) — role-based access control
 * Usage:  router.get('/admin-only', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied — requires role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
    });
  }
  next();
};

// Alias so legacy imports like { authenticate } still work
module.exports = { protect, authorize, authenticate: protect };
