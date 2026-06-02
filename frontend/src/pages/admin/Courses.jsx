// src/pages/admin/Courses.jsx
// Admin-only CRUD page for Courses.
// Structure mirrors Batches.jsx exactly:
//   Stats strip → Search + Tabs → Card grid → Slide-in side panel (Add/Edit/Delete)
// All data via Redux: courseSlice (state.courses)
//
// CHANGE: course duration now carries a UNIT (hour | day | week | month |
//         trimester | year) instead of being hard-coded to weeks. The unit
//         lives in form state, so it flows through the existing payload →
//         createCourse / updateCourse thunks → backend with no slice change.
//         Backend must whitelist `durationUnit` on POST/PUT /api/courses.

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  selectAllCourses,
  selectCoursesStatus,
  selectCoursesError,
  selectCourseCreateStatus,
  selectCourseCreateError,
  selectCourseUpdateStatus,
  selectCourseUpdateError,
  selectCourseDeleteStatus,
  selectCourseDeleteError,
  clearCourseErrors,
  resetCourseCreateStatus,
} from '../../features/admin/courseSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const LEVELS   = ['beginner', 'intermediate', 'advanced'];
const STATUSES = ['draft', 'active', 'archived'];

// Supported duration units. Keep in sync with the backend enum.
const DURATION_UNITS = ['hour', 'day', 'week', 'month', 'trimester', 'year'];

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

const CARD_ACCENTS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#f97316'];

const EMPTY_FORM = {
  name:         '',
  code:         '',
  description:  '',
  duration:     12,
  durationUnit: 'week',
  level:        'beginner',
  status:       'draft',
  tags:         '',
};

