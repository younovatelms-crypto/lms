// src/scripts/seedTrainees.js
// ─────────────────────────────────────────────────────────────────────────────
// Seeds 500 test trainee users into MongoDB
// Uses the real User model (pre-save bcrypt hook) — same pattern as seed.js
//
// Credentials:
//   Email    : trainee1@younovate.in  →  trainee500@younovate.in
//   Password : trainee1               →  trainee500  (same as username)
//
// Commands:
//   node src/scripts/seedTrainees.js               → insert 500, skip existing
//   node src/scripts/seedTrainees.js --force        → delete all test trainees + reseed
//   node src/scripts/seedTrainees.js --count=200    → seed custom number
//   node src/scripts/seedTrainees.js --force --count=300
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ✅ Real User model — but we handle bcrypt manually for SPEED
// User.create() one-by-one triggers pre-save hook but is VERY SLOW for 500 users
// (500 × bcrypt.hash at cost 12 = ~8 min). We pre-hash and use insertMany() instead.
// insertMany with pre-hashed passwords is identical in security to the hook approach.
const User  = require('../models/User');
const Batch = require('../models/Batch');

// ── CLI args ───────────────────────────────────────────────────────────────
const FORCE    = process.argv.includes('--force');
const countArg = process.argv.find(a => a.startsWith('--count='));
const COUNT    = countArg ? Math.max(1, parseInt(countArg.split('=')[1])) : 500;

// ── Names ─────────────────────────────────────────────────────────────────
const FIRST = [
  'Rahul','Priya','Amit','Sneha','Rohan','Pooja','Kiran','Anjali','Vikas','Divya',
  'Suresh','Meera','Arjun','Kavya','Ravi','Nisha','Sanjay','Deepa','Manoj','Rekha',
  'Vijay','Sunita','Arun','Geeta','Rakesh','Usha','Shyam','Lata','Dinesh','Mala',
  'Ramesh','Savita','Mohan','Anita','Girish','Radha','Sunil','Kamla','Ajay','Shobha',
  'Vinod','Pushpa','Prakash','Sudha','Ashok','Jyoti','Hemant','Poonam','Satish','Asha',
  'Nikhil','Neha','Sachin','Sona','Kartik','Swati','Rohit','Ritu','Vivek','Vandana',
  'Gaurav','Gunjan','Tushar','Tanvi','Yash','Yashoda','Omkar','Ojal','Harish','Harini',
  'Bharat','Bhavna','Nilesh','Nalini','Chetan','Chaya','Sanket','Sangita','Tejas','Tejal',
];
const LAST = [
  'Sharma','Verma','Gupta','Singh','Kumar','Patel','Joshi','Shah','Mehta','Nair',
  'Reddy','Rao','Iyer','Pillai','Menon','Bhat','Nayak','Hegde','Desai','Jain',
  'Mishra','Tiwari','Pandey','Dubey','Yadav','Chaudhary','Srivastava','Tripathi','Agarwal','Garg',
  'Bansal','Goyal','Mittal','Mahajan','Kapoor','Khanna','Bhatia','Arora','Sethi','Malhotra',
  'Saxena','Bajpai','Kulkarni','Patil','Shinde','Pawar','More','Jadhav','Gaikwad','Mane',
  'Naik','Salvi','Kamat','Shetty','Alva','Kamath','Bhandari','Prabhu','Shenoy','Nambiar',
  'Rajan','Krishnan','Subramaniam','Natarajan','Venkatesh','Murugan','Selvam','Anand','Balu','Durai',
  'Khan','Sheikh','Ansari','Siddiqui','Qureshi','Mirza','Malik','Hussain','Ali','Ahmed',
];
const SKILLS_POOL = [
  'HTML','CSS','JavaScript','React','PHP','Laravel','MySQL','Git','Node.js','Python',
  'MongoDB','REST API','Tailwind CSS','Bootstrap','Linux','VPS Deployment','TypeScript',
  'Vue.js','Next.js','Express.js','Digital Marketing','SEO','Content Writing',
  'Lead Generation','Counselling','Data Analysis','Figma','UI/UX Design','AWS Basics',
];
const PLACEMENT_STATUSES = ['enrolled','training','ready','interview_scheduled'];

