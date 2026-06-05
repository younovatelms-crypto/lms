// src/pages/admin/CourseCurriculumEditor.jsx
// Edit a course's nested curriculum: Trimesters → Months → Subjects (S1–S4 hours).
//
// Route (mounted under /admin):
//     <Route path="courses/:id/edit" element={<CourseCurriculumEditor />} />
// Link to it from CourseDetail, e.g.:
//     <button onClick={() => navigate(`/admin/courses/${id}/edit`)}>✎ Edit Curriculum</button>
//
// HOW IT SAVES — no new slice code required:
//   The whole edited tree is held in local state; "Save" dispatches the EXISTING
//   updateCourse({ id, trimesters }) thunk → PUT /api/courses/:id. The backend
//   courseRoutes.js accepts `trimesters`, and updateCourse.fulfilled refreshes
//   state.courses.currentCourse, so CourseDetail reflects the change immediately.
//
//   (If you prefer per-item persistence instead of one Save, the backend also
//   exposes granular endpoints — POST/PUT/DELETE on trimesters/months/subjects —
//   but this editor uses the simpler atomic whole-tree PUT.)

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  fetchCourseById,
  updateCourse,
  selectCurrentCourse,
  selectCourseDetailStatus,
  selectCourseDetailError,
  selectCourseUpdateStatus,
  selectCourseUpdateError,
} from '../../features/admin/courseSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const SESSIONS = [
  { key: 's1Theory',     short: 'S1', label: 'Theory',     color: '#6366f1' },
  { key: 's2Practical',  short: 'S2', label: 'Practical',  color: '#0ea5e9' },
  { key: 's3Assignment', short: 'S3', label: 'Assignment', color: '#f59e0b' },
  { key: 's4Feedback',   short: 'S4', label: 'Feedback',   color: '#ec4899' },
];
const SUBJECT_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const TRI_ACCENTS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

let CID = 0;
const cid = () => `c${Date.now().toString(36)}${(CID++).toString(36)}`;
const emptyHours = () => ({ s1Theory: 0, s2Practical: 0, s3Assignment: 0, s4Feedback: 0 });
const subjectHours = (s) => SESSIONS.reduce((a, x) => a + (Number(s.hours?.[x.key]) || 0), 0);

// Map the server course → editable local tree (stable _cid keys for React).
const normalize = (course) =>
  (course?.trimesters || []).map((t) => ({
    _id: t._id, _cid: cid(),
    trimesterNumber: t.trimesterNumber,
    code: t.code || '', title: t.title || '', focus: t.focus || '',
    months: (t.months || []).map((m) => ({
      _id: m._id, _cid: cid(),
      monthNumber: m.monthNumber,
      code: m.code || '', name: m.name || '',
      subjects: (m.subjects || []).map((s) => ({
        _id: s._id, _cid: cid(),
        name: s.name || '', category: s.category || '', status: s.status || 'Not Started',
        hours: { ...emptyHours(), ...(s.hours || {}) },
      })),
    })),
  }));

