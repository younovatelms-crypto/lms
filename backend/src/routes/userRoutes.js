// src/routes/userRoutes.js — self-service user profile endpoints
'use strict';
const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

// GET /api/users/me  — alias of /api/auth/me
router.get('/me', (req, res) => res.json({ success: true, user: req.user.toPublic() }));

// GET /api/users/:id  — public profile (no sensitive fields)
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('name email role profilePicture bio linkedIn github skills expertise');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, data: user });
});

module.exports = router;