// Format a duration value + unit for display, pluralising correctly.
// fmtDuration(1, 'month') → "1 month"   fmtDuration(3, 'month') → "3 months"
const fmtDuration = (value, unit = 'week') => {
  if (!value && value !== 0) return '—';
  const n = Number(value);
  if (!n) return '—';
  const u = DURATION_UNITS.includes(unit) ? unit : 'week';
  return `${n} ${u}${n === 1 ? '' : 's'}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes slideIn { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

  .crs-card { transition:box-shadow .18s,transform .18s; }
  .crs-card:hover { box-shadow:0 8px 28px rgba(15,23,42,.13) !important; transform:translateY(-2px); }
  .icon-btn { transition:background .15s,transform .15s; border:none; cursor:pointer; }
  .icon-btn:hover { background:#f1f5f9 !important; transform:scale(1.08); }
  .del-btn:hover  { background:#fee2e2 !important; }
  .tab-btn { transition:all .15s; }
  .tab-btn:hover  { background:#f8fafc !important; }
  .tab-btn.active { background:#fff !important; color:#0f172a !important; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  .fi { transition:border-color .15s,box-shadow .15s; }
  .fi:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
  .sbtn { transition:opacity .15s,transform .15s; }
  .sbtn:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
  .sbtn:disabled { opacity:.55; cursor:not-allowed; }
  .shimmer-row {
    background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size:400px 100%; animation:shimmer 1.4s infinite;
    border-radius:10px; height:88px;
  }
  @media (max-width:900px) {
    .crs-layout { flex-direction:column !important; }
    .crs-side   { width:100% !important; }
  }
  @media (max-width:560px) {
    .stats-grid { grid-template-columns:repeat(2,1fr) !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const Pill = ({ label, colorMap }) => {
  const c = colorMap[label] || { bg:'#f1f5f9', color:'#374151', dot:'#94a3b8' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      background:c.bg, color:c.color, fontSize:'0.7rem', fontWeight:600,
      padding:'2px 9px', borderRadius:99 }}>
      {c.dot && <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }} />}
      {label}
    </span>
  );
};

const FL = ({ children, required }) => (
  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'#374151', marginBottom:5 }}>
    {children}{required && <span style={{ color:'#ef4444', marginLeft:3 }}>*</span>}
  </label>
);

const FInput = ({ label, required, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label && <FL required={required}>{label}</FL>}
    <input className="fi" required={required} {...p}
      style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8,
        padding:'9px 12px', fontSize:'0.85rem', color:'#0f172a', background:'#fff',
        fontFamily:'inherit', ...p.style }} />
  </div>
);

const FSelect = ({ label, required, children, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label && <FL required={required}>{label}</FL>}
    <div style={{ position:'relative' }}>
      <select className="fi" required={required} {...p}
        style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8,
          padding:'9px 32px 9px 12px', fontSize:'0.85rem', color:'#0f172a',
          background:'#fff', appearance:'none', WebkitAppearance:'none',
          cursor:'pointer', fontFamily:'inherit', ...p.style }}>
        {children}
      </select>
      <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
        pointerEvents:'none', color:'#94a3b8', fontSize:'0.7rem' }}>▾</span>
    </div>
  </div>
);

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:44 }}>
    <div style={{ width:24, height:24, borderRadius:'50%', border:'2.5px solid #e2e8f0',
      borderTopColor:'#6366f1', animation:'spin .7s linear infinite' }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE CARD
// ═══════════════════════════════════════════════════════════════════════════════

const CourseCard = ({ course, idx, onEdit, onDelete }) => {
  const accent   = CARD_ACCENTS[idx % CARD_ACCENTS.length];
  const initials = (course.code || course.name || 'C').slice(0,4).toUpperCase();

  return (
    <div className="crs-card" style={{ background:'#fff', border:'1px solid #e2e8f0',
      borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
      animation:'fadeUp .3s ease' }}>

      {/* Accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
        background:accent, borderRadius:'14px 14px 0 0' }} />

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', gap:12, marginTop:4 }}>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:46, height:46, borderRadius:11, background:`${accent}18`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'DM Mono, monospace', fontWeight:600, fontSize:'0.72rem',
            color:accent, flexShrink:0, letterSpacing:'0.5px' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.92rem', color:'#0f172a', marginBottom:4 }}>
              {course.name}
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              <Pill label={course.status || 'draft'} colorMap={STATUS_COLORS} />
              <Pill label={course.level  || 'beginner'} colorMap={LEVEL_COLORS} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:5, flexShrink:0 }}>
          <button className="icon-btn" onClick={() => onEdit(course)}
            style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}
            title="Edit">✏️</button>
          <button className="icon-btn del-btn" onClick={() => onDelete(course)}
            style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}
            title="Delete">🗑️</button>
        </div>
      </div>

      {/* Meta grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px 14px', marginTop:14 }}>
        {[
          { icon:'🏷️', label:'Code',     value: course.code || '—' },
          { icon:'⏱️', label:'Duration', value: fmtDuration(course.duration, course.durationUnit) },
          { icon:'📚', label:'Modules',  value: `${course.modules?.length || 0} modules` },
          { icon:'🏷️', label:'Tags',     value: course.tags?.join(', ') || '—' },
        ].map(({ icon, label, value }) => (
          <div key={label}>
            <div style={{ fontSize:'0.66rem', fontWeight:600, color:'#94a3b8',
              textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize:'0.81rem', fontWeight:500, color:'#374151',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {course.description && (
        <div style={{ marginTop:11, fontSize:'0.77rem', color:'#64748b', lineHeight:1.5,
          borderTop:'1px solid #f1f5f9', paddingTop:10,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {course.description}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE FORM — Add / Edit
// POST /api/courses  or  PUT /api/courses/:id
// ═══════════════════════════════════════════════════════════════════════════════

const CourseForm = ({ editCourse, onClose }) => {
  const dispatch      = useDispatch();
  const createStatus  = useSelector(selectCourseCreateStatus);
  const createError   = useSelector(selectCourseCreateError);
  const updateStatus  = useSelector(selectCourseUpdateStatus);
  const updateError   = useSelector(selectCourseUpdateError);

  const isEdit = !!editCourse;
  const [form, setForm] = useState(
    isEdit ? {
      name:         editCourse.name         || '',
      code:         editCourse.code         || '',
      description:  editCourse.description  || '',
      duration:     editCourse.duration     || 12,
      durationUnit: editCourse.durationUnit || 'week',
      level:        editCourse.level        || 'beginner',
      status:       editCourse.status       || 'draft',
      tags:         (editCourse.tags || []).join(', '),
    } : { ...EMPTY_FORM }
  );

  const saving = createStatus === 'loading' || updateStatus === 'loading';
  const err    = createError  || updateError;
  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,                                   // includes durationUnit
      code:         form.code.toUpperCase().trim(),
      duration:     Number(form.duration),
      durationUnit: form.durationUnit || 'week',
      tags:         form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    const result = isEdit
      ? await dispatch(updateCourse({ id: editCourse._id, ...payload }))
      : await dispatch(createCourse(payload));

    const action = isEdit ? updateCourse : createCourse;
    if (action.fulfilled.match(result)) {
      toast.success(isEdit ? 'Course updated!' : 'Course created!');
      dispatch(resetCourseCreateStatus());
      onClose();
    }
  };

  return (
    <div style={{ animation:'slideIn .25s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h3 style={{ fontWeight:700, fontSize:'1rem', color:'#0f172a' }}>
          {isEdit ? '✏️ Edit Course' : '➕ Add New Course'}
        </h3>
        <button className="icon-btn" onClick={onClose}
          style={{ width:28, height:28, borderRadius:6, background:'#f1f5f9',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.88rem', color:'#64748b' }}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <FInput label="Course Name" required placeholder="e.g. Fullstack Web Development"
          value={form.name} onChange={e => set('name', e.target.value)} />

        <FInput label="Course Code" required placeholder="e.g. YIEP"
          value={form.code}
          onChange={e => set('code', e.target.value.toUpperCase())}
          style={{ fontFamily:'DM Mono, monospace', letterSpacing:'1px' }} />

        <FSelect label="Level" required value={form.level}
          onChange={e => set('level', e.target.value)}>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </FSelect>

        {/* Duration value + unit */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FInput label="Duration" required type="number" min="1"
            value={form.duration} onChange={e => set('duration', e.target.value)} />
          <FSelect label="Unit" required value={form.durationUnit}
            onChange={e => set('durationUnit', e.target.value)}>
            {DURATION_UNITS.map(u => (
              <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}s</option>
            ))}
          </FSelect>
        </div>

        <FSelect label="Status" value={form.status}
          onChange={e => set('status', e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </FSelect>

        <FInput label="Tags (comma separated)" placeholder="e.g. web, banking, fullstack"
          value={form.tags} onChange={e => set('tags', e.target.value)} />

        <div style={{ marginBottom:18 }}>
          <FL>Description</FL>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Brief description of this course…" rows={3} className="fi"
            style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'9px 12px',
              fontSize:'0.85rem', color:'#0f172a', resize:'vertical', fontFamily:'inherit' }} />
        </div>

        {err && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
            padding:'9px 12px', fontSize:'0.77rem', color:'#b91c1c', marginBottom:14 }}>
            ⚠️ {err}
          </div>
        )}

        <button type="submit" disabled={saving} className="sbtn"
          style={{ width:'100%', padding:'11px', borderRadius:9, border:'none',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color:'#fff', fontWeight:700, fontSize:'0.88rem', fontFamily:'inherit' }}>
          {saving
            ? (isEdit ? 'Saving…' : 'Creating…')
            : (isEdit ? 'Save Changes' : 'Create Course')}
        </button>
      </form>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM
// ═══════════════════════════════════════════════════════════════════════════════

const DeleteConfirm = ({ course, onConfirm, onCancel, deleting, deleteError }) => (
  <div style={{ animation:'fadeUp .2s ease', textAlign:'center', padding:'8px 0' }}>
    <div style={{ fontSize:'2.2rem', marginBottom:12 }}>🗑️</div>
    <h3 style={{ fontWeight:700, fontSize:'0.96rem', color:'#0f172a', marginBottom:8 }}>
      Delete "{course.name}"?
    </h3>
    <p style={{ fontSize:'0.8rem', color:'#64748b', marginBottom:16, lineHeight:1.5 }}>
      This cannot be undone. Active batches using this course will block deletion.
    </p>
    {deleteError && (
      <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:7,
        padding:'8px 12px', fontSize:'0.76rem', color:'#b91c1c', marginBottom:12, textAlign:'left' }}>
        ⚠️ {deleteError}
      </div>
    )}
    <div style={{ display:'flex', gap:10 }}>
      <button onClick={onCancel} className="sbtn"
        style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e2e8f0',
          background:'#fff', color:'#374151', fontWeight:600, fontSize:'0.85rem',
          cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
      <button onClick={onConfirm} disabled={deleting} className="sbtn"
        style={{ flex:1, padding:'10px', borderRadius:8, border:'none',
          background:'#dc2626', color:'#fff', fontWeight:600, fontSize:'0.85rem',
          cursor: deleting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const Courses = () => {
  const dispatch = useDispatch();

  const courses      = useSelector(selectAllCourses);
  const status       = useSelector(selectCoursesStatus);
  const error        = useSelector(selectCoursesError);
  const deleteStatus = useSelector(selectCourseDeleteStatus);
  const deleteError  = useSelector(selectCourseDeleteError);

  const [tab,    setTab]    = useState('all');
  const [search, setSearch] = useState('');
  const [panel,  setPanel]  = useState(null);    // null | 'add' | 'edit' | 'delete'
  const [target, setTarget] = useState(null);

  useEffect(() => { dispatch(fetchCourses()); }, [dispatch]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filtered = courses.filter(c => {
    const matchTab    = tab === 'all' || c.status === tab;
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.level?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  const stats = {
    total:    courses.length,
    active:   courses.filter(c => c.status === 'active').length,
    draft:    courses.filter(c => c.status === 'draft').length,
    archived: courses.filter(c => c.status === 'archived').length,
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openAdd    = ()  => { setTarget(null);  setPanel('add'); dispatch(clearCourseErrors()); };
  const openEdit   = (c) => { setTarget(c);     setPanel('edit'); dispatch(clearCourseErrors()); };
  const openDelete = (c) => { setTarget(c);     setPanel('delete'); dispatch(clearCourseErrors()); };
  const closePanel = ()  => { setPanel(null);   setTarget(null); dispatch(clearCourseErrors()); };

  const handleDelete = async () => {
    if (!target) return;
    const result = await dispatch(deleteCourse(target._id));
    if (deleteCourse.fulfilled.match(result)) {
      toast.success(`"${target.name}" deleted`);
      closePanel();
    }
    // Error shown inside DeleteConfirm via deleteError selector
  };

  const TABS = ['all', 'active', 'draft', 'archived'];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc',
      fontFamily:"'DM Sans',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth:1320, margin:'0 auto', padding:'28px 24px' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          flexWrap:'wrap', gap:16, marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:'1.55rem', fontWeight:800, color:'#0f172a',
              letterSpacing:'-0.4px', marginBottom:5 }}>
              Courses
            </h1>
            <p style={{ fontSize:'0.84rem', color:'#64748b' }}>
              Create and manage training programmes. Courses are linked to batches.
            </p>
          </div>
          <button onClick={openAdd}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px',
              borderRadius:9, border:'none',
              background:'linear-gradient(135deg,#6366f1,#4f46e5)',
              color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
              boxShadow:'0 2px 8px rgba(99,102,241,.35)', fontFamily:'inherit',
              transition:'box-shadow .15s,transform .15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 16px rgba(99,102,241,.5)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(99,102,241,.35)'; e.currentTarget.style.transform=''; }}>
            <span style={{ fontSize:'1.05rem' }}>+</span> Add Course
          </button>
        </div>

        {/* ── STATS STRIP ── */}
        <div className="stats-grid" style={{ display:'grid',
          gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total',    value:stats.total,    color:'#6366f1', bg:'#eef2ff' },
            { label:'Active',   value:stats.active,   color:'#15803d', bg:'#f0fdf4' },
            { label:'Draft',    value:stats.draft,    color:'#1d4ed8', bg:'#eff6ff' },
            { label:'Archived', value:stats.archived, color:'#374151', bg:'#f9fafb' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background:'#fff', border:'1px solid #e2e8f0',
              borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1.15rem', fontWeight:800, color, fontFamily:'DM Mono,monospace' }}>
                {value}
              </div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#64748b',
                textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div className="crs-layout" style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

          {/* ── CONTENT ── */}
          <div style={{ flex:1, minWidth:0 }}>

            {/* Search + Tabs */}
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:18 }}>
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)',
                  fontSize:'0.85rem', color:'#94a3b8' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, code, level, tag…"
                  className="fi"
                  style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9,
                    padding:'9px 12px 9px 34px', fontSize:'0.84rem', color:'#0f172a',
                    background:'#fff', fontFamily:'inherit' }} />
              </div>
              <div style={{ display:'flex', background:'#f1f5f9', borderRadius:9, padding:3, gap:2 }}>
                {TABS.map(t => (
                  <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`}
                    onClick={() => setTab(t)}
                    style={{ padding:'6px 14px', borderRadius:7, border:'none',
                      cursor:'pointer', fontSize:'0.78rem', fontWeight:600,
                      color: tab === t ? '#0f172a' : '#64748b',
                      background:'transparent', fontFamily:'inherit', textTransform:'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* API error */}
            {error && status === 'failed' && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9,
                padding:'10px 14px', fontSize:'0.79rem', color:'#b91c1c', marginBottom:16 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Shimmer loading */}
            {status === 'loading' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer-row" />)}
              </div>
            )}

            {/* Course grid */}
            {status !== 'loading' && filtered.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {filtered.map((c, i) => (
                  <CourseCard key={c._id} course={c} idx={i}
                    onEdit={openEdit} onDelete={openDelete} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {status !== 'loading' && filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                <div style={{ fontSize:'3rem', marginBottom:12 }}>📚</div>
                <div style={{ fontWeight:600, fontSize:'0.95rem', marginBottom:6 }}>
                  {search ? 'No courses match your search' : 'No courses yet'}
                </div>
                <div style={{ fontSize:'0.82rem' }}>
                  Click "Add Course" to create the first one.
                </div>
              </div>
            )}
          </div>

          {/* ── SIDE PANEL ── */}
          {panel && (
            <div className="crs-side" style={{ width:340, flexShrink:0, background:'#fff',
              border:'1px solid #e2e8f0', borderRadius:14, padding:'22px 20px',
              boxShadow:'0 4px 20px rgba(15,23,42,.08)', animation:'slideIn .25s ease' }}>
              {panel === 'delete' ? (
                <DeleteConfirm
                  course={target}
                  deleting={deleteStatus === 'loading'}
                  deleteError={deleteError}
                  onConfirm={handleDelete}
                  onCancel={closePanel}
                />
              ) : (
                <CourseForm
                  // key forces a fresh form when switching between courses / add↔edit
                  key={panel === 'edit' ? target?._id : 'add'}
                  editCourse={panel === 'edit' ? target : null}
                  onClose={closePanel}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Courses;