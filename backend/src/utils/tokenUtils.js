// src/utils/tokenUtils.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

const generateAccessToken = (user) =>
  jwt.sign(
    { userId: user._id, role: user.role, sessionToken: user.sessionToken },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { userId: user._id, sessionToken: user.sessionToken },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
};

module.exports = {
  generateSessionToken,
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearAuthCookies,
};