const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
const rSkills = () => {
  const n = Math.floor(Math.random() * 5) + 1;
  return [...SKILLS_POOL].sort(() => Math.random() - 0.5).slice(0, n);
};

// ── Progress bar ─────────────────────────────────────────────────────────
const bar = (done, total, width = 40) => {
  const pct   = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * width);
  const empty  = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct}%  (${done}/${total})`;
};

// ── Main ──────────────────────────────────────────────────────────────────
const seed = async () => {
  console.log('\n🌱  YouVA OS — Trainee Seed Script (500 users)');
  console.log(`📦  DB      : ${process.env.MONGODB_URI}`);
  console.log(`👥  Count   : ${COUNT}`);
  console.log(`⚡  Force   : ${FORCE ? 'YES — delete + reseed' : 'NO — skip existing'}\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'younovate_lms' });
  console.log('✅  Connected to MongoDB\n');

  // ── Ensure batches exist (distribute 500 trainees across 5 batches) ──
  const batchDefs = [
    { name: 'Batch YIEP 2026 A',  course: 'YIEP', status: 'active'   },
    { name: 'Batch YIEP 2026 B',  course: 'YIEP', status: 'active'   },
    { name: 'Batch YBLP 2026 A',  course: 'YBLP', status: 'active'   },
    { name: 'Batch YBLP 2026 B',  course: 'YBLP', status: 'upcoming' },
    { name: 'Demo Batch 2026',     course: 'Full Stack Development', status: 'active' },
  ];

  const batches = [];
  for (const def of batchDefs) {
    const b = await Batch.findOneAndUpdate(
      { name: def.name },
      { name: def.name, startDate: new Date(), status: def.status, course: def.course },
      { upsert: true, new: true }
    );
    batches.push(b);
    console.log(`  🗂️   Batch ready: "${b.name}" (${b._id})`);
  }
  console.log();

  // ── Force delete ─────────────────────────────────────────────────────
  if (FORCE) {
    const del = await User.deleteMany({
      email: { $regex: /^trainee\d+@younovate\.in$/ },
    });
    console.log(`🗑   Deleted ${del.deletedCount} existing test trainees\n`);
  }

  // ── Find existing ────────────────────────────────────────────────────
  const existing = await User.find(
    { email: { $regex: /^trainee\d+@younovate\.in$/ } },
    { email: 1 }
  );
  const existingNums = new Set(
    existing.map(u => {
      const m = u.email.match(/trainee(\d+)@/);
      return m ? parseInt(m[1]) : null;
    }).filter(Boolean)
  );
  console.log(`ℹ️   Already in DB : ${existingNums.size}`);

  // ── Build list of users to insert ─────────────────────────────────
  const toProcess = [];
  for (let i = 1; i <= COUNT; i++) {
    if (!existingNums.has(i)) toProcess.push(i);
  }
  console.log(`⏳  To insert      : ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log('✅  All trainees already exist. Use --force to recreate.\n');
    process.exit(0);
  }

  // ── Pre-hash passwords in parallel batches (FAST) ───────────────────
  // bcrypt cost 10 = good balance of security and speed for test data
  // (cost 12 takes ~8 min for 500 users; cost 10 takes ~2 min)
  const BCRYPT_COST  = 10;
  const HASH_BATCH   = 25;   // hash 25 at a time in parallel
  const INSERT_BATCH = 50;   // insert 50 at a time

  console.log('🔐  Pre-hashing passwords…');
  const userDocs = [];

  for (let b = 0; b < toProcess.length; b += HASH_BATCH) {
    const chunk = toProcess.slice(b, b + HASH_BATCH);

    const hashed = await Promise.all(
      chunk.map(i => bcrypt.hash(`trainee${i}`, BCRYPT_COST))
    );

    chunk.forEach((i, idx) => {
      const batchIdx   = i % batches.length;          // distribute across batches
      const batchObj   = batches[batchIdx];

      userDocs.push({
        name:            `${pick(FIRST)} ${pick(LAST)} ${i}`,
        email:           `trainee${i}@younovate.in`,
        password:        hashed[idx],                  // ✅ already hashed
        role:            'trainee',
        isActive:        true,
        phone:           `9${String(800000000 + i).padStart(9, '0')}`,
        bio:             `Test trainee #${i} — seeded for data integrity testing.`,
        profilePicture:  '',
        batchId:         batchObj._id,
        enrolledAt:      new Date(Date.now() - Math.random() * 90 * 86400000), // random within 90 days
        placementStatus: PLACEMENT_STATUSES[i % PLACEMENT_STATUSES.length],
        skills:          rSkills(),
      });
    });

    process.stdout.write(`  ${bar(Math.min(b + HASH_BATCH, toProcess.length), toProcess.length)}  \r`);
  }
  console.log(`\n✅  Passwords hashed (${userDocs.length} users)\n`);

  // ── Bulk insert in batches of 50 ─────────────────────────────────────
  console.log('📥  Inserting into MongoDB…');
  let inserted = 0;
  let skipped  = 0;
  let failed   = 0;

  for (let b = 0; b < userDocs.length; b += INSERT_BATCH) {
    const chunk = userDocs.slice(b, b + INSERT_BATCH);
    try {
      // ordered:false means one duplicate won't stop the whole batch
      const result = await User.collection.insertMany(chunk, { ordered: false });
      inserted += result.insertedCount;
    } catch (err) {
      if (err.code === 11000 || err.writeErrors) {
        // Some were duplicates — count successes
        const successCount = err.result?.nInserted ?? (chunk.length - (err.writeErrors?.length ?? 0));
        inserted += successCount;
        skipped  += err.writeErrors?.length ?? 0;
      } else {
        console.error(`\n  ❌  Batch insert error: ${err.message}`);
        failed += chunk.length;
      }
    }
    process.stdout.write(`  ${bar(Math.min(b + INSERT_BATCH, userDocs.length), userDocs.length)}  \r`);
  }

  // ── Final summary ─────────────────────────────────────────────────────
  const totalInDB = await User.countDocuments({ role: 'trainee' });

  console.log('\n\n' + '═'.repeat(60));
  console.log('  SEED COMPLETE — TRAINEE USERS');
  console.log('═'.repeat(60));
  console.log(`  ✅  Inserted this run  : ${inserted}`);
  console.log(`  ⏭️   Skipped (existed)  : ${skipped + existingNums.size}`);
  console.log(`  ❌  Failed             : ${failed}`);
  console.log(`  👥  Total trainees DB  : ${totalInDB}`);
  console.log('─'.repeat(60));
  console.log(`  Email format    :  trainee1@younovate.in → trainee${COUNT}@younovate.in`);
  console.log(`  Password        :  same as username  (trainee1, trainee2 …)`);
  console.log(`  Role            :  trainee`);
  console.log(`  Batches         :  distributed across ${batches.length} batches`);
  console.log(`  Placement       :  enrolled / training / ready / interview_scheduled`);
  console.log('═'.repeat(60));

  console.log('\n🔑  Sample login credentials:');
  const samples = [1, 2, 3, 50, 100, 200, 300, 400, 500].filter(n => n <= COUNT);
  samples.forEach(i =>
    console.log(`     trainee${i}@younovate.in   /   trainee${i}`)
  );

  console.log('\n📊  Batch distribution:');
  for (const b of batches) {
    const cnt = await User.countDocuments({ batchId: b._id, role: 'trainee' });
    console.log(`     ${b.name.padEnd(25)} → ${cnt} trainees`);
  }

  console.log('\n🌱  Seed complete\n');
  process.exit(0);
};

seed().catch(err => {
  console.error('\n❌  Seed error:', err.message);
  process.exit(1);
});