import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  fetchSessions,
  createSession,
  endSession,
  markAttendance,
  selectAllSessions,
  selectSessionsStatus,
  selectSessionsError,
  selectCreateStatus,
  selectCreateError,
  selectEndStatus,
  selectEndError,
  selectMarkStatus,
  selectMarkError,
  resetCreateStatus,
} from '../../features/session/sessionsSlice';

import {
  fetchBatches,
  selectAllBatches,    // full objects [{_id, name, ...}]
  selectBatchesStatus,
} from '../../features/session/batchSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_MODULES = [
  { id: 'M4-LMS-01', label: 'M4-LMS-01 — Introduction'     },
  { id: 'M4-LMS-02', label: 'M4-LMS-02 — Core Concepts'     },
  { id: 'M4-LMS-03', label: 'M4-LMS-03 — Branch Operations' },
  { id: 'M4-LMS-04', label: 'M4-LMS-04 — Advanced Topics'   },
  { id: 'M5-LMS-01', label: 'M5-LMS-01 — Practical'         },
  { id: 'M6-LMS-01', label: 'M6-LMS-01 — Residency Debrief' },
];

const SESSION_TYPES = ['S1', 'S2', 'S3', 'S4', 'S5'];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const buildCalendar = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let start = new Date(firstDay);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);
  const weeks = [];
  let cur = new Date(start);
  while (cur <= lastDay || weeks.length < 4) {
    const week = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
    if (cur > lastDay && weeks.length >= 4) break;
  }
  return weeks;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd= String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const fmtMonthYear = (d) =>
  d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const isLive = (s) => s.status === 'live' || s.status === 'ongoing';

const chipLabel = (s) =>
  s.moduleId || s.lmsModuleId ||
  (s.title ? (s.title.length > 11 ? s.title.slice(0, 10) + '…' : s.title) : 'Session');

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.25} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .ts-btn:hover { opacity: .87 !important; }
  .ts-day:hover { background: #f8fafc !important; }
  input:focus, select:focus, textarea:focus {
    outline: none !important;
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12) !important;
  }
  @media (max-width: 920px) {
    .ts-layout { flex-direction: column !important; }
    .ts-panel  { flex: unset !important; width: 100% !important; }
  }
