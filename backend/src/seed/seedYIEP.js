// src/seed/seedYIEP.js
'use strict';
//
// Standalone seeder — loads the full YIEP curriculum into MongoDB.
//
//   npm run seed          # create if missing
//   npm run seed:force    # rebuild curriculum if it already exists
//
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/courses');               // <-- match filename casing
const { YIEP_COURSE, YIEP_TRIMESTERS } = require('../data/yiepCurriculum');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/younovate_lms';
const FORCE = process.argv.includes('--force');

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    let course = await Course.findOne({ code: YIEP_COURSE.code });

    if (course && !FORCE) {
      console.log(`! YIEP course already exists (id ${course._id}). Run "npm run seed:force" to rebuild.`);
      return;                                              // falls through to finally -> disconnect
    }

    if (course) {
      Object.assign(course, YIEP_COURSE);
      course.trimesters = YIEP_TRIMESTERS;
    } else {
      course = new Course({ ...YIEP_COURSE, trimesters: YIEP_TRIMESTERS });
    }
    await course.save();

    const s = course.summary;
    console.log(FORCE ? '✓ YIEP curriculum rebuilt' : '✓ YIEP course created');
    console.log(`  id=${course._id}`);
    console.log(`  trimesters=${s.trimesters}  months=${s.months}  subjects=${s.subjects}`);
    console.log(`  hours: total=${s.hours.total}  S1=${s.hours.s1Theory}  S2=${s.hours.s2Practical}  S3=${s.hours.s3Assignment}  S4=${s.hours.s4Feedback}`);
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();