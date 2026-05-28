// src/utils/seed.js — create demo accounts for all 4 roles
'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');
const Batch    = require('../models/Batch');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'younovate_lms' });
  console.log('✅  Connected');

  const batch = await Batch.findOneAndUpdate(
    { name: 'Demo Batch 2026' },
    { name: 'Demo Batch 2026', startDate: new Date(), status: 'active', course: 'Full Stack Development' },
    { upsert: true, new: true }
  );

  const accounts = [
    { name: 'Admin Demo',   email: 'admin@younovate.in',   password: 'Admin@1234',   role: 'admin'   },
    { name: 'Trainer Demo', email: 'trainer@younovate.in', password: 'Trainer@1234', role: 'trainer', batchId: batch._id },
    { name: 'Trainee Demo', email: 'trainee@younovate.in', password: 'Trainee@1234', role: 'trainee', batchId: batch._id, enrolledAt: new Date() },
    { name: 'HR Demo',      email: 'hr@younovate.in',      password: 'Hr@12345678',  role: 'hr'      },
  ];

  for (const acc of accounts) {
    const exists = await User.findOne({ email: acc.email });
    if (exists) { console.log(`  ⚠️  ${acc.email} already exists — skipped`); continue; }
    await User.create(acc);
    console.log(`  ✅  Created ${acc.role}: ${acc.email}`);
  }

  console.log('\n🌱  Seed complete\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
