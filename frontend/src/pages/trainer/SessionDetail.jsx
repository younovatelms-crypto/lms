import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

import {
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  selectAllSessions,
  selectSessionsStatus,
} from '../../features/session/sessionsSlice';

import {
  fetchBatches,
  selectAllBatches,
} from '../../features/session/batchSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// Self-contained helpers (kept local so this page has no import coupling)
// ═══════════════════════════════════════════════════════════════════════════════

const SESSION_TYPES  = ['S1', 'S2', 'S3', 'S4', 'S5'];
const EDIT_STATUSES  = ['scheduled', 'live', 'completed', 'cancelled'];
const SESSION_COLORS = { S1: '#6366f1', S2: '#0ea5e9', S3: '#10b981', S4: '#f59e0b', S5: '#8b5cf6' };

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const rawDate    = (s) => s.scheduledAt || s.date || s.startTime;
const isLive     = (s) => s.status === 'live' || s.status === 'ongoing';
const sessTypeOf = (s) => s.sessionType || (s.title && SESSION_TYPES.find(t => s.title.includes(t))) || null;
const sessColor  = (s) => (isLive(s) ? '#dc2626' : (SESSION_COLORS[sessTypeOf(s)] || '#1e293b'));
const fmtTime    = (raw) => { if (!raw) return ''; const d = new Date(raw); return isNaN(d) ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
const fmtDateLong= (raw) => { const d = new Date(raw); return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };

const inputSt = { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: '0.85rem', color: '#111827', background: '#fff', fontFamily: 'inherit' };
const selSt   = { ...inputSt, appearance: 'none', WebkitAppearance: 'none', paddingRight: 32, cursor: 'pointer' };

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .sd-btn:hover { opacity: .87; }
  input:focus, select:focus, textarea:focus {
    outline: none !important; border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,.12) !important;
  }
  @media (max-width: 600px) {
    .sd-grid3 { grid-template-columns: 1fr !important; }
    .sd-grid2 { grid-template-columns: 1fr !important; }
  }