`;

const inputSt = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
  padding: '9px 12px', fontSize: '0.85rem', color: '#111827',
  background: '#fff', fontFamily: 'inherit',
};

const selSt = {
  ...inputSt,
  appearance: 'none', WebkitAppearance: 'none',
  paddingRight: 32, cursor: 'pointer',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
    <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#1e293b', animation: 'spin .7s linear infinite' }} />
  </div>
);

const FL = ({ children }) => (
  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>
    {children}
  </label>
);

const ErrBox = ({ msg }) => msg ? (
  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', fontSize: '0.78rem', color: '#b91c1c', marginBottom: 12 }}>
    ⚠️ {msg}
  </div>
) : null;

const OkBox = ({ msg }) => msg ? (
  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '9px 12px', fontSize: '0.78rem', color: '#15803d', marginBottom: 12 }}>
    ✓ {msg}
  </div>
) : null;

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

const SessionCalendar = ({ sessions, calDate, onPrev, onNext }) => {
  const today = new Date();
  const weeks = buildCalendar(calDate.getFullYear(), calDate.getMonth());
  const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const byDay = {};
  sessions.forEach(s => {
    const raw = s.scheduledAt || s.date || s.startTime;
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    const k = toDateInput(d);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(s);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
          Session Calendar — {fmtMonthYear(calDate)}
        </h2>
        <div style={{ display: 'flex', gap: 4 }}>
          {['‹', '›'].map((ch, i) => (
            <button key={i} onClick={i === 0 ? onPrev : onNext} className="ts-btn"
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280', lineHeight: 1 }}>
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
          {week.map((day, di) => {
            const inMonth = day.getMonth() === calDate.getMonth();
            const isToday = isSameDay(day, today);
            const key     = toDateInput(day);
            const daySess = inMonth ? (byDay[key] || []) : [];
            return (
              <div key={di} className="ts-day" style={{
                minHeight: 64, borderRadius: 8, padding: '6px 6px 4px',
                border: isToday ? '1.5px solid #6366f1' : '1px solid #e5e7eb',
                background: '#fff',
                opacity: inMonth ? 1 : 0,
                pointerEvents: inMonth ? 'auto' : 'none',
                transition: 'background .12s',
              }}>
                {inMonth && (
                  <div style={{ fontSize: '0.77rem', fontWeight: isToday ? 700 : 400, color: isToday ? '#6366f1' : '#374151', marginBottom: 4 }}>
                    {day.getDate()}
                  </div>
                )}
                {daySess.map((s, si) => (
                  <div key={si} style={{
                    background: isLive(s) ? '#dc2626' : '#1e293b',
                    color: '#fff', fontSize: '0.58rem', fontWeight: 700,
                    padding: '2px 4px', borderRadius: 4, marginBottom: 2,
                    textAlign: 'center', letterSpacing: '0.2px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {isLive(s) ? 'LIVE NOW' : chipLabel(s)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE SESSION FORM
//
// Batch dropdown uses full batch objects → sends _id to backend.
// Backend route accepts:
//   { batch (name or _id), moduleId, sessionType, scheduledAt, recordingLink?, title? }
// Response: { success: true, session: { _id, title, moduleId, status, scheduledAt, batchId } }
// ═══════════════════════════════════════════════════════════════════════════════

const CreateSessionForm = ({ batches, modules, onCreated }) => {
  const dispatch     = useDispatch();
  const createStatus = useSelector(selectCreateStatus);
  const createError  = useSelector(selectCreateError);

  const today = new Date();

  // ── Form state ─────────────────────────────────────────────────────────────
  // batchObj holds the full batch object { _id, name } so we can send _id to API
  const [batchObj,  setBatchObj]  = useState(null);
  const [moduleId,  setModuleId]  = useState('');
  const [sessType,  setSessType]  = useState('S1');
  const [date,      setDate]      = useState(toDateInput(today));
  const [time,      setTime]      = useState('10:00');
  const [recLink,   setRecLink]   = useState('');
  const [showOk,    setShowOk]    = useState(false);

  // Set default batch once batches load from API
  useEffect(() => {
    if (batches.length > 0 && !batchObj) {
      // Default to second batch if available (index 1), else first
      setBatchObj(batches[1] || batches[0]);
    }
  }, [batches]);

  // Set default module
  useEffect(() => {
    if (modules.length > 0 && !moduleId) {
      setModuleId(modules[2]?.id || modules[0]?.id || '');
    }
  }, [modules]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batchObj || !moduleId) return;

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    // POST /api/trainer/sessions
    // Body matches backend exactly:
    // {
    //   batch:         batchObj.name  (backend resolves to batchId via Batch.findOne({name}))
    //   moduleId:      'M4-LMS-03'
    //   sessionType:   'S1'
    //   scheduledAt:   ISO string
    //   recordingLink: optional
    //   title:         'M4-LMS-03 — S1'
    // }
    const result = await dispatch(createSession({
      batch:         batchObj.name,       // ← send name; backend resolves to _id
      moduleId,
      sessionType:   sessType,
      scheduledAt,
      recordingLink: recLink || undefined,
      title:         `${moduleId} — ${sessType}`,
    }));

    if (createSession.fulfilled.match(result)) {
      // Response: { success: true, session: { _id, title, moduleId, status, scheduledAt, batchId:{name} } }
      setShowOk(true);
      setRecLink('');
      dispatch(resetCreateStatus());
      onCreated();                         // re-fetch sessions → calendar updates
      setTimeout(() => setShowOk(false), 3000);
    }
  };

  const saving = createStatus === 'loading';

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginBottom: 20 }}>
        Create Session
      </h2>

      {/* ── Batch dropdown ── */}
      {/* Shows batch names; internally tracks full object for _id access */}
      <div style={{ marginBottom: 16 }}>
        <FL>Batch</FL>
        <div style={{ position: 'relative' }}>
          <select
            value={batchObj?._id || ''}
            onChange={e => {
              const found = batches.find(b => b._id === e.target.value);
              setBatchObj(found || null);
            }}
            style={selSt}
            required
          >
            <option value="" disabled>
              {batches.length === 0 ? 'Loading batches…' : 'Select batch…'}
            </option>
            {batches.map(b => (
              <option key={b._id} value={b._id}>
                {b.name}
                {b.course ? ` — ${b.course}` : ''}
                {b.status === 'upcoming' ? ' (Upcoming)' : b.status === 'active' ? ' ✓' : ''}
              </option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '0.7rem', pointerEvents: 'none' }}>▾</span>
        </div>
      </div>

      {/* ── LMS Module ID ── */}
      <div style={{ marginBottom: 16 }}>
        <FL>LMS Module ID</FL>
        <div style={{ position: 'relative' }}>
          <select value={moduleId} onChange={e => setModuleId(e.target.value)} style={selSt} required>
            <option value="" disabled>Select module…</option>
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '0.7rem', pointerEvents: 'none' }}>▾</span>
        </div>
      </div>

      {/* ── Session Type S1–S5 ── */}
      <div style={{ marginBottom: 16 }}>
        <FL>Session Type</FL>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {SESSION_TYPES.map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.84rem', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="radio" name="sessType" value={t}
                checked={sessType === t}
                onChange={() => setSessType(t)}
                style={{ accentColor: '#6366f1', width: 15, height: 15, cursor: 'pointer' }}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* ── Date + Time ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <FL>Date</FL>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputSt} required />
        </div>
        <div>
          <FL>Time</FL>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputSt} required />
        </div>
      </div>

      {/* ── Recording Link ── */}
      <div style={{ marginBottom: 20 }}>
        <FL>Recording Link (optional)</FL>
        <input
          type="url" value={recLink}
          onChange={e => setRecLink(e.target.value)}
          placeholder="https://meet.google.com/…"
          style={inputSt}
        />
      </div>

      <ErrBox msg={createError} />
      <OkBox  msg={showOk ? 'Session scheduled successfully!' : null} />

      <button
        type="submit"
        disabled={saving || !batchObj || !moduleId}
        className="ts-btn"
        style={{
          width: '100%', padding: '12px', borderRadius: 9, border: 'none',
          background: (saving || !batchObj || !moduleId) ? '#94a3b8' : '#1e293b',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          cursor: (saving || !batchObj || !moduleId) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'opacity .15s',
        }}
      >
        {saving ? 'Scheduling…' : 'Schedule Session'}
      </button>
    </form>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE SESSION PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const LiveSessionPanel = ({ session, onEnded }) => {
  const dispatch   = useDispatch();
  const endStatus  = useSelector(selectEndStatus);
  const endError   = useSelector(selectEndError);
  const markStatus = useSelector(selectMarkStatus);
  const markError  = useSelector(selectMarkError);
  const [markOk,   setMarkOk] = useState(false);

  const moduleLabel =
    session.lmsModuleId || session.moduleId ||
    (session.title ? session.title.split('—')[0].trim() : '—');
  const batchLabel =
    session.batchId?.name || session.batchName || session.batch || '—';

  // PUT /api/trainer/sessions/:id/end
  const handleEnd = async () => {
    if (!window.confirm('End this live session?')) return;
    const result = await dispatch(endSession(session._id));
    if (endSession.fulfilled.match(result)) onEnded();
  };

  // POST http://localhost:8088/api/attendance/mark
  const handleMark = async () => {
    const result = await dispatch(markAttendance({ sessionId: session._id }));
    if (markAttendance.fulfilled.match(result)) {
      setMarkOk(true);
      setTimeout(() => setMarkOk(false), 3000);
    }
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', background: '#fff', marginTop: 20, animation: 'fadeUp .3s ease' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 18 }}>
        Today's Session — <span style={{ color: '#dc2626' }}>LIVE</span>
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {[
            { label: 'Module', value: moduleLabel },
            { label: 'Batch',  value: batchLabel  },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827' }}>{value}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#dc2626' }}>Live</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {markOk && <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 500 }}>✓ Marked</span>}
          <button onClick={handleMark} disabled={markStatus === 'loading'} className="ts-btn"
            style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .15s' }}>
            {markStatus === 'loading' ? 'Marking…' : 'Mark Attendance'}
          </button>
          <button onClick={handleEnd} disabled={endStatus === 'loading'} className="ts-btn"
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: endStatus === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'opacity .15s' }}>
            {endStatus === 'loading' ? 'Ending…' : 'End Session'}
          </button>
        </div>
      </div>

      <ErrBox msg={endError || markError} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TrainerSessions = () => {
  const dispatch = useDispatch();

  // ── Sessions (sessionsSlice) ───────────────────────────────────────────────
  const sessions = useSelector(selectAllSessions);
  const status   = useSelector(selectSessionsStatus);
  const error    = useSelector(selectSessionsError);

  // ── Batches (batchSlice) — full objects from GET /api/batches ─────────────
  // Real response: { success, data: { batches:[{_id,name,course,status,...}], meta } }
  const batches      = useSelector(selectAllBatches);   // [{_id, name, course, status, ...}]
  const batchesStatus= useSelector(selectBatchesStatus);

  // ── Local UI ──────────────────────────────────────────────────────────────
  const [calDate, setCalDate] = useState(new Date());
  const [modules]             = useState(FALLBACK_MODULES);

  // ── 1. Fetch sessions on mount ────────────────────────────────────────────
  useEffect(() => { dispatch(fetchSessions()); }, [dispatch]);

  // ── 2. Fetch ALL batches on mount — GET /api/batches (no limit = return all)
  //    batchSlice reads: response.data.batches
  //    auth via getState().auth.token
  useEffect(() => { dispatch(fetchBatches()); }, [dispatch]);

  const reload = useCallback(() => { dispatch(fetchSessions()); }, [dispatch]);

  const today    = new Date();
  const liveSess = sessions.filter(s =>
    isLive(s) &&
    isSameDay(new Date(s.scheduledAt || s.date || s.startTime || 0), today)
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif", color: '#111827' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* PAGE HEADER */}
        <div style={{ marginBottom: 28, animation: 'fadeUp .3s ease' }}>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.4px', marginBottom: 5 }}>
            Live Session Management
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#6b7280' }}>
            Schedule, start, and end training sessions linked to LMS module IDs
          </p>
        </div>

        <ErrBox msg={error && status === 'failed' ? error : null} />

        {/* 2-COL LAYOUT */}
        <div className="ts-layout" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT — Calendar */}
          <div className="ts-panel" style={{ flex: '0 0 48%', border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 20px', background: '#fff' }}>
            {status === 'loading' ? <Spinner /> : (
              <SessionCalendar
                sessions={sessions}
                calDate={calDate}
                onPrev={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                onNext={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              />
            )}
          </div>

          {/* RIGHT — Create Session Form */}
          <div className="ts-panel" style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 14, padding: '22px 24px', background: '#fff' }}>
            {batchesStatus === 'loading' && batches.length === 0
              ? <Spinner />
              : (
                <CreateSessionForm
                  batches={batches}   // full objects [{_id, name, course, status}]
                  modules={modules}
                  onCreated={reload}
                />
              )
            }
          </div>
        </div>

        {/* LIVE SESSION PANEL */}
        {liveSess.map(s => (
          <LiveSessionPanel key={s._id} session={s} onEnded={reload} />
        ))}

        {status === 'succeeded' && liveSess.length === 0 && (
          <div style={{ marginTop: 20, border: '1px dashed #e5e7eb', borderRadius: 12, padding: '16px 20px', background: '#fff', fontSize: '0.84rem', color: '#9ca3af' }}>
            No live session running today.
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerSessions;