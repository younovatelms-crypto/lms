// src/routes/adminRoutes.js
const express = require('express');

const {
  getDashboard,
  getUsers,
  toggleUserStatus,
  getBatches,
  getRegistrations,
  convertLead,
  createRegistration,
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Public route — registration form submission (no auth required) ─────────
router.post('/registrations', createRegistration);

// ── All routes below require valid JWT + admin role ────────────────────────
router.use(protect);
router.use(authorize('admin'));

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard);

// ── Users ──────────────────────────────────────────────────────────────────
router.get  ('/users',            getUsers);
router.patch('/users/:id/status', toggleUserStatus);

// ── Batches ────────────────────────────────────────────────────────────────
router.get('/batches', getBatches);

// ── Registrations / Leads ──────────────────────────────────────────────────
router.get ('/registrations',             getRegistrations);
router.post('/registrations/:id/convert', convertLead);

module.exports = router;