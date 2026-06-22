// src/utils/attendanceUtils.js
//
// Single source of truth for turning (session timing + join/leave times) into an
// attendance status. Used by the trainee join + leave endpoints so the rule is
// identical everywhere.
//
// Rules (tweak the constants if your policy differs):
//   • Joined more than LATE_GRACE_MIN minutes after the scheduled start  -> "late"
//   • Attended >= PRESENT_FRACTION of the session window                 -> "present" (or "late")
//   • Attended >= PARTIAL_FRACTION but < PRESENT_FRACTION                -> "partial"
//   • Attended < PARTIAL_FRACTION                                        -> "absent"
//
// "Attended" = the overlap between [joinedAt, leftAt] and the scheduled
// [start, end] window, so joining early or leaving late never inflates it.
'use strict';

const LATE_GRACE_MIN  = 10;    // minutes after start before a join counts as "late"
const PRESENT_FRACTION = 0.75; // >= 75% of the session  -> present
const PARTIAL_FRACTION = 0.25; // >= 25% of the session  -> partial

function sessionWindow(session) {
  const start    = new Date(session.scheduledAt).getTime();
  const totalSec = Math.max(1, (session.durationMinutes || 60) * 60);
  const end      = start + totalSec * 1000;
  return { start, end, totalSec };
}

/**
 * @param {{scheduledAt: Date, durationMinutes?: number}} session
 * @param {Date|string|null} joinedAt
 * @param {Date|string|null} leftAt    pass null while the trainee is still in the room
 * @returns {{ status: 'present'|'late'|'partial'|'absent', attendedSeconds: number }}
 */
function classifyAttendance({ session, joinedAt, leftAt }) {
  const { start, end, totalSec } = sessionWindow(session);
  const jt = joinedAt ? new Date(joinedAt).getTime() : start;
  const joinedLate = jt > start + LATE_GRACE_MIN * 60 * 1000;

  // Still in the room: provisional status, no duration yet.
  if (!leftAt) {
    return { status: joinedLate ? 'late' : 'present', attendedSeconds: 0 };
  }

  const lv = new Date(leftAt).getTime();
  const overlapStart = Math.max(jt, start);
  const overlapEnd   = Math.min(lv, end);
  const attendedSeconds = Math.max(0, Math.round((overlapEnd - overlapStart) / 1000));
  const fraction = attendedSeconds / totalSec;

  let status;
  if (fraction >= PRESENT_FRACTION)      status = joinedLate ? 'late' : 'present';
  else if (fraction >= PARTIAL_FRACTION) status = 'partial';
  else                                   status = 'absent';

  return { status, attendedSeconds };
}

module.exports = { classifyAttendance, LATE_GRACE_MIN, PRESENT_FRACTION, PARTIAL_FRACTION };