`;

const FL = ({ children }) => (
  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 7 }}>{children}</label>
);
const ErrBox = ({ msg }) => msg ? (
  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '9px 12px', fontSize: '0.78rem', color: '#b91c1c', marginBottom: 12 }}>⚠️ {msg}</div>
) : null;
const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#1e293b', animation: 'spin .7s linear infinite' }} />
  </div>
);
const chev = (
  <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '0.7rem', pointerEvents: 'none' }}>▾</span>
);

const Shell = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif", color: '#111827' }}>
    <style>{CSS}</style>
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>{children}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION DETAIL  —  routed page (view · edit · create)
//
// Register three routes that render this with a `mode` prop:
//   /trainer/sessions/new          → <SessionDetail mode="create" />
//   /trainer/sessions/:id          → <SessionDetail mode="view" />
//   /trainer/sessions/:id/edit     → <SessionDetail mode="edit" />
// ═══════════════════════════════════════════════════════════════════════════════

const SessionDetail = ({ mode = 'view' }) => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const sessions = useSelector(selectAllSessions);
  const status   = useSelector(selectSessionsStatus);
  const batches  = useSelector(selectAllBatches);

  const isCreate = mode === 'create' || id === 'new';
  const session  = useMemo(() => sessions.find(s => s._id === id) || null, [sessions, id]);

  // Make sure data exists on direct load / refresh.
  useEffect(() => { if (!isCreate && !session) dispatch(fetchSessions()); }, [isCreate, session, dispatch]);
  useEffect(() => { if (mode !== 'view') dispatch(fetchBatches()); }, [mode, dispatch]);

  const buildForm = () => {
    if (session && !isCreate) {
      const r = rawDate(session); const d = r ? new Date(r) : new Date(); const ok = !isNaN(d);
      return {
        batchName:    session.batchId?.name || session.batchName || session.batch || '',
        title:        session.moduleId || session.title || '',
        sessType:     sessTypeOf(session) || 'S1',
        date:         ok ? toDateInput(d) : toDateInput(new Date()),
        time:         ok ? d.toTimeString().slice(0, 5) : '10:00',
        duration:     session.durationMinutes || 60,
        status:       session.status || 'scheduled',
        roomName:     session.roomName || '',
        recordingUrl: session.recordingUrl || '',
        description:  session.description || '',
      };
    }
    return { batchName: '', title: '', sessType: 'S1', date: toDateInput(new Date()), time: '10:00', duration: 60, status: 'scheduled', roomName: '', recordingUrl: '', description: '' };
  };

  const [f, setF]       = useState(buildForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);
  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));

  // Re-seed the form once the session arrives after a fetch (view/edit deep-link).
  useEffect(() => { if (!isCreate && session) setF(buildForm()); /* eslint-disable-next-line */ }, [session?._id]);

  const backToList = () => navigate('..', { relative: 'path' });

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const scheduledAt = new Date(`${f.date}T${f.time}:00`).toISOString();
    const payload = {
      batch:           f.batchName || undefined,
      title:           f.title,
      moduleId:        f.title,
      sessionType:     f.sessType,
      scheduledAt,
      durationMinutes: Number(f.duration) || 60,
      status:          f.status,
      roomName:        f.roomName,
      recordingUrl:    f.recordingUrl || undefined,
      description:     f.description,
    };
    const result = await dispatch(isCreate ? createSession(payload) : updateSession({ id, changes: payload }));
    setBusy(false);
    const ok = (isCreate ? createSession.fulfilled : updateSession.fulfilled).match(result);
    if (ok) { await dispatch(fetchSessions()); navigate(-1); }
    else { setErr(result.payload || 'Save failed'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this session permanently? This cannot be undone.')) return;
    setBusy(true);
    const result = await dispatch(deleteSession(id));
    setBusy(false);
    if (deleteSession.fulfilled.match(result)) { await dispatch(fetchSessions()); backToList(); }
  };

  const BackBtn = () => (
    <button onClick={backToList} className="sd-btn"
      style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 18, fontFamily: 'inherit' }}>
      ‹ Back to sessions
    </button>
  );

  // ── Loading / not-found ────────────────────────────────────────────────────
  if (!isCreate && !session && status === 'loading') return <Shell><Spinner /></Shell>;
  if (!isCreate && !session) {
    return (
      <Shell>
        <BackBtn />
        <div style={{ border: '1px dashed #e5e7eb', borderRadius: 14, background: '#fff', padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
          Session not found. It may have been deleted.
        </div>
      </Shell>
    );
  }

  // ── VIEW MODE ───────────────────────────────────────────────────────────────
  if (mode === 'view' && !isCreate) {
    const color     = sessColor(session);
    const type      = sessTypeOf(session);
    const topics    = Array.isArray(session.topics) ? session.topics : [];
    const resources = Array.isArray(session.resources) ? session.resources : [];
    const Meta = ({ label, value }) => (
      <div>
        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>{value}</div>
      </div>
    );
    return (
      <Shell>
        <BackBtn />
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff', overflow: 'hidden', animation: 'fadeUp .25s ease' }}>
          <div style={{ height: 6, background: color }} />
          <div style={{ padding: '22px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{session.moduleId || session.title || 'Session'}</h1>
                {type && <span style={{ fontSize: '0.7rem', fontWeight: 700, color, background: color + '1A', padding: '3px 9px', borderRadius: 6 }}>{type}</span>}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isLive(session) ? '#fff' : '#475569', background: isLive(session) ? '#dc2626' : '#f1f5f9', padding: '3px 9px', borderRadius: 999, textTransform: 'capitalize' }}>{session.status || 'scheduled'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 22 }}>
              <Meta label="Date" value={fmtDateLong(rawDate(session))} />
              <Meta label="Time" value={`${fmtTime(rawDate(session)) || '—'}${session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}`} />
              <Meta label="Batch" value={session.batchId?.name || session.batchName || session.batch || '—'} />
              {session.roomName ? <Meta label="Room" value={session.roomName} /> : null}
            </div>

            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: '0.9rem', color: session.description?.trim() ? '#1f2937' : '#9ca3af', lineHeight: 1.6, marginBottom: 20 }}>
              {session.description?.trim() ? session.description : 'No description added for this session.'}
            </p>

            {topics.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Topics</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {topics.map((t, i) => <span key={i} style={{ fontSize: '0.74rem', color: '#3730a3', background: '#eef2ff', padding: '4px 10px', borderRadius: 999 }}>{typeof t === 'string' ? t : (t.name || t.title || '')}</span>)}
                </div>
              </div>
            )}

            {(resources.length > 0 || session.recordingUrl) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
                {resources.map((r, i) => {
                  const url = typeof r === 'string' ? r : (r.url || r.link);
                  const label = typeof r === 'string' ? r : (r.title || r.name || r.url || 'Resource');
                  return url ? <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#4338ca', textDecoration: 'none', fontWeight: 600 }}>📎 {label}</a> : null;
                })}
                {session.recordingUrl && <a href={session.recordingUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#dc2626', textDecoration: 'none', fontWeight: 600 }}>▶ Recording</a>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #eef2f7', paddingTop: 18, flexWrap: 'wrap' }}>
              <button onClick={() => navigate('edit', { relative: 'path' })} className="sd-btn"
                style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                ✏️ Edit
              </button>
              <button onClick={handleDelete} disabled={busy} className="sd-btn"
                style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {busy ? 'Deleting…' : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ── CREATE / EDIT MODE ────────────────────────────────────────────────────────
  return (
    <Shell>
      <BackBtn />
      <form onSubmit={handleSave} style={{ border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff', padding: '24px 26px', animation: 'fadeUp .25s ease' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: 22 }}>
          {isCreate ? 'Create Session' : 'Edit Session'}
        </h1>

        <div style={{ marginBottom: 16 }}>
          <FL>Title / Module ID</FL>
          <input value={f.title} onChange={set('title')} style={inputSt} placeholder="e.g. M4-LMS-03 — S2" required />
        </div>

        <div className="sd-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <FL>Batch</FL>
            <div style={{ position: 'relative' }}>
              <select value={f.batchName} onChange={set('batchName')} style={selSt} required>
                <option value="">— select batch —</option>
                {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
              </select>
              {chev}
            </div>
          </div>
          <div>
            <FL>Status</FL>
            <div style={{ position: 'relative' }}>
              <select value={f.status} onChange={set('status')} style={{ ...selSt, textTransform: 'capitalize' }}>
                {EDIT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              {chev}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FL>Session Type</FL>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {SESSION_TYPES.map(t => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.84rem', color: '#374151', cursor: 'pointer' }}>
                <input type="radio" name="sessType" value={t} checked={f.sessType === t} onChange={() => setF(p => ({ ...p, sessType: t }))} style={{ accentColor: '#6366f1', width: 15, height: 15 }} />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div className="sd-grid3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div><FL>Date</FL><input type="date" value={f.date} onChange={set('date')} style={inputSt} required /></div>
          <div><FL>Time</FL><input type="time" value={f.time} onChange={set('time')} style={inputSt} required /></div>
          <div><FL>Duration (min)</FL><input type="number" min={15} step={5} value={f.duration} onChange={set('duration')} style={inputSt} required /></div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <FL>Room Name (optional)</FL>
          <input value={f.roomName} onChange={set('roomName')} style={inputSt} placeholder="Room / hall" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <FL>Recording Link (optional)</FL>
          <input type="url" value={f.recordingUrl} onChange={set('recordingUrl')} style={inputSt} placeholder="https://…" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <FL>Description</FL>
          <textarea value={f.description} onChange={set('description')} rows={4} style={{ ...inputSt, resize: 'vertical' }} placeholder="What will be covered…" />
        </div>

        <ErrBox msg={err} />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={backToList} disabled={busy} className="sd-btn"
            style={{ flex: '1 1 120px', padding: '12px', borderRadius: 9, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="sd-btn"
            style={{ flex: '2 1 200px', padding: '12px', borderRadius: 9, border: 'none', background: '#1e293b', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {busy ? 'Saving…' : (isCreate ? 'Create Session' : 'Save Changes')}
          </button>
        </div>
      </form>
    </Shell>
  );
};

export default SessionDetail;