import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  fetchTrainerDashboard,
  fetchTrainerSessions,
  fetchTrainerAssignments,
  fetchTrainerStudents,
  gradeSubmission,
  fetchSessionAttendance,
  setActiveTab,
  openGradingModal,
  closeGradingModal,
  selectTrainerDashboard,
  selectTrainerStatus,
  selectTrainerError,
  selectTrainerSessions,
  selectSessionsStatus,
  selectTrainerAssignments,
  selectAssignmentsStatus,
  selectTrainerStudents,
  selectStudentsStatus,
  selectGradingStatus,
  selectGradingError,
  selectAttendance,
  selectAttendanceStatus,
  selectActiveTab,
  selectGradingModal,
} from '../../features/Trainer/trainerSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d     = new Date(iso);
  const today = new Date();
  const time  = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === today.toDateString()
    ? time
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const scoreCol = (n) => n >= 75 ? '#16a34a' : n >= 55 ? '#d97706' : '#dc2626';

// A session is "past" (read-only) if its start time is before now, or it's completed.
const isPastSession = (s, isLive = false) => {
  if (isLive || s.status === 'live' || s.status === 'ongoing') return false;
  if (s.status === 'completed' || s.status === 'cancelled' || s.status === 'ended') return true;
  const t = s.scheduledAt || s.date || s.startTime;
  if (!t) return false;
  const ms = new Date(t).getTime();
  return !isNaN(ms) && ms < Date.now();
};

const clampPct = (n) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

// Build the batch list from BOTH the trainer's assigned batches (so every batch
// shows, even with no sessions yet) and any sessions (for live counts).
const buildBatches = (explicitBatches = [], sessions = [], batchStats = {}) => {
  const map = {};
  const keyOf = (b) => b._id || b.id || b.batchId || b.code || b.name;

  // 1) Seed from explicitly-assigned batches.
  explicitBatches.forEach((b) => {
    const id   = keyOf(b) || 'unknown';
    const name = b.name || b.batchName || b.code || 'Batch';
    map[id] = {
      sessions: [],
      ...(batchStats[id] || {}),
      ...b,
      id,
      name,
      phase: b.phase || b.currentModule || b.module || (batchStats[id] || {}).phase,
    };
  });

  // 2) Fold in sessions (adds counts + any batch only seen via a session).
  sessions.forEach((s) => {
    const id   = s.batchId?._id || s.batchId || 'unknown';
    const name = s.batchId?.name || map[id]?.name || 'Unknown Batch';
    if (!map[id]) map[id] = { id, name, sessions: [], ...(batchStats[id] || {}) };
    map[id].sessions.push(s);
  });

  return Object.values(map);
};

const COLORS = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
const LIGHTS = ['#ede9fe', '#ecfeff', '#dcfce7', '#fef9c3', '#fee2e2'];

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; }
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .td-card:hover  { box-shadow: 0 4px 18px rgba(0,0,0,.10) !important; }
  .td-tab:hover   { color: #6366f1 !important; background: #f5f3ff !important; }
  .td-sub:hover   { background: #fefce8 !important; }
  .td-btn:hover   { opacity: .88; }
  .td-row:hover   { background: #f9fafb !important; }
  input:focus, textarea:focus {
    outline: none !important;
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.15) !important;
  }

  /* Tabs never wrap; scroll sideways if cramped */
  .td-tabs { -ms-overflow-style: none; scrollbar-width: none; }
  .td-tabs::-webkit-scrollbar { display: none; }
  .td-tabs button { flex: 0 0 auto; white-space: nowrap; }

  @media (max-width: 1024px) { .td-g3 { grid-template-columns: 1fr 1fr !important; } }
  @media (max-width:  680px) { .td-g3 { grid-template-columns: 1fr       !important; } }

  /* Mobile polish */
  @media (max-width: 768px) {
    .td-wrap  { padding: 20px 14px !important; }
    .td-h1    { font-size: 1.35rem !important; }
    .td-tabs  { overflow-x: auto; }
    .td-modal { padding: 20px 18px !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const Pill = ({ children, bg = '#dcfce7', color = '#15803d', dot = false }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: bg, color, fontSize: '0.71rem', fontWeight: 600,
    padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap', lineHeight: 1.7,
  }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
    {children}
  </span>
);

const Spinner = ({ pad = 40 }) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: pad }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '3px solid #e5e7eb', borderTopColor: '#6366f1',
      animation: 'spin .7s linear infinite',
    }} />
  </div>
);

const Empty = ({ icon, msg }) => (
  <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af' }}>
    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{msg}</div>
  </div>
);

const H2 = ({ children }) => (
  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 16, letterSpacing: '-0.2px' }}>
    {children}
  </h2>
);

const GrpLbl = ({ children }) => (
  <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 8, marginTop: 20 }}>
    {children}
  </div>
);

const FieldLbl = ({ children }) => (
  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CARD
// ═══════════════════════════════════════════════════════════════════════════════

const BatchCard = ({ batch, idx }) => {
  const c = COLORS[idx % COLORS.length];
  const l = LIGHTS[idx % LIGHTS.length];
  const pct = batch.progress != null || batch.completion != null
    ? clampPct(batch.progress ?? batch.completion)
    : Math.min(100, Math.round((batch.sessions.length / 12) * 100));

  const meta = [];
  if (batch.totalStudents != null) meta.push(`${batch.totalStudents} trainees`);
  else if (batch.studentCount != null) meta.push(`${batch.studentCount} trainees`);
  if (batch.avgScore != null) meta.push(`Avg ${batch.avgScore}`);
  meta.push(batch.activeCount != null ? `${batch.activeCount} active` : 'Mentor active');

  return (
    <div className="td-card" style={{
      border: '1px solid #e5e7eb', borderLeft: `4px solid ${c}`,
      borderRadius: 10, padding: '14px 16px', marginBottom: 10,
      background: '#fff', cursor: 'pointer', transition: 'box-shadow .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: '0.93rem', color: '#111827' }}>{batch.name}</span>
        {batch.phase && <Pill bg={l} color={c}>{batch.phase}</Pill>}
      </div>
      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 10 }}>
        {meta.join(' · ')}
      </div>
      <div style={{ height: 5, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 4, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CARD  (past sessions render read-only)
// ═══════════════════════════════════════════════════════════════════════════════

const SessionCard = ({ session, isLive }) => {
  const dispatch    = useDispatch();
  const [open, setOpen] = useState(false);
  const allAtt     = useSelector(selectAttendance);
  const allAttSt   = useSelector(selectAttendanceStatus);
  const att        = allAtt[session._id];
  const attLoading = allAttSt[session._id] === 'loading';

  const records  = att?.records || att?.data?.records || [];
  const past     = isPastSession(session, isLive);            // ← read-only when in the past
  const completed = session.status === 'completed';

  const toggleAttendance = () => {
    if (!open && !att) dispatch(fetchSessionAttendance(session._id));
    setOpen(v => !v);
  };

  const meta = [
    fmtTime(session.scheduledAt),
    session.batchId?.name,
    session.sessionType || session.type || session.topics?.[0],
  ].filter(Boolean).join(' · ');

  return (
    <div className="td-card" style={{
      border: `1px solid ${isLive ? '#fca5a5' : '#e5e7eb'}`,
      background: isLive ? '#fef2f2' : past ? '#f9fafb' : '#fff',
      borderRadius: 10, padding: '14px 16px', marginBottom: 10,
      transition: 'box-shadow .15s', opacity: past ? 0.92 : 1,
    }}>
      {/* Title + read-only tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.93rem', color: '#111827' }}>
          {session.title || 'Untitled Session'}
        </span>
        {past && <Pill bg="#f1f5f9" color="#64748b">🔒 Read-only</Pill>}
      </div>

      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 10 }}>{meta}</div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Primary action */}
        {isLive ? (
          <button style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
            Join Live
          </button>
        ) : past ? (
          /* Past → read-only, no start/join */
          <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600 }}>
            {completed ? 'Completed' : 'Ended'}
          </span>
        ) : session.status === 'scheduled' ? (
          <button style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            Start Session
          </button>
        ) : (
          <button style={{ background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 500, cursor: 'default' }}>
            Upcoming
          </button>
        )}

        {/* Attendance toggle (view-only for past sessions, still allowed) */}
        <button
          onClick={toggleAttendance}
          style={{ background: '#fff', color: '#6366f1', border: '1px solid #e0e7ff', padding: '6px 12px', borderRadius: 7, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {open ? 'Hide' : (past ? 'View Attendance' : 'Attendance')}
        </button>
      </div>

      {/* Attendance panel */}
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          {attLoading ? (
            <Spinner pad={16} />
          ) : records.length === 0 ? (
            <p style={{ fontSize: '0.74rem', color: '#9ca3af' }}>No attendance records for this session.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {records.map((r, i) => {
                const present = r.status === 'present';
                return (
                  <span key={i} style={{
                    fontSize: '0.71rem', fontWeight: 600,
                    padding: '3px 9px', borderRadius: 6,
                    background: present ? '#dcfce7' : '#fee2e2',
                    color:      present ? '#15803d' : '#b91c1c',
                  }}>
                    {r.trainee?.name || `Student ${i + 1}`} {present ? '✓' : '✗'}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRADING MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const GradingModal = () => {
  const dispatch    = useDispatch();
  const assignment  = useSelector(selectGradingModal);
  const gradStatus  = useSelector(selectGradingStatus);
  const gradError   = useSelector(selectGradingError);

  const [selSub,        setSelSub]        = useState(null);
  const [grade,         setGrade]         = useState('');
  const [feedback,      setFeedback]      = useState('');
  const [allowResubmit, setAllowResubmit] = useState(false);

  if (!assignment) return null;

  const subs      = assignment.submissions || [];
  const canSubmit = selSub && grade !== '' && gradStatus !== 'loading';

  const handleSubmit = () => {
    if (!canSubmit) return;
    dispatch(gradeSubmission({
      assignmentId: assignment._id,
      submissionId: selSub._id,
      grade:        Number(grade),
      feedback,
      allowResubmit,
    }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="td-modal" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, padding: '26px 26px 22px', boxShadow: '0 20px 60px rgba(0,0,0,.18)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Grade Submission</span>
          <button onClick={() => dispatch(closeGradingModal())} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>{assignment.title}</div>
          <div style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: 3 }}>
            Due: {fmtDate(assignment.dueDate)} · {assignment.batchId?.name || assignment.batchId || '—'} · {subs.length} submission(s)
          </div>
        </div>

        {subs.length === 0 ? (
          <Empty icon="📭" msg="No submissions yet" />
        ) : (
          <>
            <FieldLbl>Select Submission</FieldLbl>
            <div style={{ marginBottom: 14 }}>
              {subs.map((sub) => (
                <div
                  key={sub._id}
                  onClick={() => setSelSub(sub)}
                  className="td-row"
                  style={{
                    border: `1.5px solid ${selSub?._id === sub._id ? '#6366f1' : '#e5e7eb'}`,
                    borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                    cursor: 'pointer',
                    background: selSub?._id === sub._id ? '#f5f3ff' : '#fff',
                    transition: 'all .12s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#111827' }}>
                    {sub.studentName || sub.student?.name || sub.trainee?.name || 'Student'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>
                    Submitted: {fmtDate(sub.submittedAt)}
                    {sub.grade != null && (
                      <span style={{ marginLeft: 8, color: scoreCol(sub.grade), fontWeight: 600 }}>
                        Graded: {sub.grade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <FieldLbl>Grade (0 – 100)</FieldLbl>
            <input
              type="number" min="0" max="100"
              value={grade} onChange={e => setGrade(e.target.value)}
              placeholder="e.g. 87"
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: '0.92rem', fontWeight: 700, color: '#111827', marginBottom: 14, fontFamily: 'inherit' }}
            />

            <FieldLbl>
              Feedback{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af' }}>(optional)</span>
            </FieldLbl>
            <textarea
              value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="e.g. Good work!"
              rows={3}
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', color: '#374151', resize: 'vertical', marginBottom: 12, fontFamily: 'inherit' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#374151', marginBottom: 18, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox" checked={allowResubmit}
                onChange={e => setAllowResubmit(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: '#6366f1', cursor: 'pointer' }}
              />
              Allow resubmission
            </label>

            {gradError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px', fontSize: '0.76rem', color: '#b91c1c', marginBottom: 14 }}>
                ⚠️ {gradError}
              </div>
            )}

            <button
              onClick={handleSubmit} disabled={!canSubmit}
              className={canSubmit ? 'td-btn' : ''}
              style={{
                width: '100%', padding: 12, borderRadius: 9, border: 'none',
                background: canSubmit ? '#1e293b' : '#e5e7eb',
                color:      canSubmit ? '#fff'    : '#9ca3af',
                fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit',
                cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'opacity .15s',
              }}
            >
              {gradStatus === 'loading' ? 'Saving…' : 'Submit Grade'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const Leaderboard = ({ students }) => {
  const STATIC = [
    { rank: 1, name: 'Kavya R.',  score: 88, attendance: 92 },
    { rank: 2, name: 'Neha S.',   score: 84, attendance: 88 },
    { rank: 3, name: 'Ritu M.',   score: 79, attendance: 85 },
    { rank: 4, name: 'Ajay P.',   score: 65, attendance: 78 },
    { rank: 5, name: 'Dinesh K.', score: 52, attendance: 74 },
  ];

  const rows = students.length > 0
    ? [...students]
        .filter(s => (s.averageScore ?? s.score) != null)
        .sort((a, b) => (b.averageScore ?? b.score ?? 0) - (a.averageScore ?? a.score ?? 0))
        .slice(0, 5)
        .map((s, i) => ({ rank: i + 1, name: s.name, score: s.averageScore ?? s.score ?? 0, attendance: s.attendance ?? null }))
    : STATIC;

  const rankColor = { 1: '#ca8a04', 2: '#9ca3af', 3: '#b45309' };
  const atRisk    = rows.filter(r => r.score < 60);

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            {['#', 'TRAINEE', 'SCORE'].map(h => (
              <th key={h} style={{ fontSize: '0.67rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '6px 10px', textAlign: 'left' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.rank} style={{ borderBottom: '1px solid #f9fafb' }}>
              <td style={{ padding: '11px 10px', fontSize: '0.82rem', fontWeight: 700, color: rankColor[r.rank] || '#9ca3af', width: 28 }}>
                {r.rank}
              </td>
              <td style={{ padding: '11px 10px', fontSize: '0.85rem', fontWeight: 500, color: '#111827' }}>
                {r.name}
              </td>
              <td style={{ padding: '11px 10px', fontSize: '0.9rem', fontWeight: 700, color: scoreCol(r.score) }}>
                {r.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {atRisk.map(r => (
        <div key={r.rank} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
          <span style={{ color: '#d97706', fontSize: '0.88rem', flexShrink: 0, lineHeight: 1.5 }}>⚠</span>
          <div style={{ fontSize: '0.77rem', color: '#92400e', lineHeight: 1.6 }}>
            <strong style={{ color: '#78350f' }}>{r.name}</strong>
            {' '}— score {r.score}
            {r.attendance != null ? `, attendance ${r.attendance}%` : ''}
            . At-risk flag active.
          </div>
        </div>
      ))}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

const OverviewTab = ({ dashboard, students }) => {
  const dispatch        = useDispatch();
  const trainerSessions = useSelector(selectTrainerSessions);

  // Pull the FULL sessions list so batches without a session today still appear.
  useEffect(() => { dispatch(fetchTrainerSessions()); }, [dispatch]);

  const upcoming      = dashboard?.upcomingSessions || [];
  const live          = dashboard?.liveSessions     || [];
  const allSessions   = [...live, ...upcoming];
  const pendingGrades = dashboard?.pendingGrades    ?? 0;
  const batchStats    = dashboard?.batchStats       || {};

  // Every batch assigned to the trainer (several backend shapes supported).
  const explicitBatches = [
    dashboard?.batches,
    dashboard?.assignedBatches,
    dashboard?.myBatches,
    dashboard?.trainer?.batches,
  ].find(Array.isArray) || [];

  // Prefer the full sessions list for counts; fall back to today's.
  const sessionsForBatches = trainerSessions.length ? trainerSessions : allSessions;
  const batches    = buildBatches(explicitBatches, sessionsForBatches, batchStats);
  const firstBatch = batches[0]?.name || dashboard?.batchName || 'Batch';

  return (
    <div className="td-g3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, alignItems: 'start' }}>

      {/* ── COL 1: My Batches (ALL assigned) ── */}
      <div>
        <H2>My Batches {batches.length > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>({batches.length})</span>}</H2>
        {batches.length === 0
          ? <Empty icon="📦" msg="No batches assigned yet" />
          : batches.map((b, i) => <BatchCard key={b.id} batch={b} idx={i} />)
        }
      </div>

      {/* ── COL 2: Today's Sessions + Grading Queue ── */}
      <div>
        <H2>Today's Sessions</H2>
        {allSessions.length === 0
          ? <Empty icon="📅" msg="No sessions today" />
          : allSessions.map(s => (
            <SessionCard key={s._id} session={s} isLive={s.status === 'live'} />
          ))
        }

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <H2>Grading Queue</H2>
            {pendingGrades > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.69rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, lineHeight: 1.7, marginTop: -14 }}>
                {pendingGrades}
              </span>
            )}
          </div>
          <div
            className="td-sub"
            onClick={() => pendingGrades > 0 && dispatch(setActiveTab('assignments'))}
            style={{ border: '1.5px dashed #d1d5db', borderRadius: 10, padding: '14px 16px', cursor: pendingGrades > 0 ? 'pointer' : 'default', background: '#fff', transition: 'background .15s' }}
          >
            <p style={{ fontSize: '0.84rem', color: '#6b7280' }}>
              {pendingGrades === 0
                ? 'No pending submissions · All caught up!'
                : `${pendingGrades} ungraded submission${pendingGrades !== 1 ? 's' : ''} pending · Click to grade`}
            </p>
          </div>
        </div>
      </div>

      {/* ── COL 3: Leaderboard ── */}
      <div>
        <H2>Leaderboard — {firstBatch}</H2>
        <Leaderboard students={students} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SESSIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════

const SessionsTab = () => {
  const dispatch = useDispatch();
  const sessions = useSelector(selectTrainerSessions);
  const status   = useSelector(selectSessionsStatus);

  useEffect(() => { dispatch(fetchTrainerSessions()); }, [dispatch]);

  if (status === 'loading') return <Spinner />;
  if (!sessions.length)     return <Empty icon="📅" msg="No sessions found" />;

  const live = sessions.filter(s => s.status === 'live' || s.status === 'ongoing');
  // Upcoming = scheduled AND not in the past.
  const upcoming = sessions.filter(s => (s.status === 'scheduled' || s.status === 'upcoming') && !isPastSession(s));
  // Past = completed/cancelled OR scheduled-but-overdue (rendered read-only).
  const pastList = sessions.filter(s => !live.includes(s) && !upcoming.includes(s));

  return (
    <div>
      {live.length     > 0 && <><GrpLbl>🔴 Live Now</GrpLbl> {live.map(s     => <SessionCard key={s._id} session={s} isLive />)}</>}
      {upcoming.length > 0 && <><GrpLbl>Upcoming</GrpLbl>     {upcoming.map(s => <SessionCard key={s._id} session={s} isLive={false} />)}</>}
      {pastList.length > 0 && <><GrpLbl>Past · Read-only</GrpLbl> {pastList.map(s => <SessionCard key={s._id} session={s} isLive={false} />)}</>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

const AssignmentsTab = () => {
  const dispatch    = useDispatch();
  const assignments = useSelector(selectTrainerAssignments);
  const status      = useSelector(selectAssignmentsStatus);

  useEffect(() => { dispatch(fetchTrainerAssignments()); }, [dispatch]);

  if (status === 'loading') return <Spinner />;
  if (!assignments.length)  return <Empty icon="📋" msg="No assignments found" />;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {assignments.map((a) => {
        const pending = (a.submissions || []).filter(s => s.grade == null).length;
        return (
          <div key={a._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#111827', marginBottom: 3 }}>{a.title}</div>
                <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
                  Due: {fmtDate(a.dueDate)} · {a.batchId?.name || a.batchId || '—'}
                </div>
              </div>
              {pending > 0 && <Pill bg="#fefce8" color="#d97706">{pending} pending</Pill>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => dispatch(openGradingModal(a))}
                className="td-btn"
                style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s' }}
              >
                Grade Submissions
              </button>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {(a.submissions || []).length} submitted
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENTS TAB  — full trainee list
// ═══════════════════════════════════════════════════════════════════════════════

const StudentsTab = () => {
  const dispatch = useDispatch();
  const students = useSelector(selectTrainerStudents);
  const status   = useSelector(selectStudentsStatus);
  const [q, setQ] = useState('');

  useEffect(() => { dispatch(fetchTrainerStudents()); }, [dispatch]);

  if (status === 'loading') return <Spinner />;

  const list = students.filter(s =>
    (s.name  || '').toLowerCase().includes(q.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <H2>All Trainees <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>({students.length})</span></H2>
        {q && <span style={{ fontSize: '0.76rem', color: '#9ca3af' }}>{list.length} match{list.length === 1 ? '' : 'es'}</span>}
      </div>

      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search trainees by name or email…"
        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 14px', fontSize: '0.85rem', color: '#111827', marginBottom: 16, fontFamily: 'inherit' }}
      />

      {students.length === 0 ? (
        <Empty icon="🎓" msg="No trainees found" />
      ) : list.length === 0 ? (
        <Empty icon="🔍" msg="No trainees match your search" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
          {list.map((st, i) => {
            const score = st.averageScore ?? st.score ?? null;
            const c = COLORS[i % COLORS.length];
            const l = LIGHTS[i % LIGHTS.length];
            return (
              <div key={st._id || i} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#fff', flexShrink: 0 }}>
                    {(st.name || 'S')[0].toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</div>
                    <div style={{ fontSize: '0.69rem', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(st.batchId?.name || (typeof st.batchId === 'string' && st.batchId)) && (
                    <Pill bg={l} color={c}>{st.batchId?.name || st.batchId}</Pill>
                  )}
                  {score != null && (
                    <Pill
                      bg={score >= 75 ? '#dcfce7' : score >= 55 ? '#fef9c3' : '#fee2e2'}
                      color={scoreCol(score)}
                    >
                      Score {score}
                    </Pill>
                  )}
                  {st.attendance != null && <Pill bg="#f3f4f6" color="#374151">Att {st.attendance}%</Pill>}
                  {(st.placementStatus === 'ready' || st.isPlacementReady) && (
                    <Pill bg="#dcfce7" color="#15803d">✓ Placement Ready</Pill>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'sessions',    label: 'Sessions'    },
  { id: 'assignments', label: 'Assignments' },
  { id: 'students',    label: 'Students'    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TrainerDashboard = () => {
  const dispatch  = useDispatch();

  const dashboard = useSelector(selectTrainerDashboard);
  const status    = useSelector(selectTrainerStatus);
  const error     = useSelector(selectTrainerError);
  const activeTab = useSelector(selectActiveTab);
  const modal     = useSelector(selectGradingModal);
  const students  = useSelector(selectTrainerStudents);

  useEffect(() => { dispatch(fetchTrainerDashboard()); }, [dispatch]);
  useEffect(() => { dispatch(fetchTrainerStudents());  }, [dispatch]);

  const trainerName    = dashboard?.trainer?.name       ?? dashboard?.trainerName    ?? 'Trainer';
  const trainerBatches = dashboard?.trainer?.batchGroup ?? dashboard?.batchGroupName ?? 'YBLP Batches';
  const trainerRole    = dashboard?.trainer?.role       ?? dashboard?.role           ?? 'isMentor';
  const isActive       = dashboard?.trainer?.isActive   ?? dashboard?.isActive       ?? true;
  const liveSessions   = dashboard?.liveSessions || [];

  const tabContent = {
    overview:    <OverviewTab dashboard={dashboard} students={students} />,
    sessions:    <SessionsTab />,
    assignments: <AssignmentsTab />,
    students:    <StudentsTab />,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif", color: '#111827' }}>
      <style>{CSS}</style>

      <div className="td-wrap" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: 28, animation: 'fadeUp .35s ease' }}>
          <h1 className="td-h1" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: 7 }}>
            Trainer Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', color: '#6b7280' }}>
              {trainerName} · {trainerBatches} · {trainerRole}:
            </span>
            {isActive
              ? <Pill bg="#dcfce7" color="#15803d" dot>Active</Pill>
              : <Pill bg="#fee2e2" color="#b91c1c" dot>Inactive</Pill>
            }
            {liveSessions.length > 0 && (
              <Pill bg="#fee2e2" color="#dc2626">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', animation: 'pulse 1s infinite' }} />
                {liveSessions.length} Live
              </Pill>
            )}
          </div>
        </div>

        {/* ── ERROR BANNER ── */}
        {error && status === 'failed' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '11px 14px', marginBottom: 20, fontSize: '0.79rem', color: '#b91c1c', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <div><strong>API Error:</strong> {error}</div>
          </div>
        )}

        {/* ── UNDERLINE TABS ── */}
        <div className="td-tabs" style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 28 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="td-tab"
                onClick={() => dispatch(setActiveTab(tab.id))}
                style={{
                  padding: '9px 18px', border: 'none',
                  borderRadius: '6px 6px 0 0',
                  borderBottom: active ? '2.5px solid #6366f1' : '2.5px solid transparent',
                  background: 'transparent',
                  color:  active ? '#6366f1' : '#6b7280',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all .15s', marginBottom: -1,
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB CONTENT ── */}
        {status === 'loading' && !dashboard ? (
          <Spinner />
        ) : (
          <div style={{ animation: 'fadeUp .25s ease' }}>
            {tabContent[activeTab]}
          </div>
        )}
      </div>

      {/* ── GRADING MODAL ── */}
      {modal && <GradingModal />}
    </div>
  );
};

export default TrainerDashboard;