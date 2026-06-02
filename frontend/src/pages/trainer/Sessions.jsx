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

// Google-Calendar-style colour per session type (live overrides to red)
const SESSION_COLORS = {
  S1: '#6366f1', // indigo
  S2: '#0ea5e9', // sky
  S3: '#10b981', // emerald
  S4: '#f59e0b', // amber
  S5: '#8b5cf6', // violet
};

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

// Midnight of "today" — used everywhere to classify past vs editable days.
const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

// A day is editable if it is today or in the future (not before midnight today).
const isEditableDay = (day) => {
  const d = new Date(day); d.setHours(0, 0, 0, 0);
  return d >= startOfToday();
};

const isLive = (s) => s.status === 'live' || s.status === 'ongoing';

const rawDate = (s) => s.scheduledAt || s.date || s.startTime;

const fmtTime = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// Resolve the session type (S1..S5) from explicit field or the title text.
const sessTypeOf = (s) =>
  s.sessionType || (s.title && SESSION_TYPES.find(t => s.title.includes(t))) || null;

const sessColor = (s) =>
  isLive(s) ? '#dc2626' : (SESSION_COLORS[sessTypeOf(s)] || '#1e293b');

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

  /* Editable day (today / future) — clear it can be clicked & scheduled */
  .ts-day-edit  { cursor: pointer; }
  .ts-day-edit:hover  { background: #f5f7ff !important; border-color: #c7d2fe !important; }
  /* Past day — view only (read-only), softer hover, never "scheduling" affordance */
  .ts-day-view  { cursor: pointer; }
  .ts-day-view:hover  { background: #f8fafc !important; }

  /* Calendar chip overflow */
  .ts-chips-mobile  { display: none; }
  .ts-chips-desktop { display: block; }

  input:focus, select:focus, textarea:focus {
    outline: none !important;
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12) !important;
  }

  @media (max-width: 920px) {
    .ts-layout { flex-direction: column !important; }
    .ts-panel  { flex: unset !important; width: 100% !important; }
  }

  /* Mobile calendar: compact cells, dots instead of text chips */
  @media (max-width: 600px) {
    .ts-day          { min-height: 46px !important; padding: 4px 3px 3px !important; }
    .ts-day-num      { font-size: 0.72rem !important; }
    .ts-cal-weekday  { font-size: 0.6rem !important; }
    .ts-chips-desktop { display: none !important; }
    .ts-chips-mobile  { display: flex !important; }
    .ts-cal-title    { font-size: 0.9rem !important; }
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

// Small pill used in the agenda header
const Badge = ({ text, color, bg }) => (
  <span style={{ background: bg, color, fontSize: '0.66rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
    {text}
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CALENDAR  (read-only past · editable future · Google-style chips · mobile)
// ═══════════════════════════════════════════════════════════════════════════════

const SessionCalendar = ({ sessions, calDate, onPrev, onNext, selectedDate, onSelectDate }) => {
  const today = new Date();
  const weeks = buildCalendar(calDate.getFullYear(), calDate.getMonth());
  const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Group sessions by day key (sorted by time so chips read top-to-bottom).
  const byDay = {};
  sessions.forEach(s => {
    const raw = rawDate(s);
    if (!raw) return;
    const d = new Date(raw);
    if (isNaN(d)) return;
    const k = toDateInput(d);
    (byDay[k] = byDay[k] || []).push(s);
  });
  Object.values(byDay).forEach(list =>
    list.sort((a, b) => new Date(rawDate(a)) - new Date(rawDate(b)))
  );

  const MAX_CHIPS = 3;

  // ── Selected-day agenda data ───────────────────────────────────────────────
  const selKey      = toDateInput(selectedDate);
  const selSessions = byDay[selKey] || [];
  const selEditable = isEditableDay(selectedDate);

  return (
    <div>
      {/* Header / month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 className="ts-cal-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
          Session Calendar — {fmtMonthYear(calDate)}
        </h2>
        <div style={{ display: 'flex', gap: 4 }}>
          {['‹', '›'].map((ch, i) => (
            <button key={i} onClick={i === 0 ? onPrev : onNext} className="ts-btn"
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: '0.95rem', color: '#6b7280', lineHeight: 1 }}>
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} className="ts-cal-weekday" style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
          {week.map((day, di) => {
            const inMonth    = day.getMonth() === calDate.getMonth();
            const isToday    = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            const editable   = isEditableDay(day);          // today + future
            const isPast     = inMonth && !editable;        // before today
            const key        = toDateInput(day);
            const daySess    = inMonth ? (byDay[key] || []) : [];
            const overflow   = Math.max(0, daySess.length - MAX_CHIPS);

            // Visual state
            let bg = '#fff', bd = '1px solid #e5e7eb', numColor = '#374151';
            if (!inMonth)      { numColor = '#cbd5e1'; }
            else if (isPast)   { bg = '#fafafa'; numColor = '#9ca3af'; }
            if (isToday)       { bd = '1.5px solid #6366f1'; numColor = '#6366f1'; }
            if (isSelected && inMonth) { bg = '#eef2ff'; bd = '1.5px solid #6366f1'; }

            // Interaction class: editable → scheduling affordance; past → view only
            const cls = !inMonth ? '' : (editable ? 'ts-day-edit' : 'ts-day-view');

            return (
              <div
                key={di}
                className={`ts-day ${cls}`}
                onClick={() => { if (inMonth) onSelectDate(day); }}
                title={
                  !inMonth ? undefined
                  : editable ? 'Click to schedule on this day'
                  : 'Past date — read only'
                }
                style={{
                  minHeight: 66, borderRadius: 8, padding: '6px 6px 4px',
                  border: bd, background: bg,
                  opacity: inMonth ? 1 : 0.45,
                  pointerEvents: inMonth ? 'auto' : 'none',
                  transition: 'background .12s, border-color .12s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div className="ts-day-num" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.77rem', fontWeight: isToday ? 700 : 500, color: numColor, marginBottom: 4 }}>
                  <span>{day.getDate()}</span>
                  {isPast && daySess.length > 0 && (
                    <span style={{ fontSize: '0.5rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.4px' }}>🔒</span>
                  )}
                </div>

                {/* Desktop / tablet — text chips like Google Calendar */}
                <div className="ts-chips-desktop">
                  {daySess.slice(0, MAX_CHIPS).map((s, si) => {
                    const live = isLive(s);
                    const c    = sessColor(s);
                    return (
                      <div key={si} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: live ? '#dc2626' : c + '1A',  // 10% tint for scheduled
                        color: live ? '#fff' : '#1f2937',
                        fontSize: '0.58rem', fontWeight: 700,
                        padding: '2px 5px', borderRadius: 4, marginBottom: 2,
                        opacity: isPast ? 0.6 : 1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {!live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {live ? 'LIVE NOW' : `${fmtTime(rawDate(s))} ${chipLabel(s)}`.trim()}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#6b7280', paddingLeft: 2 }}>
                      +{overflow} more
                    </div>
                  )}
                </div>

                {/* Mobile — coloured dots (tap day to see the agenda below) */}
                <div className="ts-chips-mobile" style={{ gap: 3, flexWrap: 'wrap', alignContent: 'flex-start' }}>
                  {daySess.slice(0, 4).map((s, si) => (
                    <span key={si} style={{ width: 6, height: 6, borderRadius: '50%', background: sessColor(s), opacity: isPast ? 0.6 : 1 }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* ── Selected-day agenda (Google-calendar style day view) ─────────────── */}
      <div style={{ marginTop: 18, borderTop: '1px solid #eef2f7', paddingTop: 14, animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {selectedDate.toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
              {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          {selEditable
            ? <Badge text="Schedulable" color="#4338ca" bg="#eef2ff" />
            : <Badge text="🔒 Read only" color="#6b7280" bg="#f1f5f9" />}
        </div>

        {selSessions.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', background: '#f8fafc', border: '1px dashed #e5e7eb', borderRadius: 8, padding: '12px 14px' }}>
            {selEditable
              ? 'No sessions scheduled. Use the form to add one to this day.'
              : 'No sessions were scheduled on this day.'}
          </div>
        ) : (
          selSessions.map((s, i) => {
            const live = isLive(s);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'stretch', gap: 10,
                padding: '9px 11px', borderRadius: 9, marginBottom: 7,
                background: '#f8fafc', border: '1px solid #f1f5f9',
                opacity: selEditable ? 1 : 0.85,
              }}>
                <span style={{ width: 4, borderRadius: 4, background: sessColor(s), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {chipLabel(s)}
                    {sessTypeOf(s) && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: sessColor(s), background: sessColor(s) + '1A', padding: '1px 6px', borderRadius: 5 }}>
                        {sessTypeOf(s)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>
                    {(s.batchId?.name || s.batchName || s.batch || '—')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#374151' }}>{fmtTime(rawDate(s)) || '—'}</div>
                  {live
                    ? <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#dc2626', marginTop: 2 }}>● LIVE</div>
                    : <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' }}>{s.status || 'scheduled'}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
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
//
// `presetDate` (YYYY-MM-DD) is pushed in when the user clicks an editable day
// in the calendar, keeping the grid and the form in sync.
// ═══════════════════════════════════════════════════════════════════════════════

const CreateSessionForm = ({ batches, modules, onCreated, presetDate }) => {
  const dispatch     = useDispatch();
  const createStatus = useSelector(selectCreateStatus);
  const createError  = useSelector(selectCreateError);

  const today   = new Date();
  const minDate = toDateInput(today);          // cannot schedule before today

  // ── Form state ─────────────────────────────────────────────────────────────
  const [batchObj,  setBatchObj]  = useState(null);
  const [moduleId,  setModuleId]  = useState('');
  const [sessType,  setSessType]  = useState('S1');
  const [date,      setDate]      = useState(presetDate || minDate);
  const [time,      setTime]      = useState('10:00');
  const [recLink,   setRecLink]   = useState('');
  const [showOk,    setShowOk]    = useState(false);

  // Keep the form date in sync when a day is picked on the calendar.
  useEffect(() => {
    if (presetDate) setDate(presetDate);
  }, [presetDate]);

  // Default batch once batches load from API
  useEffect(() => {
    if (batches.length > 0 && !batchObj) {
      setBatchObj(batches[1] || batches[0]);
    }
  }, [batches]);

  // Default module
  useEffect(() => {
    if (modules.length > 0 && !moduleId) {
      setModuleId(modules[2]?.id || modules[0]?.id || '');
    }
  }, [modules]);

  // Guard: a past date should never be schedulable.
  const isPastDate = date < minDate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batchObj || !moduleId || isPastDate) return;

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    const result = await dispatch(createSession({
      batch:         batchObj.name,       // ← send name; backend resolves to _id
      moduleId,
      sessionType:   sessType,
      scheduledAt,
      recordingLink: recLink || undefined,
      title:         `${moduleId} — ${sessType}`,
    }));

    if (createSession.fulfilled.match(result)) {
      setShowOk(true);
      setRecLink('');
      dispatch(resetCreateStatus());
      onCreated();                         // re-fetch sessions → calendar updates
      setTimeout(() => setShowOk(false), 3000);
    }
  };

  const saving   = createStatus === 'loading';
  const disabled = saving || !batchObj || !moduleId || isPastDate;

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginBottom: 20 }}>
        Create Session
      </h2>

      {/* ── Batch dropdown ── */}
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
          {/* min={minDate} blocks past dates in the native picker */}
          <input type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} style={inputSt} required />
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

      {isPastDate && (
        <ErrBox msg="You can only schedule sessions for today or a future date." />
      )}
      <ErrBox msg={createError} />
      <OkBox  msg={showOk ? 'Session scheduled successfully!' : null} />

      <button
        type="submit"
        disabled={disabled}
        className="ts-btn"
        style={{
          width: '100%', padding: '12px', borderRadius: 9, border: 'none',
          background: disabled ? '#94a3b8' : '#1e293b',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
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
  const batches      = useSelector(selectAllBatches);   // [{_id, name, course, status, ...}]
  const batchesStatus= useSelector(selectBatchesStatus);

  // ── Local UI ──────────────────────────────────────────────────────────────
  const [calDate,      setCalDate]      = useState(new Date()); // visible month
  const [selectedDate, setSelectedDate] = useState(new Date()); // agenda focus
  const [formDate,     setFormDate]     = useState(toDateInput(new Date())); // synced into form
  const [modules]                       = useState(FALLBACK_MODULES);

  // ── 1. Fetch sessions on mount ────────────────────────────────────────────
  useEffect(() => { dispatch(fetchSessions()); }, [dispatch]);

  // ── 2. Fetch ALL batches on mount — GET /api/batches ──────────────────────
  useEffect(() => { dispatch(fetchBatches()); }, [dispatch]);

  const reload = useCallback(() => { dispatch(fetchSessions()); }, [dispatch]);

  // Selecting a day: always focus the agenda; only feed the form if editable
  // (today/future). Past days stay read-only — the form date is untouched.
  const handleSelectDate = useCallback((day) => {
    setSelectedDate(day);
    if (isEditableDay(day)) setFormDate(toDateInput(day));
  }, []);

  const today    = new Date();
  const liveSess = sessions.filter(s =>
    isLive(s) &&
    isSameDay(new Date(rawDate(s) || 0), today)
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
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
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
                  batches={batches}     // full objects [{_id, name, course, status}]
                  modules={modules}
                  onCreated={reload}
                  presetDate={formDate} // ← clicked editable day flows in here
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