// src/scripts/backfillSubjectContent.js
//
// Connect seed curriculum text to each subject's _id by writing SubjectContent docs.
// Matching: 1) trimesterNumber|monthNumber|name   2) array position (fallback).
//
//   npm run seedsubjects                         (uses your package.json script)
//   node src/scripts/backfillSubjectContent.js --code=YIEP --dry
//   node src/scripts/backfillSubjectContent.js --uri="mongodb+srv://user:pass@cluster/db"
//   node src/scripts/backfillSubjectContent.js --print-payload

require('dotenv').config();
const mongoose = require('mongoose');

const Course = require('../models/Course');
const SubjectContent = require('../models/SubjectContent');
const { YIEP_TRIMESTERS } = require('../data/yiepCurriculum');

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const flag = (k) => process.argv.includes(`--${k}`);
const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const mask = (u) => (u || '').replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

// Use the SAME connection your app uses — try the common env var names, then a CLI flag.
const MONGO_URI =
  arg('uri') ||
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DB_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/lms';

const buildSeedIndex = (trimesters) => {
  const byName = new Map();
  const byPos = new Map();
  (trimesters || []).forEach((t, tIdx) => {
    (t.months || []).forEach((m, mIdx) => {
      (m.subjects || []).forEach((s, sIdx) => {
        const ctx = {
          theoryContent: s.theoryContent || '',
          practicalActivity: s.practicalActivity || '',
          assignmentTask: s.assignmentTask || '',
          status: s.status || 'Not Started',
        };
        byName.set(`${t.trimesterNumber}|${m.monthNumber}|${norm(s.name)}`, ctx);
        byPos.set(`${tIdx}|${mIdx}|${sIdx}`, ctx);
      });
    });
  });
  return { byName, byPos };
};

(async () => {
  const DRY = flag('dry');
  const PRINT = flag('print-payload');

  await mongoose.connect(MONGO_URI);
  if (!PRINT) {
    console.log(`· connected → ${mask(MONGO_URI)}`);
    console.log(`· database: ${mongoose.connection.name}`);
  }

  const id = arg('id');
  const code = arg('code', 'YIEP');
  const course = id
    ? await Course.findById(id).lean()
    : await Course.findOne({ code: new RegExp(`^${code}$`, 'i') }).lean();

  if (!course) {
    const all = await Course.find({}, 'code name').lean();
    console.error(`✗ course not found (${id ? `id ${id}` : `code ${code}`})`);
    console.error(`· database "${mongoose.connection.name}" holds ${all.length} course(s): ${JSON.stringify(all.map((c) => c.code))}`);
    if (!all.length) {
      console.error('· this DB is empty → the script is pointing at the WRONG database.');
      console.error('· fix: put your real connection string in backend/.env as MONGO_URI=…');
      console.error('       (or run with  --uri="<your connection string>")');
    } else {
      console.error('· the YIEP course is not in this DB. Use one of the codes above, or point at the right DB.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
  if (!PRINT) console.log(`· course: ${course.name} (${course._id})`);

  const { byName, byPos } = buildSeedIndex(YIEP_TRIMESTERS);

  const ops = [];
  const payloadItems = [];
  const unmatched = [];
  let viaName = 0;
  let viaPos = 0;

  (course.trimesters || []).forEach((t, tIdx) => {
    (t.months || []).forEach((m, mIdx) => {
      const tNum = t.trimesterNumber ?? tIdx + 1;
      const mNum = m.monthNumber ?? mIdx + 1;
      (m.subjects || []).forEach((s, sIdx) => {
        let content = byName.get(`${tNum}|${mNum}|${norm(s.name)}`);
        let via = 'name';
        if (!content) { content = byPos.get(`${tIdx}|${mIdx}|${sIdx}`); via = 'position'; }
        if (!content) { unmatched.push(`${tNum}|${mNum}|${s.name}`); return; }
        via === 'name' ? viaName++ : viaPos++;

        payloadItems.push({
          subjectId: String(s._id),
          theoryContent: content.theoryContent,
          practicalActivity: content.practicalActivity,
          assignmentTask: content.assignmentTask,
          status: s.status || content.status,
        });
        ops.push({
          updateOne: {
            filter: { subjectId: s._id },
            update: {
              $set: {
                course: course._id,
                subjectId: s._id,
                trimesterNumber: tNum,
                monthNumber: mNum,
                subjectName: s.name,
                category: s.category || '',
                theoryContent: content.theoryContent,
                practicalActivity: content.practicalActivity,
                assignmentTask: content.assignmentTask,
                status: s.status || content.status,
              },
            },
            upsert: true,
          },
        });
      });
    });
  });

  if (PRINT) {
    process.stdout.write(JSON.stringify({ items: payloadItems }, null, 2) + '\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`· matched ${ops.length} subjects  (by name: ${viaName}, by position: ${viaPos})`);
  if (unmatched.length) console.warn(`! ${unmatched.length} unmatched:`, unmatched);

  if (!ops.length) {
    console.log('· nothing to write — the course has no trimesters/months/subjects to match.');
  } else if (DRY) {
    console.log('· --dry: no writes performed. Sample op:');
    console.dir(ops[0].updateOne.update.$set, { depth: null });
  } else {
    const r = await SubjectContent.bulkWrite(ops, { ordered: false });
    console.log(`✓ upserted ${r.upsertedCount}, modified ${r.modifiedCount}, matched ${r.matchedCount}`);
  }

  await mongoose.disconnect();
  console.log('· done');
  process.exit(0);
})().catch(async (err) => {
  console.error('✗', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});