// Strip client-only fields + coerce hours for the PUT payload.
const toPayload = (tris) =>
  tris.map((t) => ({
    ...(t._id ? { _id: t._id } : {}),
    ...(t.trimesterNumber != null ? { trimesterNumber: Number(t.trimesterNumber) } : {}),
    code: t.code || '', title: t.title || '', focus: t.focus || '',
    months: t.months.map((m) => ({
      ...(m._id ? { _id: m._id } : {}),
      ...(m.monthNumber != null ? { monthNumber: Number(m.monthNumber) } : {}),
      code: m.code || '', name: m.name || '',
      subjects: m.subjects.map((s) => ({
        ...(s._id ? { _id: s._id } : {}),
        name: s.name.trim(), category: s.category || '', status: s.status || 'Not Started',
        hours: {
          s1Theory: Number(s.hours.s1Theory) || 0,
          s2Practical: Number(s.hours.s2Practical) || 0,
          s3Assignment: Number(s.hours.s3Assignment) || 0,
          s4Feedback: Number(s.hours.s4Feedback) || 0,
        },
      })),
    })),
  }));

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .ce-btn { transition:opacity .15s,transform .15s,box-shadow .15s,background .15s; cursor:pointer; border:none; font-family:inherit; }
  .ce-btn:hover:not(:disabled) { transform:translateY(-1px); }
  .ce-btn:disabled { opacity:.55; cursor:not-allowed; }
  .ce-ghost { background:#fff; border:1.5px solid #e2e8f0; color:#475569; }
  .ce-ghost:hover { background:#f8fafc; }
  .ce-in { width:100%; border:1.5px solid #e2e8f0; border-radius:8px; padding:8px 11px; font-size:0.85rem;
           color:#0f172a; background:#fff; font-family:inherit; transition:border-color .15s,box-shadow .15s; }
  .ce-in:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
  .ce-hr { width:100%; text-align:center; font-family:'DM Mono',monospace; }
  .ce-del { background:#fff5f5; color:#dc2626; border:1px solid #fecaca; border-radius:8px; cursor:pointer;
            font-size:0.78rem; font-weight:600; padding:6px 10px; transition:background .15s; font-family:inherit; }
  .ce-del:hover { background:#fee2e2; }
  .subj-grid { display:grid; grid-template-columns:2fr 1.3fr 1.2fr repeat(4,.8fr) .7fr auto; gap:8px; align-items:center; }
  .subj-lbl { display:none; }
  @media (max-width:820px) {
    .subj-grid { grid-template-columns:1fr 1fr; gap:8px 10px; padding:12px; border:1px solid #eef2f7; border-radius:10px; }
    .subj-grid > .subj-span { grid-column:1 / -1; }
    .subj-lbl { display:block; font-size:0.6rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.4px; margin-bottom:3px; }
    .subj-head { display:none !important; }
  }
  @media (max-width:560px) { .stat-strip { grid-template-columns:repeat(2,1fr) !important; } }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
    <div style={{ width:26, height:26, borderRadius:'50%', border:'2.5px solid #e2e8f0',
      borderTopColor:'#6366f1', animation:'spin .7s linear infinite' }} />
  </div>
);

const Field = ({ label, ...p }) => (
  <div>
    {label && <div style={{ fontSize:'0.66rem', fontWeight:700, color:'#94a3b8',
      textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>{label}</div>}
    <input className="ce-in" {...p} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const CourseCurriculumEditor = ({ courseId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const params   = useParams();
  const id       = courseId || params.id;

  const course       = useSelector(selectCurrentCourse);
  const detailStatus = useSelector(selectCourseDetailStatus);
  const detailError  = useSelector(selectCourseDetailError);
  const saveStatus   = useSelector(selectCourseUpdateStatus);
  const saveError    = useSelector(selectCourseUpdateError);
  const saving       = saveStatus === 'loading';

  const [tris, setTris] = useState([]);
  const [dirty, setDirty] = useState(false);

  // Load the course if it isn't the one in the store yet.
  useEffect(() => {
    if (id && (!course || (course._id !== id && course.id !== id))) dispatch(fetchCourseById(id));
  }, [dispatch, id, course]);

  // Seed local state once the right course is in the store.
  useEffect(() => {
    if (course && (course._id === id || course.id === id)) {
      setTris(normalize(course));
      setDirty(false);
    }
  }, [course, id]);

  // ── immutable updaters ────────────────────────────────────────────────────────
  const touch = () => setDirty(true);
  const editTri = (ti, patch) => { touch(); setTris((p) => p.map((t, i) => (i === ti ? { ...t, ...patch } : t))); };
  const editMonth = (ti, mi, patch) => { touch(); setTris((p) => p.map((t, i) =>
    i !== ti ? t : { ...t, months: t.months.map((m, j) => (j === mi ? { ...m, ...patch } : m)) })); };
  const editSubj = (ti, mi, si, patch) => { touch(); setTris((p) => p.map((t, i) =>
    i !== ti ? t : { ...t, months: t.months.map((m, j) =>
      j !== mi ? m : { ...m, subjects: m.subjects.map((s, k) => (k === si ? { ...s, ...patch } : s)) }) })); };
  const editHour = (ti, mi, si, key, val) => { touch(); setTris((p) => p.map((t, i) =>
    i !== ti ? t : { ...t, months: t.months.map((m, j) =>
      j !== mi ? m : { ...m, subjects: m.subjects.map((s, k) =>
        k !== si ? s : { ...s, hours: { ...s.hours, [key]: val } }) }) })); };

  const addTrimester = () => { touch(); setTris((p) => [...p, {
    _cid: cid(), trimesterNumber: p.length + 1, code: `T${p.length + 1}`, title: '', focus: '', months: [],
  }]); };
  const removeTrimester = (ti) => {
    if (!window.confirm('Delete this trimester and everything in it?')) return;
    touch(); setTris((p) => p.filter((_, i) => i !== ti));
  };
  const addMonth = (ti) => { touch(); setTris((p) => p.map((t, i) => {
    if (i !== ti) return t;
    const n = t.months.length + 1;
    return { ...t, months: [...t.months, { _cid: cid(), monthNumber: n, code: `M${n}`, name: '', subjects: [] }] };
  })); };
  const removeMonth = (ti, mi) => {
    if (!window.confirm('Delete this month and its subjects?')) return;
    touch(); setTris((p) => p.map((t, i) => (i !== ti ? t : { ...t, months: t.months.filter((_, j) => j !== mi) })));
  };
  const addSubject = (ti, mi) => { touch(); setTris((p) => p.map((t, i) =>
    i !== ti ? t : { ...t, months: t.months.map((m, j) =>
      j !== mi ? m : { ...m, subjects: [...m.subjects, {
        _cid: cid(), name: '', category: '', status: 'Not Started', hours: emptyHours(),
      }] }) })); };
  const removeSubject = (ti, mi, si) => { touch(); setTris((p) => p.map((t, i) =>
    i !== ti ? t : { ...t, months: t.months.map((m, j) =>
      j !== mi ? m : { ...m, subjects: m.subjects.filter((_, k) => k !== si) }) })); };

  // ── totals ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const h = emptyHours();
    let months = 0, subjects = 0;
    tris.forEach((t) => {
      months += t.months.length;
      t.months.forEach((m) => m.subjects.forEach((s) => {
        subjects += 1;
        SESSIONS.forEach((x) => { h[x.key] += Number(s.hours[x.key]) || 0; });
      }));
    });
    const total = SESSIONS.reduce((a, x) => a + h[x.key], 0);
    return { trimesters: tris.length, months, subjects, total, h };
  }, [tris]);

  // ── save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // validate: every subject needs a name
    for (const t of tris) for (const m of t.months) for (const s of m.subjects) {
      if (!s.name.trim()) { toast.error('Every subject needs a name before saving.'); return; }
    }
    const result = await dispatch(updateCourse({ id, trimesters: toPayload(tris) }));
    if (updateCourse.fulfilled.match(result)) {
      toast.success('Curriculum saved');
      setDirty(false);
    } else {
      toast.error(saveError || 'Save failed');
    }
  };

  const handleReset = () => {
    if (dirty && !window.confirm('Discard all unsaved changes?')) return;
    setTris(normalize(course));
    setDirty(false);
  };

  // ── wrap / states ───────────────────────────────────────────────────────────
  const wrap = (children) => (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>
      <div style={{ maxWidth:1120, margin:'0 auto', padding:'24px 20px 80px' }}>{children}</div>
    </div>
  );

  if (detailStatus === 'loading' && !course) return wrap(<Spinner />);
  if (detailStatus === 'failed' && !course)
    return wrap(<div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
      padding:'14px 16px', color:'#b91c1c', fontSize:'0.85rem' }}>⚠️ {detailError || 'Failed to load course.'}</div>);
  if (!course) return wrap(<div style={{ color:'#94a3b8', textAlign:'center', padding:60 }}>No course found.</div>);

  return wrap(
    <>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        flexWrap:'wrap', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
          <button className="ce-btn ce-ghost" onClick={() => navigate(-1)}
            style={{ borderRadius:9, padding:'9px 15px', fontSize:'0.82rem', fontWeight:600 }}>← Back</button>
          <div style={{ minWidth:0 }}>
            <h1 style={{ fontSize:'1.25rem', fontWeight:800, letterSpacing:'-0.3px', margin:0,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              Edit Curriculum
            </h1>
            <div style={{ fontSize:'0.8rem', color:'#64748b' }}>{course.name} · {course.code}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="ce-btn ce-ghost" onClick={handleReset} disabled={saving || !dirty}
            style={{ borderRadius:9, padding:'9px 16px', fontSize:'0.82rem', fontWeight:600 }}>Reset</button>
          <button className="ce-btn" onClick={handleSave} disabled={saving}
            style={{ borderRadius:9, padding:'10px 22px', fontSize:'0.84rem', fontWeight:700, color:'#fff',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              boxShadow:'0 2px 8px rgba(99,102,241,.35)' }}>
            {saving ? 'Saving…' : dirty ? '● Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Live totals */}
      <div className="stat-strip" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:14 }}>
        {[
          { label:'Trimesters', value:totals.trimesters, color:'#6366f1', bg:'#eef2ff' },
          { label:'Months',     value:totals.months,     color:'#0ea5e9', bg:'#e0f2fe' },
          { label:'Subjects',   value:totals.subjects,   color:'#10b981', bg:'#dcfce7' },
          { label:'Total Hrs',  value:totals.total,      color:'#f59e0b', bg:'#fef3c7' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
            padding:'13px 15px', display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ minWidth:40, height:40, padding:'0 8px', borderRadius:10, background:bg, color,
              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800,
              fontSize:'1.05rem', fontFamily:'DM Mono,monospace' }}>{value}</div>
            <div style={{ fontSize:'0.72rem', fontWeight:600, color:'#64748b', textTransform:'uppercase',
              letterSpacing:'0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Session totals bar */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
        {SESSIONS.map((s) => (
          <span key={s.key} style={{ display:'inline-flex', alignItems:'center', gap:6, background:`${s.color}0f`,
            border:`1px solid ${s.color}33`, borderRadius:99, padding:'4px 12px', fontSize:'0.76rem', fontWeight:600, color:s.color }}>
            {s.short} {s.label}: {totals.h[s.key]}h
          </span>
        ))}
      </div>

      {/* Trimesters */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {tris.map((t, ti) => {
          const accent = TRI_ACCENTS[ti % TRI_ACCENTS.length];
          return (
            <div key={t._cid} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
              overflow:'hidden', animation:'fadeUp .25s ease' }}>
              <div style={{ height:3, background:accent }} />
              <div style={{ padding:'16px 18px' }}>
                {/* Trimester header */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                  <div style={{ width:84 }}>
                    <Field label="Code" value={t.code} placeholder="T1"
                      onChange={(e) => editTri(ti, { code: e.target.value })} />
                  </div>
                  <div style={{ flex:'2 1 220px' }}>
                    <Field label="Trimester title" value={t.title} placeholder="Engineering Foundations"
                      onChange={(e) => editTri(ti, { title: e.target.value })} />
                  </div>
                  <div style={{ flex:'3 1 260px' }}>
                    <Field label="Focus" value={t.focus} placeholder="HTML/CSS/JS, PHP & OOP, MySQL…"
                      onChange={(e) => editTri(ti, { focus: e.target.value })} />
                  </div>
                  <button className="ce-del" onClick={() => removeTrimester(ti)}>🗑 Trimester</button>
                </div>

                {/* Months */}
                <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:12 }}>
                  {t.months.map((m, mi) => {
                    const mHours = m.subjects.reduce((a, s) => a + subjectHours(s), 0);
                    return (
                      <div key={m._cid} style={{ border:'1px solid #eef2f7', borderRadius:11, background:'#fcfcfd' }}>
                        <div style={{ display:'flex', alignItems:'flex-end', gap:10, flexWrap:'wrap', padding:'12px 14px' }}>
                          <div style={{ width:80 }}>
                            <Field label="Code" value={m.code} placeholder="M1"
                              onChange={(e) => editMonth(ti, mi, { code: e.target.value })} />
                          </div>
                          <div style={{ flex:'3 1 240px' }}>
                            <Field label="Month name" value={m.name} placeholder="Programming Fundamentals"
                              onChange={(e) => editMonth(ti, mi, { name: e.target.value })} />
                          </div>
                          <div style={{ fontSize:'0.78rem', color:'#94a3b8', fontWeight:600, paddingBottom:9 }}>
                            {m.subjects.length} subj · {mHours}h
                          </div>
                          <button className="ce-del" onClick={() => removeMonth(ti, mi)}>🗑 Month</button>
                        </div>

                        {/* Subjects */}
                        <div style={{ padding:'0 14px 14px' }}>
                          {/* header (desktop) */}
                          {m.subjects.length > 0 && (
                            <div className="subj-grid subj-head" style={{ padding:'0 0 6px' }}>
                              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px' }}>Subject</div>
                              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px' }}>Category</div>
                              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px' }}>Status</div>
                              {SESSIONS.map((s) => (
                                <div key={s.key} style={{ fontSize:'0.62rem', fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'.4px', textAlign:'center' }}>{s.short}</div>
                              ))}
                              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', textAlign:'center' }}>Total</div>
                              <div />
                            </div>
                          )}

                          {m.subjects.map((s, si) => (
                            <div key={s._cid} className="subj-grid" style={{ padding:'6px 0', borderTop:'1px solid #f4f6f9' }}>
                              <div className="subj-span">
                                <span className="subj-lbl">Subject</span>
                                <input className="ce-in" value={s.name} placeholder="Subject name"
                                  onChange={(e) => editSubj(ti, mi, si, { name: e.target.value })} />
                              </div>
                              <div>
                                <span className="subj-lbl">Category</span>
                                <input className="ce-in" value={s.category} placeholder="Web / API…"
                                  onChange={(e) => editSubj(ti, mi, si, { category: e.target.value })} />
                              </div>
                              <div>
                                <span className="subj-lbl">Status</span>
                                <select className="ce-in" value={s.status}
                                  onChange={(e) => editSubj(ti, mi, si, { status: e.target.value })}>
                                  {SUBJECT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                                </select>
                              </div>
                              {SESSIONS.map((x) => (
                                <div key={x.key}>
                                  <span className="subj-lbl" style={{ color:x.color }}>{x.short}</span>
                                  <input className="ce-in ce-hr" type="number" min="0" value={s.hours[x.key]}
                                    onChange={(e) => editHour(ti, mi, si, x.key, e.target.value === '' ? 0 : Number(e.target.value))}
                                    style={{ borderColor:`${x.color}55` }} />
                                </div>
                              ))}
                              <div style={{ textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700,
                                fontSize:'0.82rem', color:'#0f172a' }}>
                                <span className="subj-lbl">Total</span>{subjectHours(s)}h
                              </div>
                              <div style={{ textAlign:'right' }}>
                                <button className="ce-del" title="Remove subject"
                                  onClick={() => removeSubject(ti, mi, si)} style={{ padding:'6px 9px' }}>✕</button>
                              </div>
                            </div>
                          ))}

                          <button className="ce-btn ce-ghost" onClick={() => addSubject(ti, mi)}
                            style={{ marginTop:10, borderRadius:8, padding:'7px 13px', fontSize:'0.76rem', fontWeight:600 }}>
                            + Add subject
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button className="ce-btn ce-ghost" onClick={() => addMonth(ti)}
                    style={{ alignSelf:'flex-start', borderRadius:8, padding:'8px 14px', fontSize:'0.78rem', fontWeight:600 }}>
                    + Add month
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button className="ce-btn" onClick={addTrimester}
          style={{ alignSelf:'flex-start', borderRadius:10, padding:'11px 20px', fontSize:'0.84rem', fontWeight:700,
            color:'#fff', background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 2px 8px rgba(16,185,129,.3)' }}>
          + Add trimester
        </button>

        {tris.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:'2.4rem', marginBottom:10 }}>🧱</div>
            No curriculum yet — click <b>“Add trimester”</b> to start building.
          </div>
        )}
      </div>

      {saveError && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, marginTop:18,
          padding:'10px 14px', fontSize:'0.8rem', color:'#b91c1c' }}>⚠️ {saveError}</div>
      )}
    </>
  );
};

export default CourseCurriculumEditor;