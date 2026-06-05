// src/pages/admin/CourseDetail.jsx
// Admin read view for a single Course — shows the FULL curriculum hierarchy:
//   Course → Trimesters (T1–T3) → Months (M1–M9) → Subjects (S1–S4 hours)
//
// Features:
//   • Interactive accordion (expand/collapse trimesters & months)
//   • Live roll-up totals (computed client-side from nested data)
//   • S1–S4 session hour breakdown with a proportional bar
//   • One-click "Export to Excel" (.xlsx) using SheetJS
//   • Fully mobile-responsive (tables collapse to cards under 720px)
//
// Data via Redux: courseSlice → fetchCourseById / selectCurrentCourse
//
// DEPENDENCY:  npm install xlsx
// ROUTE:       <Route path="/admin/courses/:id" element={<CourseDetail />} />
//              (or pass a `courseId` prop directly)

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

import {
  fetchCourseById,
  selectCurrentCourse,
  selectCurrentBatches,
  selectCourseDetailStatus,
  selectCourseDetailError,   // ← add this selector to courseSlice (see notes)
} from '../../features/admin/courseSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
  draft:    { bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
  active:   { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  archived: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
};

const LEVEL_COLORS = {
  beginner:     { bg: '#eff6ff', color: '#1d4ed8' },
  intermediate: { bg: '#fef9c3', color: '#92400e' },
  advanced:     { bg: '#fdf2f8', color: '#86198f' },
};

const SUBJECT_STATUS_COLORS = {
  'Not Started': { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' },
  'In Progress': { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  'Completed':   { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
};

// The four session columns (S1–S4) — order, label, accent colour.
const SESSIONS = [
  { key: 's1Theory',     short: 'S1', label: 'Theory',     color: '#6366f1' },
  { key: 's2Practical',  short: 'S2', label: 'Practical',  color: '#0ea5e9' },
  { key: 's3Assignment', short: 'S3', label: 'Assignment', color: '#f59e0b' },
  { key: 's4Feedback',   short: 'S4', label: 'Feedback',   color: '#ec4899' },
];

const TRI_ACCENTS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const fmtDuration = (value, unit = 'week') => {
  const n = Number(value);
  if (!n) return '—';
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
};

// ── Hour roll-up helpers (mirror the backend virtuals) ──────────────────────────
const emptyHours = () => ({ total: 0, s1Theory: 0, s2Practical: 0, s3Assignment: 0, s4Feedback: 0 });

const addHours = (acc, h = {}) => ({
  total:        acc.total        + (h.total        || 0),
  s1Theory:     acc.s1Theory     + (h.s1Theory     || 0),
  s2Practical:  acc.s2Practical  + (h.s2Practical  || 0),
  s3Assignment: acc.s3Assignment + (h.s3Assignment || 0),
  s4Feedback:   acc.s4Feedback   + (h.s4Feedback   || 0),
});

const monthHours      = (m) => (m.subjects || []).reduce((a, s) => addHours(a, s.hours), emptyHours());
const trimesterHours  = (t) => (t.months   || []).reduce((a, m) => addHours(a, monthHours(m)), emptyHours());
const courseHours     = (c) => (c.trimesters || []).reduce((a, t) => addHours(a, trimesterHours(t)), emptyHours());

// Flat one-row-per-subject matrix used for the Excel export.
const buildMatrix = (course) => {
  const rows = [];
  (course.trimesters || []).forEach((t) => {
    (t.months || []).forEach((m) => {
      (m.subjects || []).forEach((s) => {
        const h = s.hours || {};
        rows.push({
          Trimester:      t.code || `T${t.trimesterNumber}`,
          'Trimester Title': t.title || '',
          Month:          m.code || `M${m.monthNumber}`,
          'Month Name':   m.name || '',
          Subject:        s.name || '',
          Category:       s.category || '',
          'S1 Theory':    h.s1Theory     || 0,
          'S2 Practical': h.s2Practical  || 0,
          'S3 Assignment':h.s3Assignment || 0,
          'S4 Feedback':  h.s4Feedback   || 0,
          'Total Hours':  h.total        || 0,
          Status:         s.status || 'Not Started',
        });
      });
    });
  });
  return rows;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }

  .cd-btn   { transition:opacity .15s,transform .15s,box-shadow .15s; cursor:pointer; }
  .cd-btn:hover:not(:disabled) { transform:translateY(-1px); }
  .cd-btn:disabled { opacity:.55; cursor:not-allowed; }
  .cd-tri   { transition:box-shadow .18s; }
  .cd-tri:hover { box-shadow:0 6px 22px rgba(15,23,42,.10); }
  .cd-head  { transition:background .15s; cursor:pointer; }
  .cd-head:hover { background:#f8fafc; }
  .cd-chev  { transition:transform .2s; }
  .cd-chev.open { transform:rotate(90deg); }

  /* Subject table → cards on small screens */
  .subj-row { display:grid; grid-template-columns: 2.4fr repeat(4, .8fr) .9fr 1fr; align-items:center;
              gap:8px; padding:11px 14px; border-top:1px solid #f1f5f9; }
  .subj-head { font-size:.66rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.4px; }
  .subj-cell-label { display:none; }

  @media (max-width:720px) {
    .subj-head { display:none; }
    .subj-row { grid-template-columns: 1fr 1fr; padding:14px; gap:6px 12px; }
    .subj-row .subj-name { grid-column:1 / -1; }
    .subj-cell-label { display:inline; font-size:.62rem; font-weight:700; color:#94a3b8;
                       text-transform:uppercase; letter-spacing:.4px; margin-right:6px; }
  }
  @media (max-width:560px) {
    .stats-grid { grid-template-columns:repeat(2,1fr) !important; }
    .sess-grid  { grid-template-columns:repeat(2,1fr) !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const Pill = ({ label, colorMap }) => {
  const c = colorMap[label] || { bg: '#f1f5f9', color: '#374151', dot: '#94a3b8' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:c.bg,
      color:c.color, fontSize:'0.7rem', fontWeight:600, padding:'3px 10px', borderRadius:99,
      textTransform:'capitalize' }}>
      {c.dot && <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }} />}
      {label}
    </span>
  );
};

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
    <div style={{ width:26, height:26, borderRadius:'50%', border:'2.5px solid #e2e8f0',
      borderTopColor:'#6366f1', animation:'spin .7s linear infinite' }} />
  </div>
);

// ── Subject row (responsive) ────────────────────────────────────────────────────
const SubjectRow = ({ subject }) => {
  const h = subject.hours || {};
  const sc = SUBJECT_STATUS_COLORS[subject.status] || SUBJECT_STATUS_COLORS['Not Started'];
  return (
    <div className="subj-row">
      <div className="subj-name">
        <div style={{ fontWeight:600, fontSize:'0.84rem', color:'#0f172a' }}>{subject.name}</div>
        {subject.category && (
          <div style={{ fontSize:'0.7rem', color:'#94a3b8', marginTop:2 }}>{subject.category}</div>
        )}
      </div>
      {SESSIONS.map((s) => (
        <div key={s.key} style={{ fontFamily:'DM Mono, monospace', fontSize:'0.8rem',
          color: (h[s.key] || 0) ? s.color : '#cbd5e1', fontWeight:600 }}>
          <span className="subj-cell-label">{s.short}</span>{h[s.key] || 0}
        </div>
      ))}
      <div style={{ fontFamily:'DM Mono, monospace', fontWeight:700, fontSize:'0.82rem', color:'#0f172a' }}>
        <span className="subj-cell-label">Total</span>{h.total || 0}h
      </div>
      <div>
        <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:sc.bg,
          color:sc.color, fontSize:'0.66rem', fontWeight:600, padding:'3px 9px', borderRadius:99 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:sc.dot }} />
          {subject.status || 'Not Started'}
        </span>
      </div>
    </div>
  );
};

// ── Month block (expandable) ─────────────────────────────────────────────────────
const MonthBlock = ({ month, open, onToggle }) => {
  const h = monthHours(month);
  const count = (month.subjects || []).length;
  return (
    <div style={{ border:'1px solid #eef2f7', borderRadius:11, overflow:'hidden', background:'#fff' }}>
      <div className="cd-head" onClick={onToggle}
        style={{ display:'flex', alignItems:'center', gap:11, padding:'12px 14px' }}>
        <span className={`cd-chev ${open ? 'open' : ''}`} style={{ color:'#94a3b8', fontSize:'0.7rem' }}>▶</span>
        <span style={{ fontFamily:'DM Mono, monospace', fontSize:'0.7rem', fontWeight:600, color:'#6366f1',
          background:'#eef2ff', padding:'2px 8px', borderRadius:6 }}>
          {month.code || `M${month.monthNumber}`}
        </span>
        <span style={{ fontWeight:700, fontSize:'0.86rem', color:'#0f172a', flex:1 }}>{month.name}</span>
        <span style={{ fontSize:'0.72rem', color:'#94a3b8' }}>{count} subj</span>
        <span style={{ fontFamily:'DM Mono, monospace', fontSize:'0.78rem', fontWeight:700, color:'#0f172a' }}>
          {h.total}h
        </span>
      </div>

      {open && (
        <div style={{ animation:'fadeUp .2s ease' }}>
          <div className="subj-row subj-head" style={{ background:'#fafbfc', borderTop:'1px solid #eef2f7' }}>
            <div className="subj-name">Subject</div>
            {SESSIONS.map(s => <div key={s.key}>{s.short}</div>)}
            <div>Total</div>
            <div>Status</div>
          </div>
          {(month.subjects || []).length
            ? month.subjects.map((s, i) => <SubjectRow key={s._id || i} subject={s} />)
            : <div style={{ padding:'14px', fontSize:'0.78rem', color:'#94a3b8' }}>No subjects.</div>}
        </div>
      )}
    </div>
  );
};

// ── Trimester block (expandable) ─────────────────────────────────────────────────
const TrimesterBlock = ({ trimester, accent, openMonths, toggleMonth, open, onToggle }) => {
  const h = trimesterHours(trimester);
  return (
    <div className="cd-tri" style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
      overflow:'hidden', animation:'fadeUp .3s ease' }}>
      <div style={{ height:3, background:accent }} />
      <div className="cd-head" onClick={onToggle}
        style={{ display:'flex', alignItems:'center', gap:13, padding:'16px 18px' }}>
        <span className={`cd-chev ${open ? 'open' : ''}`} style={{ color:'#94a3b8', fontSize:'0.8rem' }}>▶</span>
        <div style={{ width:42, height:42, borderRadius:10, background:`${accent}18`, color:accent,
          display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono, monospace',
          fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>
          {trimester.code || `T${trimester.trimesterNumber}`}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:'0.96rem', color:'#0f172a' }}>{trimester.title}</div>
          {trimester.focus && (
            <div style={{ fontSize:'0.74rem', color:'#64748b', marginTop:2,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {trimester.focus}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'DM Mono, monospace', fontWeight:800, fontSize:'1rem', color:accent }}>
            {h.total}h
          </div>
          <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>{(trimester.months || []).length} months</div>
        </div>
      </div>

      {open && (
        <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:10,
          animation:'fadeUp .2s ease' }}>
          {(trimester.months || []).map((m, i) => (
            <MonthBlock key={m._id || i} month={m}
              open={openMonths.has(m._id || `${trimester._id}-${i}`)}
              onToggle={() => toggleMonth(m._id || `${trimester._id}-${i}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const CourseDetail = ({ courseId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const params   = useParams();
  const id       = courseId || params.id;

  const course  = useSelector(selectCurrentCourse);
  const batches = useSelector(selectCurrentBatches);
  const status  = useSelector(selectCourseDetailStatus);
  const error   = useSelector(selectCourseDetailError);

  const [openTri,   setOpenTri]   = useState(() => new Set());
  const [openMonth, setOpenMonth] = useState(() => new Set());

  useEffect(() => { if (id) dispatch(fetchCourseById(id)); }, [dispatch, id]);

  // Expand every trimester by default once the course loads.
  useEffect(() => {
    if (course?.trimesters?.length) {
      setOpenTri(new Set(course.trimesters.map((t, i) => t._id || `t-${i}`)));
    }
  }, [course?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => (course ? courseHours(course) : emptyHours()), [course]);

  const counts = useMemo(() => {
    if (!course) return { tri: 0, months: 0, subjects: 0 };
    let months = 0, subjects = 0;
    (course.trimesters || []).forEach((t) => {
      months += (t.months || []).length;
      (t.months || []).forEach((m) => { subjects += (m.subjects || []).length; });
    });
    return { tri: (course.trimesters || []).length, months, subjects };
  }, [course]);

  const toggleTri   = (key) => setOpenTri(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleMonth = (key) => setOpenMonth(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const expandAll = () => {
    const tri = new Set(), mon = new Set();
    (course.trimesters || []).forEach((t, ti) => {
      tri.add(t._id || `t-${ti}`);
      (t.months || []).forEach((m, mi) => mon.add(m._id || `${t._id}-${mi}`));
    });
    setOpenTri(tri); setOpenMonth(mon);
  };
  const collapseAll = () => { setOpenTri(new Set()); setOpenMonth(new Set()); };

  const handleExport = () => {
    if (!course) return;
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1 — Overview
      const overview = [
        { Field: 'Course',        Value: course.name },
        { Field: 'Code',          Value: course.code },
        { Field: 'Level',         Value: course.level },
        { Field: 'Status',        Value: course.status },
        { Field: 'Duration',      Value: fmtDuration(course.duration, course.durationUnit) },
        { Field: 'Trimesters',    Value: counts.tri },
        { Field: 'Months',        Value: counts.months },
        { Field: 'Subjects',      Value: counts.subjects },
        { Field: 'Total Hours',   Value: totals.total },
        { Field: 'S1 Theory',     Value: totals.s1Theory },
        { Field: 'S2 Practical',  Value: totals.s2Practical },
        { Field: 'S3 Assignment', Value: totals.s3Assignment },
        { Field: 'S4 Feedback',   Value: totals.s4Feedback },
        { Field: 'Tags',          Value: (course.tags || []).join(', ') },
      ];
      const wsOverview = XLSX.utils.json_to_sheet(overview);
      wsOverview['!cols'] = [{ wch: 16 }, { wch: 48 }];
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

      // Sheet 2 — Curriculum (one row per subject) + a TOTAL row
      const matrix = buildMatrix(course);
      matrix.push({
        Trimester: 'TOTAL', 'Trimester Title': '', Month: '', 'Month Name': '',
        Subject: '', Category: '',
        'S1 Theory': totals.s1Theory, 'S2 Practical': totals.s2Practical,
        'S3 Assignment': totals.s3Assignment, 'S4 Feedback': totals.s4Feedback,
        'Total Hours': totals.total, Status: '',
      });
      const wsMatrix = XLSX.utils.json_to_sheet(matrix);
      wsMatrix['!cols'] = [
        { wch: 10 }, { wch: 22 }, { wch: 8 }, { wch: 24 }, { wch: 30 }, { wch: 22 },
        { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 13 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Curriculum');

      XLSX.writeFile(wb, `${course.code || 'course'}_curriculum.xlsx`);
      toast.success('Excel downloaded');
    } catch (e) {
      toast.error('Export failed: ' + e.message);
    }
  };

  // ── Loading / error / empty ───────────────────────────────────────────────────
  const wrap = (children) => (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>{children}</div>
    </div>
  );

  if (status === 'loading') return wrap(<Spinner />);
  if (status === 'failed')
    return wrap(
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
        padding:'14px 16px', fontSize:'0.85rem', color:'#b91c1c' }}>
        ⚠️ {error || 'Failed to load course.'}
      </div>
    );
  if (!course) return wrap(<div style={{ color:'#94a3b8', textAlign:'center', padding:60 }}>No course found.</div>);

  const totalForBar = totals.total || 1;

  return wrap(
    <>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <button className="cd-btn" onClick={() => navigate(-1)}
          style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#fff',
            border:'1.5px solid #e2e8f0', borderRadius:9, padding:'9px 16px', fontSize:'0.82rem',
            fontWeight:600, color:'#374151', fontFamily:'inherit' }}>
          ← Back
        </button>
          <button className="cd-btn" onClick={() => navigate(`/admin/courses/${course._id}/edit`)}
          style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:9,
            padding:'9px 16px', fontSize:'0.84rem', fontWeight:700, color:'#4f46e5' }}>
          ✎ Edit Curriculum
        </button>
        <button className="cd-btn" onClick={handleExport}
          style={{ display:'inline-flex', alignItems:'center', gap:8, border:'none', borderRadius:9,
            padding:'10px 20px', fontSize:'0.84rem', fontWeight:700, color:'#fff', fontFamily:'inherit',
            background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 2px 8px rgba(16,185,129,.35)' }}>
          ⬇ Export to Excel
        </button>
      </div>

      {/* Hero */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
        padding:'22px 24px', marginBottom:18, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:4,
          background:'linear-gradient(90deg,#6366f1,#0ea5e9,#10b981,#f59e0b)' }} />
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, flexWrap:'wrap', marginTop:6 }}>
          <div style={{ width:56, height:56, borderRadius:13, background:'#eef2ff', color:'#6366f1',
            display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Mono, monospace',
            fontWeight:700, fontSize:'0.9rem', flexShrink:0, letterSpacing:'0.5px' }}>
            {(course.code || 'C').slice(0, 4)}
          </div>
          <div style={{ flex:1, minWidth:220 }}>
            <h1 style={{ fontSize:'1.4rem', fontWeight:800, letterSpacing:'-0.4px', marginBottom:8 }}>
              {course.name}
            </h1>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:10 }}>
              <Pill label={course.status || 'draft'} colorMap={STATUS_COLORS} />
              <Pill label={course.level || 'beginner'} colorMap={LEVEL_COLORS} />
              <span style={{ fontSize:'0.7rem', fontWeight:600, color:'#475569', background:'#f1f5f9',
                padding:'3px 10px', borderRadius:99 }}>
                ⏱ {fmtDuration(course.duration, course.durationUnit)}
              </span>
            </div>
            {course.description && (
              <p style={{ fontSize:'0.84rem', color:'#64748b', lineHeight:1.55, margin:0 }}>
                {course.description}
              </p>
            )}
            {(course.tags || []).length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:11 }}>
                {course.tags.map((t) => (
                  <span key={t} style={{ fontSize:'0.68rem', color:'#6366f1', background:'#eef2ff',
                    padding:'2px 9px', borderRadius:6, fontWeight:600 }}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
        {[
          { label:'Trimesters', value:counts.tri,      color:'#6366f1', bg:'#eef2ff' },
          { label:'Months',     value:counts.months,   color:'#0ea5e9', bg:'#e0f2fe' },
          { label:'Subjects',   value:counts.subjects, color:'#10b981', bg:'#dcfce7' },
          { label:'Total Hrs',  value:`${totals.total}`,color:'#f59e0b', bg:'#fef3c7' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
            padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ minWidth:42, height:42, padding:'0 8px', borderRadius:10, background:bg, color,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
              fontWeight:800, fontFamily:'DM Mono, monospace' }}>{value}</div>
            <div style={{ fontSize:'0.74rem', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Session (S1–S4) breakdown */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 20px', marginBottom:18 }}>
        <div style={{ fontSize:'0.74rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
          letterSpacing:'0.5px', marginBottom:12 }}>
          Hours by session type
        </div>
        <div className="sess-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
          {SESSIONS.map((s) => (
            <div key={s.key} style={{ border:`1px solid ${s.color}22`, background:`${s.color}0a`,
              borderRadius:10, padding:'11px 13px' }}>
              <div style={{ fontFamily:'DM Mono, monospace', fontWeight:800, fontSize:'1.25rem', color:s.color }}>
                {totals[s.key]}h
              </div>
              <div style={{ fontSize:'0.7rem', fontWeight:600, color:'#64748b' }}>
                {s.short} · {s.label}
              </div>
            </div>
          ))}
        </div>
        {/* Proportional bar */}
        <div style={{ display:'flex', height:10, borderRadius:6, overflow:'hidden', background:'#f1f5f9' }}>
          {SESSIONS.map((s) => {
            const pct = ((totals[s.key] || 0) / totalForBar) * 100;
            return pct > 0 ? <div key={s.key} title={`${s.label}: ${totals[s.key]}h`}
              style={{ width:`${pct}%`, background:s.color }} /> : null;
          })}
        </div>
      </div>

      {/* Curriculum accordion */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 style={{ fontSize:'1.05rem', fontWeight:800, color:'#0f172a' }}>Curriculum</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button className="cd-btn" onClick={expandAll}
            style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'6px 12px',
              fontSize:'0.74rem', fontWeight:600, color:'#475569', fontFamily:'inherit' }}>Expand all</button>
          <button className="cd-btn" onClick={collapseAll}
            style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'6px 12px',
              fontSize:'0.74rem', fontWeight:600, color:'#475569', fontFamily:'inherit' }}>Collapse all</button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {(course.trimesters || []).map((t, i) => {
          const key = t._id || `t-${i}`;
          return (
            <TrimesterBlock key={key} trimester={t} accent={TRI_ACCENTS[i % TRI_ACCENTS.length]}
              open={openTri.has(key)} onToggle={() => toggleTri(key)}
              openMonths={openMonth} toggleMonth={toggleMonth} />
          );
        })}
        {(course.trimesters || []).length === 0 && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📦</div>
            No curriculum has been added to this course yet.
          </div>
        )}
      </div>

      {/* Linked batches (optional) */}
      {(batches || []).length > 0 && (
        <div style={{ marginTop:22 }}>
          <h2 style={{ fontSize:'1.05rem', fontWeight:800, marginBottom:12 }}>Linked batches</h2>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {batches.map((b) => (
              <span key={b._id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8,
                padding:'7px 13px', fontSize:'0.78rem', fontWeight:600, color:'#374151' }}>
                {b.name || b.code}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default CourseDetail;