// src/scripts/seedYiep.js
//
// Push the full yiepCurriculum.js content into MongoDB.
//
// Default (SAFE) mode — enrich in place:
//   keeps the existing course _id, all subject _ids, statuses and your edits
//   (e.g. the "ooo" title, "In Progress"); only fills the missing content
//   fields (theory / practical / assignment + order / days / weeks).
//
//   node src/scripts/seedYiep.js                 # enrich existing YIEP
//   node src/scripts/seedYiep.js --dry           # preview, no writes
//   node src/scripts/seedYiep.js --fresh         # WIPE & re-create (new _ids!)
//   node src/scripts/seedYiep.js --uri="mongodb+srv://…"
//
// NOTE: requires the updated Course.js (with theoryContent / practicalActivity /
// assignmentTask in SubjectSchema) — otherwise strict mode drops the content.

require('dotenv').config();
const mongoose = require('mongoose');

const Course = require('../models/Course');
const { YIEP_COURSE, YIEP_TRIMESTERS } = require('../data/yiepCurriculum');

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const flag = (k) => process.argv.includes(`--${k}`);
const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const mask = (u) => (u || '').replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

const MONGO_URI =
  arg('uri') ||
  process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI ||
  process.env.MONGO_URL || process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/lms';

(async () => {
  const DRY = flag('dry');
  const FRESH = flag('fresh');
  const code = (arg('code', YIEP_COURSE.code) || 'YIEP').toUpperCase();

  await mongoose.connect(MONGO_URI);
  console.log(`· connected → ${mask(MONGO_URI)}  (db: ${mongoose.connection.name})`);

  // ── FRESH: wipe and re-create from the seed (regenerates all _ids) ──────────
  if (FRESH) {
    if (DRY) {
      console.log(`· --fresh --dry: would delete course "${code}" and re-create it with`,
        YIEP_TRIMESTERS.reduce((a, t) => a + t.months.reduce((b, m) => b + m.subjects.length, 0), 0),
        'subjects.');
    } else {
      await Course.deleteOne({ code });
      const doc = await Course.create({ ...YIEP_COURSE, code, trimesters: YIEP_TRIMESTERS });
      console.log(`✓ re-created ${doc.name} (${doc._id}) — ${doc.stats.subjects} subjects, ${doc.stats.totalHours}h`);
    }
    await mongoose.disconnect();
    return process.exit(0);
  }

  // ── DEFAULT: enrich existing course in place ────────────────────────────────
  const course = await Course.findOne({ code: new RegExp(`^${code}$`, 'i') }); // full doc (not lean)
  if (!course) {
    const all = await Course.find({}, 'code').lean();
    console.error(`✗ course "${code}" not found. DB "${mongoose.connection.name}" has: ${JSON.stringify(all.map((c) => c.code))}`);
    console.error('· run with --fresh to create it from the seed, or check your connection (.env MONGO_URI).');
    await mongoose.disconnect();
    return process.exit(1);
  }

  const seedByNum = new Map(YIEP_TRIMESTERS.map((t) => [t.trimesterNumber, t]));
  let filled = 0;
  const missing = [];

  course.trimesters.forEach((t, ti) => {
    const sT = seedByNum.get(t.trimesterNumber) || YIEP_TRIMESTERS[ti];
    if (sT && t.order == null) t.order = sT.order;

    (t.months || []).forEach((m, mi) => {
      const sM = (sT?.months || []).find((x) => x.monthNumber === m.monthNumber) || sT?.months?.[mi];
      if (sM) {
        if (m.days == null) m.days = sM.days;
        if (m.weeks == null) m.weeks = sM.weeks;
        if (m.order == null) m.order = sM.order;
      }

      (m.subjects || []).forEach((s, si) => {
        const sS = (sM?.subjects || []).find((x) => norm(x.name) === norm(s.name)) || sM?.subjects?.[si];
        if (!sS) { missing.push(`${t.trimesterNumber}|${m.monthNumber}|${s.name}`); return; }
        // fill content (do NOT touch name / category / status / _id / hours)
        s.theoryContent     = sS.theoryContent || '';
        s.practicalActivity = sS.practicalActivity || '';
        s.assignmentTask    = sS.assignmentTask || '';
        if (s.order == null) s.order = sS.order;
        filled += 1;
      });
    });
  });

  console.log(`· enriched ${filled} subjects (preserving _ids, statuses, edits)`);
  if (missing.length) console.warn(`! ${missing.length} subjects had no seed match:`, missing);

  if (DRY) {
    const sample = course.trimesters?.[0]?.months?.[0]?.subjects?.[0];
    console.log('· --dry: no writes. Sample subject after enrich:');
    console.dir({ name: sample?.name, status: sample?.status, theoryContent: sample?.theoryContent?.slice(0, 80) + '…' }, { depth: null });
  } else {
    await course.save();
    console.log(`✓ saved ${course.name} (${course._id})`);
  }

  await mongoose.disconnect();
  console.log('· done');
  process.exit(0);
})().catch(async (err) => {
  console.error('✗', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});