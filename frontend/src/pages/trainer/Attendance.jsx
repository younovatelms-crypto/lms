// src/pages/trainer/Attendance.jsx
// Matches screenshot exactly:
// - Session selector (dropdown of trainer's sessions)
// - Mark Attendance table: TRAINEE | ATTENDANCE % (bar) | TODAY (P/A/L radio) | RISK | OVERRIDE REASON
// - Mark All Present button
// - Submit Attendance button (POST http://localhost:8088/api/attendance/mark per trainee)
// - At-risk alert banner for trainees below 80%
// All data from trainerSlice via Redux

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import {
  fetchTrainerSessions,
  fetchTrainerStudents,
  fetchSessionAttendance,
  markAttendance,
  selectTrainerSessions,
  selectSessionsStatus,
  selectTrainerStudents,
  selectStudentsStatus,
  selectAttendance,
  selectAttendanceStatus,
  selectMarkStatus,
  selectMarkError,
} from '../../features/Trainer/trainerSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const fmtSession = (s) => {
  if (!s) return '';
  const d   = s.scheduledAt ? new Date(s.scheduledAt) : null;
  const dt  = d ? d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) + ' · ' +
                  d.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }) : '';
  const mod = s.moduleId || s.lmsModuleId || s.title || 'Session';
  const bat = s.batchId?.name || '';
  return [mod, bat, dt].filter(Boolean).join(' · ');
};

// Bar colour by percentage
const barColor = (pct) =>
  pct >= 85 ? '#16a34a' :
  pct >= 75 ? '#f59e0b' : '#dc2626';

const RISK_THRESHOLD = 80;

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
  body { font-family:'Inter',system-ui,sans-serif; background:#f8fafc; }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes barGrow { from{width:0} to{width:var(--w)} }

  .att-row { transition:background .12s; }
  .att-row:hover { background:#fafbff !important; }
  .radio-label { display:inline-flex; align-items:center; gap:4px; cursor:pointer;
    font-size:0.82rem; font-weight:600; color:#374151; user-select:none; }
  .radio-label input[type=radio] { accent-color:#6366f1; width:15px; height:15px; cursor:pointer; }
  .reason-input { border:1px solid #e2e8f0; border-radius:7px; padding:6px 10px;
    font-size:0.78rem; color:#374151; width:100%; outline:none; font-family:inherit;
    transition:border-color .15s; }
  .reason-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
  .mark-all-btn { transition:background .15s,transform .15s; }
  .mark-all-btn:hover { background:#f1f5f9 !important; }
  .submit-btn { transition:opacity .15s,transform .15s; }
  .submit-btn:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
  .submit-btn:disabled { opacity:.5; cursor:not-allowed; }
  select.sess-sel:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }

  @media (max-width:768px) {
    .att-table th:nth-child(2),
    .att-table td:nth-child(2) { display:none; }
  }
  @media (max-width:580px) {
    .att-header-row { flex-direction:column !important; align-items:flex-start !important; }
    .att-btn-row { flex-direction:column !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// SPINNER + EMPTY
// ═══════════════════════════════════════════════════════════════════════════════

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
    <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #e2e8f0',
      borderTopColor:'#6366f1', animation:'spin .7s linear infinite' }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE BAR
// Matches screenshot: coloured bar + percentage text
// ═══════════════════════════════════════════════════════════════════════════════

const AttBar = ({ pct }) => {
  const color = barColor(pct);
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:7, background:'#e2e8f0', borderRadius:4, overflow:'hidden', minWidth:80 }}>
        <div style={{
          height:'100%', width:`${w}%`, background:color, borderRadius:4,
          '--w': `${w}%`, animation:'barGrow .5s ease',
        }} />
      </div>
      <span style={{ fontSize:'0.82rem', fontWeight:600, color, minWidth:34, textAlign:'right' }}>
        {pct}%
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// RISK BADGE
// ═══════════════════════════════════════════════════════════════════════════════

const RiskBadge = () => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4,
    background:'#fef3c7', color:'#d97706', border:'1px solid #fde68a',
    fontSize:'0.7rem', fontWeight:700, padding:'3px 9px', borderRadius:99 }}>
    ⚠ Risk
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TrainerAttendance = () => {
  const dispatch = useDispatch();

  // ── Redux state ──────────────────────────────────────────────────────────────
  const sessions      = useSelector(selectTrainerSessions);
  const sessStatus    = useSelector(selectSessionsStatus);
  const students      = useSelector(selectTrainerStudents);
  const stuStatus     = useSelector(selectStudentsStatus);
  const allAttendance = useSelector(selectAttendance);
  const attStatus     = useSelector(selectAttendanceStatus);
  const markStatus    = useSelector(selectMarkStatus);
  const markError     = useSelector(selectMarkError);

  // ── Local state ──────────────────────────────────────────────────────────────
  const [selectedSessionId, setSelectedSessionId] = useState('');
  // marks: { [traineeId]: 'P' | 'A' | 'L' }
  const [marks,   setMarks]   = useState({});
  // reasons: { [traineeId]: string }  — shown when status = 'A'
  const [reasons, setReasons] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch sessions + students on mount ───────────────────────────────────────
  useEffect(() => {
    dispatch(fetchTrainerSessions());
    dispatch(fetchTrainerStudents());
  }, [dispatch]);

  // ── Auto-select first session ─────────────────────────────────────────────
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0]._id);
    }
  }, [sessions]);

  // ── When session changes — load existing attendance + reset marks ──────────
  useEffect(() => {
    if (!selectedSessionId) return;

    // Fetch existing attendance records for this session
    dispatch(fetchSessionAttendance(selectedSessionId));

    // Reset local marks
    setMarks({});
    setReasons({});
  }, [selectedSessionId, dispatch]);

  // ── When attendance loads — pre-fill marks from existing records ─────────
  useEffect(() => {
    const att = allAttendance[selectedSessionId];
    if (!att) return;

    // API response: { records: [{ trainee:{_id,name,email}, status, markedAt }] }
    const records = att?.records || att?.data?.records || [];
    if (records.length === 0) return;

    const preMarks = {};
    records.forEach(r => {
      const id = r.trainee?._id || r.traineeId;
      if (!id) return;
      const st = r.status === 'present' ? 'P' : r.status === 'absent' ? 'A' : 'L';
      preMarks[id] = st;
    });
    if (Object.keys(preMarks).length > 0) {
      setMarks(preMarks);
    }
  }, [allAttendance, selectedSessionId]);

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedSession = sessions.find(s => s._id === selectedSessionId);

  // Filter students to those in the session's batch
  const sessionBatchId = selectedSession?.batchId?._id || selectedSession?.batchId;
  const sessionStudents = students.filter(st => {
    const bid = st.batchId?._id || st.batchId;
    return !sessionBatchId || bid === sessionBatchId;
  });

  // Students at risk (below threshold AND marked A today, or already low attendance)
  const atRiskStudents = sessionStudents.filter(st => {
    const pct = st.attendance ?? st.averageAttendance ?? 0;
    return pct < RISK_THRESHOLD;
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const setMark = (traineeId, val) => {
    setMarks(m => ({ ...m, [traineeId]: val }));
    if (val !== 'A') setReasons(r => { const n = { ...r }; delete n[traineeId]; return n; });
  };

  const markAllPresent = () => {
    const all = {};
    sessionStudents.forEach(st => { all[st._id] = 'P'; });
    setMarks(all);
    setReasons({});
  };

  // ── Submit — POST http://localhost:8088/api/attendance/mark per trainee ────
  const handleSubmit = async () => {
    if (!selectedSessionId || sessionStudents.length === 0) return;

    setSubmitting(true);
    let errors = 0;

    for (const st of sessionStudents) {
      const status = marks[st._id] || 'P';
      // API body: { sessionId, traineeId, status: 'present'|'absent'|'late' }
      const result = await dispatch(markAttendance({
        sessionId: selectedSessionId,
        traineeId: st._id,
        status:    status === 'P' ? 'present' : status === 'A' ? 'absent' : 'late',
        reason:    reasons[st._id] || '',
      }));
      if (markAttendance.rejected.match(result)) errors++;
    }

    setSubmitting(false);
    if (errors === 0) {
      toast.success('Attendance submitted successfully!');
      dispatch(fetchSessionAttendance(selectedSessionId));
    } else {
      toast.error(`${errors} record(s) failed to save`);
    }
  };

  const attLoading   = attStatus[selectedSessionId] === 'loading';
  const isSubmitting = submitting || markStatus === 'loading';

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'Inter',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom:24, animation:'fadeUp .3s ease' }}>
          <h1 style={{ fontSize:'1.55rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.4px', marginBottom:5 }}>
            Mark Attendance
          </h1>

          {/* Session info line — "Session: M4-LMS-03 · YBLP-B08 · 27 May 2026 · 10:00 AM" */}
          {selectedSession && (
            <p style={{ fontSize:'0.84rem', color:'#64748b' }}>
              Session: {fmtSession(selectedSession)}
            </p>
          )}
        </div>

        {/* ── SESSION SELECTOR ── */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'#374151', marginBottom:6 }}>
            Select Session
          </label>
          {sessStatus === 'loading' ? <Spinner /> : (
            <div style={{ position:'relative', maxWidth:480 }}>
              <select
                className="sess-sel"
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9, padding:'10px 36px 10px 12px',
                  fontSize:'0.85rem', color:'#0f172a', background:'#fff', appearance:'none',
                  WebkitAppearance:'none', cursor:'pointer', fontFamily:'inherit' }}
              >
                <option value="" disabled>— Select a session —</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>{fmtSession(s)}</option>
                ))}
              </select>
              <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', color:'#94a3b8', fontSize:'0.75rem' }}>▾</span>
            </div>
          )}
        </div>

        {/* ── MAIN ATTENDANCE TABLE ── */}
        {selectedSessionId && (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
            boxShadow:'0 1px 8px rgba(15,23,42,.06)', overflow:'hidden', animation:'fadeUp .3s ease' }}>

            {/* ── ACTION BAR — "Mark All Present" + "Submit Attendance" ── */}
            <div className="att-btn-row" style={{ display:'flex', alignItems:'center',
              justifyContent:'space-between', padding:'14px 20px',
              borderBottom:'1px solid #f1f5f9', flexWrap:'wrap', gap:10 }}>
              <button
                className="mark-all-btn"
                onClick={markAllPresent}
                disabled={sessionStudents.length === 0}
                style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #e2e8f0',
                  background:'#fff', color:'#374151', fontWeight:600, fontSize:'0.82rem',
                  cursor:'pointer', fontFamily:'inherit' }}
              >
                Mark All Present
              </button>

              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || sessionStudents.length === 0}
                style={{ padding:'9px 22px', borderRadius:9, border:'none',
                  background: isSubmitting ? '#94a3b8' : '#1e293b',
                  color:'#fff', fontWeight:700, fontSize:'0.85rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Attendance'}
              </button>
            </div>

            {/* ── TABLE ── */}
            {attLoading || stuStatus === 'loading' ? <Spinner /> : (
              <div style={{ overflowX:'auto' }}>
                <table className="att-table" style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1.5px solid #f1f5f9' }}>
                      {['TRAINEE', 'ATTENDANCE %', 'TODAY', 'RISK', 'OVERRIDE REASON'].map(h => (
                        <th key={h} style={{ padding:'11px 16px', textAlign:'left',
                          fontSize:'0.68rem', fontWeight:700, color:'#94a3b8',
                          textTransform:'uppercase', letterSpacing:'0.7px', whiteSpace:'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding:'40px 20px', textAlign:'center', color:'#94a3b8', fontSize:'0.85rem' }}>
                          No students found for this session's batch.
                        </td>
                      </tr>
                    ) : sessionStudents.map((st, i) => {
                      const pct      = st.attendance ?? st.averageAttendance ?? 0;
                      const mark     = marks[st._id] || 'P';
                      const isRisk   = pct < RISK_THRESHOLD;
                      const isAbsent = mark === 'A';

                      return (
                        <tr key={st._id} className="att-row"
                          style={{ borderBottom: i < sessionStudents.length - 1 ? '1px solid #f8fafc' : 'none',
                            background: isAbsent ? '#fefce8' : '#fff' }}>

                          {/* TRAINEE */}
                          <td style={{ padding:'14px 16px', minWidth:140 }}>
                            <div style={{ fontWeight:600, fontSize:'0.88rem', color:'#0f172a' }}>
                              {st.name}
                            </div>
                            <div style={{ fontSize:'0.71rem', color:'#94a3b8', marginTop:2 }}>
                              {st.email}
                            </div>
                          </td>

                          {/* ATTENDANCE % bar */}
                          <td style={{ padding:'14px 16px', minWidth:160 }}>
                            <AttBar pct={Number(pct)} />
                          </td>

                          {/* TODAY — P / A / L radio buttons */}
                          <td style={{ padding:'14px 16px', whiteSpace:'nowrap' }}>
                            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                              {[
                                { val:'P', label:'P' },
                                { val:'A', label:'A' },
                                { val:'L', label:'L' },
                              ].map(({ val, label }) => (
                                <label key={val} className="radio-label">
                                  <input
                                    type="radio"
                                    name={`att-${st._id}`}
                                    value={val}
                                    checked={mark === val}
                                    onChange={() => setMark(st._id, val)}
                                  />
                                  {label}
                                </label>
                              ))}
                            </div>
                          </td>

                          {/* RISK */}
                          <td style={{ padding:'14px 16px', minWidth:80 }}>
                            {isRisk && <RiskBadge />}
                          </td>

                          {/* OVERRIDE REASON — only shown when Absent */}
                          <td style={{ padding:'14px 16px', minWidth:200 }}>
                            {isAbsent && (
                              <input
                                className="reason-input"
                                placeholder="Reason for absence…"
                                value={reasons[st._id] || ''}
                                onChange={e => setReasons(r => ({ ...r, [st._id]: e.target.value }))}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* No session selected */}
        {!selectedSessionId && sessStatus === 'succeeded' && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📋</div>
            <div style={{ fontWeight:600, fontSize:'0.92rem' }}>Select a session to mark attendance</div>
          </div>
        )}

        {/* ── AT-RISK ALERT BANNER ── */}
        {/* "Dinesh Kumar is below 80% attendance threshold. Risk flag will be auto-raised on submission." */}
        {selectedSessionId && atRiskStudents.length > 0 && (
          <div style={{ marginTop:16, background:'#fffbeb', border:'1px solid #fde68a',
            borderRadius:10, padding:'13px 16px', animation:'fadeUp .3s ease' }}>
            {atRiskStudents.map(st => (
              <div key={st._id} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:4 }}>
                <span style={{ color:'#d97706', flexShrink:0 }}>⚠</span>
                <span style={{ fontSize:'0.82rem', color:'#92400e', lineHeight:1.55 }}>
                  <strong style={{ color:'#78350f' }}>{st.name}</strong>
                  {' '}is below {RISK_THRESHOLD}% attendance threshold.
                  Risk flag will be auto-raised on submission.
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mark error */}
        {markError && (
          <div style={{ marginTop:12, background:'#fef2f2', border:'1px solid #fecaca',
            borderRadius:8, padding:'10px 14px', fontSize:'0.79rem', color:'#b91c1c' }}>
            ⚠️ {markError}
          </div>
        )}

      </div>
    </div>
  );
};

export default TrainerAttendance;