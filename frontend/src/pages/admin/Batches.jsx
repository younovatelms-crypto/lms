// src/pages/admin/Batches.jsx
// Role-aware: Admin gets full CRUD. Trainer gets read-only.
// Courses loaded from Redux courseSlice (state.courses)
// Modal: centered overlay (not side panel) — mobile responsive

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

// ── batchSlice ────────────────────────────────────────────────────────────────
import {
  fetchBatches,  createBatch,  updateBatch,  deleteBatch,
  selectAllBatches, selectBatchesStatus, selectBatchesError,
  selectBatchCreateStatus, selectBatchCreateError,
  selectBatchUpdateStatus, selectBatchUpdateError,
  selectBatchDeleteStatus, selectBatchDeleteError,
  resetBatchCreateStatus, clearBatchErrors,
} from '../../features/session/batchSlice';

// ── courseSlice — course options for dropdown ─────────────────────────────────
import {
  fetchCourses,
  selectAllCourses,
  selectCoursesStatus,
} from '../../features/admin/courseSlice';

// ── adminSlice — trainer list for Assign Trainer dropdown ─────────────────────
import {
  fetchTrainers,
  selectAdminTrainers,
} from '../../features/admin/adminSlice';

// ── auth ──────────────────────────────────────────────────────────────────────
import { selectUserRole } from '../../features/auth/authSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_STATUSES = ['upcoming', 'active', 'completed', 'cancelled'];

const STATUS_COLORS = {
  upcoming:  { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  active:    { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  completed: { bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
  cancelled: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
};

const CARD_ACCENTS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6'];

const EMPTY_FORM = {
  name: '', description: '', trainerId: '',
  startDate: '', maxStudents: 25, course: '', status: 'upcoming',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes modalIn   { from{opacity:0;transform:translateY(-16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

  .batch-card { transition:box-shadow .18s,transform .18s; }
  .batch-card:hover { box-shadow:0 8px 28px rgba(15,23,42,.13)!important; transform:translateY(-2px); }
  .icon-btn { transition:background .15s,transform .15s; border:none; cursor:pointer; }
  .icon-btn:hover { background:#f1f5f9!important; transform:scale(1.08); }
  .del-btn:hover  { background:#fee2e2!important; }
  .tab-btn { transition:all .15s; border:none; cursor:pointer; }
  .tab-btn:hover  { background:#f8fafc!important; }
  .tab-btn.act    { background:#fff!important; color:#0f172a!important; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  .fi { transition:border-color .15s,box-shadow .15s; }
  .fi:focus { outline:none!important; border-color:#6366f1!important; box-shadow:0 0 0 3px rgba(99,102,241,.12)!important; }
  .sbtn { transition:opacity .15s,transform .15s; }
  .sbtn:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
  .sbtn:disabled { opacity:.5; cursor:not-allowed; }
  .shimmer-row {
    background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size:400px 100%; animation:shimmer 1.4s infinite;
    border-radius:10px; height:84px;
  }

  /* ── MODAL OVERLAY ── */
  .modal-overlay {
    position:fixed; inset:0; background:rgba(15,23,42,.45);
    backdrop-filter:blur(3px); display:flex; align-items:center;
    justify-content:center; z-index:9999; padding:16px;
    animation:fadeUp .2s ease;
  }
  .modal-box {
    background:#fff; border-radius:18px; width:100%; max-width:480px;
    max-height:90vh; overflow-y:auto; padding:28px 28px 24px;
    box-shadow:0 24px 60px rgba(15,23,42,.22);
    animation:modalIn .25s cubic-bezier(.34,1.3,.64,1);
  }
  @media (max-width:520px) {
    .modal-box { padding:20px 16px 18px; border-radius:14px; }
    .stats-grid { grid-template-columns:repeat(2,1fr)!important; }
    .batch-grid  { grid-template-columns:1fr!important; }
    .header-row  { flex-direction:column!important; align-items:flex-start!important; }
    .search-row  { flex-direction:column!important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.upcoming;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      background:c.bg, color:c.color, fontSize:'0.7rem', fontWeight:600,
      padding:'2px 9px', borderRadius:99 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }} />
      {status}
    </span>
  );
};

const FL = ({ children, req }) => (
  <label style={{ display:'block', fontSize:'0.79rem', fontWeight:600,
    color:'#374151', marginBottom:5 }}>
    {children}{req && <span style={{ color:'#ef4444', marginLeft:3 }}>*</span>}
  </label>
);

const FInput = ({ label, req, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label && <FL req={req}>{label}</FL>}
    <input className="fi" required={req} {...p}
      style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8,
        padding:'9px 12px', fontSize:'0.85rem', color:'#0f172a',
        background:'#fff', fontFamily:'inherit', ...p.style }} />
  </div>
);

const FSelect = ({ label, req, children, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label && <FL req={req}>{label}</FL>}
    <div style={{ position:'relative' }}>
      <select className="fi" required={req} {...p}
        style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8,
          padding:'9px 32px 9px 12px', fontSize:'0.85rem', color:'#0f172a',
          background:'#fff', appearance:'none', WebkitAppearance:'none',
          cursor:'pointer', fontFamily:'inherit', ...p.style }}>
        {children}
      </select>
      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
        pointerEvents:'none', color:'#94a3b8', fontSize:'0.72rem' }}>▾</span>
    </div>
  </div>
);

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:44 }}>
    <div style={{ width:24, height:24, borderRadius:'50%',
      border:'2.5px solid #e2e8f0', borderTopColor:'#6366f1',
      animation:'spin .7s linear infinite' }} />
  </div>
);

// ── Close on backdrop click ────────────────────────────────────────────────────
const Modal = ({ onClose, children }) => {
  // Close on Escape key
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CARD
// ═══════════════════════════════════════════════════════════════════════════════

const BatchCard = ({ batch, idx, isAdmin, onEdit, onDelete }) => {
  const accent   = CARD_ACCENTS[idx % CARD_ACCENTS.length];
  const initials = (batch.name || 'B').slice(0, 2).toUpperCase();
  const trainer  = batch.trainerId?.name || '—';
  const start    = batch.startDate
    ? new Date(batch.startDate).toLocaleDateString('en-GB',
        { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="batch-card" style={{ background:'#fff', border:'1px solid #e2e8f0',
      borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
      animation:'fadeUp .3s ease' }}>

      {/* accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
        background:accent, borderRadius:'14px 14px 0 0' }} />

      <div style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', gap:12, marginTop:2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:42, height:42, borderRadius:10,
            background:`${accent}18`, display:'flex', alignItems:'center',
            justifyContent:'center', fontFamily:'DM Mono,monospace',
            fontWeight:600, fontSize:'0.82rem', color:accent, flexShrink:0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.91rem',
              color:'#0f172a', marginBottom:3 }}>{batch.name}</div>
            <StatusPill status={batch.status || 'upcoming'} />
          </div>
        </div>

        {isAdmin && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            <button className="icon-btn" onClick={() => onEdit(batch)}
              style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.8rem' }} title="Edit">✏️</button>
            <button className="icon-btn del-btn" onClick={() => onDelete(batch)}
              style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.8rem' }} title="Delete">🗑️</button>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
        gap:'8px 16px', marginTop:14 }}>
        {[
          { icon:'🎓', label:'Course',   value: batch.course || '—' },
          { icon:'👤', label:'Trainer',  value: trainer },
          { icon:'📅', label:'Starts',   value: start },
          { icon:'👥', label:'Capacity', value: batch.maxStudents
              ? `${batch.maxStudents} students` : '—' },
        ].map(({ icon, label, value }) => (
          <div key={label}>
            <div style={{ fontSize:'0.67rem', fontWeight:600, color:'#94a3b8',
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

      {batch.description && (
        <div style={{ marginTop:11, fontSize:'0.77rem', color:'#64748b',
          lineHeight:1.5, borderTop:'1px solid #f1f5f9', paddingTop:10,
          display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {batch.description}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH FORM MODAL
// Courses loaded from courseSlice (state.courses.courses)
// Trainers loaded from adminSlice (state.admin.trainers)
// POST /api/batches  or  PUT /api/batches/:id
// ═══════════════════════════════════════════════════════════════════════════════

const BatchFormModal = ({ editBatch, trainers, courses, onClose }) => {
  const dispatch      = useDispatch();
  const createStatus  = useSelector(selectBatchCreateStatus);
  const createError   = useSelector(selectBatchCreateError);
  const updateStatus  = useSelector(selectBatchUpdateStatus);
  const updateError   = useSelector(selectBatchUpdateError);

  const isEdit = !!editBatch;

  const [form, setForm] = useState(
    isEdit ? {
      name:        editBatch.name        || '',
      description: editBatch.description || '',
      trainerId:   editBatch.trainerId?._id || editBatch.trainerId || '',
      startDate:   editBatch.startDate ? editBatch.startDate.slice(0, 10) : '',
      maxStudents: editBatch.maxStudents || 25,
      course:      editBatch.course      || '',
      status:      editBatch.status      || 'upcoming',
    } : { ...EMPTY_FORM }
  );

  // Default course to first option once courses load
  useEffect(() => {
    if (!form.course && courses.length > 0) {
      setForm(f => ({ ...f, course: courses[0].code || courses[0].name || '' }));
    }
  }, [courses]);

  const saving = createStatus === 'loading' || updateStatus === 'loading';
  const err    = createError  || updateError;
  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      maxStudents: Number(form.maxStudents),
      startDate:   form.startDate  || undefined,
      trainerId:   form.trainerId  || undefined,
    };

    const result = isEdit
      ? await dispatch(updateBatch({ id: editBatch._id, ...payload }))
      : await dispatch(createBatch(payload));

    const action = isEdit ? updateBatch : createBatch;
    if (action.fulfilled.match(result)) {
      toast.success(isEdit ? 'Batch updated!' : 'Batch created!');
      dispatch(resetBatchCreateStatus());
      dispatch(fetchBatches());
      onClose();
    }
  };

  return (
    <Modal onClose={onClose}>
      {/* Modal header */}
      <div style={{ display:'flex', alignItems:'center',
        justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:'1.05rem',
            color:'#0f172a', margin:0 }}>
            {isEdit ? '✏️ Edit Batch' : '➕ Add New Batch'}
          </h2>
          <p style={{ fontSize:'0.76rem', color:'#94a3b8', marginTop:3 }}>
            {isEdit ? 'Update batch details below.' : 'Fill in the details to create a new batch.'}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose}
          style={{ width:30, height:30, borderRadius:7, background:'#f1f5f9',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.88rem', color:'#64748b', flexShrink:0 }}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <FInput label="Batch Name" req placeholder="e.g. Batch 2026-A"
          value={form.name} onChange={e => set('name', e.target.value)} />

        {/* ── Course dropdown — from courseSlice ── */}
        <FSelect label="Course" req value={form.course}
          onChange={e => set('course', e.target.value)}>
          <option value="" disabled>
            {courses.length === 0 ? 'Loading courses…' : 'Select course…'}
          </option>
          {courses.map(c => (
            <option key={c._id} value={c.code || c.name}>
              {c.code ? `${c.code} — ${c.name}` : c.name}
            </option>
          ))}
        </FSelect>

        {/* ── Assign Trainer — from adminSlice ── */}
        <FSelect label="Assign Trainer" value={form.trainerId}
          onChange={e => set('trainerId', e.target.value)}>
          <option value="">— No trainer yet —</option>
          {trainers.map(t => (
            <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
          ))}
        </FSelect>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FInput label="Start Date" type="date"
            value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <FInput label="Max Students" req type="number" min="1" max="500"
            value={form.maxStudents} onChange={e => set('maxStudents', e.target.value)} />
        </div>

        <FSelect label="Status" value={form.status}
          onChange={e => set('status', e.target.value)}>
          {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </FSelect>

        <div style={{ marginBottom:18 }}>
          <FL>Description</FL>
          <textarea value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description…" rows={3} className="fi"
            style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8,
              padding:'9px 12px', fontSize:'0.85rem', color:'#0f172a',
              resize:'vertical', fontFamily:'inherit' }} />
        </div>

        {err && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca',
            borderRadius:8, padding:'9px 12px', fontSize:'0.77rem',
            color:'#b91c1c', marginBottom:14 }}>
            ⚠️ {err}
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button type="button" onClick={onClose} className="sbtn"
            style={{ flex:1, padding:'11px', borderRadius:9,
              border:'1.5px solid #e2e8f0', background:'#fff',
              color:'#374151', fontWeight:600, fontSize:'0.86rem',
              cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="sbtn"
            style={{ flex:2, padding:'11px', borderRadius:9, border:'none',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color:'#fff', fontWeight:700, fontSize:'0.86rem',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            {saving
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Create Batch')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const DeleteModal = ({ batch, onConfirm, onClose, deleting }) => (
  <Modal onClose={onClose}>
    <div style={{ textAlign:'center', padding:'8px 0' }}>
      <div style={{ width:56, height:56, borderRadius:14, background:'#fef2f2',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'1.6rem', margin:'0 auto 14px' }}>🗑️</div>
      <h2 style={{ fontWeight:800, fontSize:'1rem', color:'#0f172a', marginBottom:8 }}>
        Delete "{batch.name}"?
      </h2>
      <p style={{ fontSize:'0.82rem', color:'#64748b', marginBottom:22, lineHeight:1.6 }}>
        This action cannot be undone. The batch will be permanently removed.
      </p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} className="sbtn"
          style={{ flex:1, padding:'11px', borderRadius:9,
            border:'1.5px solid #e2e8f0', background:'#fff',
            color:'#374151', fontWeight:600, fontSize:'0.86rem',
            cursor:'pointer', fontFamily:'inherit' }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={deleting} className="sbtn"
          style={{ flex:1, padding:'11px', borderRadius:9, border:'none',
            background:'#dc2626', color:'#fff', fontWeight:700,
            fontSize:'0.86rem',
            cursor: deleting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </Modal>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const Batches = () => {
  const dispatch = useDispatch();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const role    = useSelector(selectUserRole);
  const isAdmin = role === 'admin';

  // ── Batches ───────────────────────────────────────────────────────────────
  const batches      = useSelector(selectAllBatches);
  const batchStatus  = useSelector(selectBatchesStatus);
  const batchError   = useSelector(selectBatchesError);
  const deleteStatus = useSelector(selectBatchDeleteStatus);
  const deleteError  = useSelector(selectBatchDeleteError);

  // ── Courses from courseSlice ───────────────────────────────────────────────
  // state.courses.courses — [{_id, name, code, status, ...}]
  const courses       = useSelector(selectAllCourses);
  const coursesStatus = useSelector(selectCoursesStatus);

  // ── Trainers from adminSlice ───────────────────────────────────────────────
  const trainers = useSelector(selectAdminTrainers);

  // ── Local UI ──────────────────────────────────────────────────────────────
  const [tab,    setTab]    = useState('all');
  const [search, setSearch] = useState('');
  const [modal,  setModal]  = useState(null);   // null | 'add' | 'edit' | 'delete'
  const [target, setTarget] = useState(null);

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchBatches());
    // Always fetch courses — needed for the form dropdown
    dispatch(fetchCourses());
    if (isAdmin) dispatch(fetchTrainers());
  }, [dispatch, isAdmin]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = batches.filter(b => {
    const matchTab    = tab === 'all' || b.status === tab;
    const matchSearch = !search
      || b.name?.toLowerCase().includes(search.toLowerCase())
      || b.course?.toLowerCase().includes(search.toLowerCase())
      || b.trainerId?.name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const stats = {
    total:     batches.length,
    active:    batches.filter(b => b.status === 'active').length,
    upcoming:  batches.filter(b => b.status === 'upcoming').length,
    completed: batches.filter(b => b.status === 'completed').length,
  };

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const openAdd    = ()  => { if (!isAdmin) return; dispatch(clearBatchErrors()); setTarget(null);  setModal('add'); };
  const openEdit   = (b) => { if (!isAdmin) return; dispatch(clearBatchErrors()); setTarget(b);     setModal('edit'); };
  const openDelete = (b) => { if (!isAdmin) return; setTarget(b); setModal('delete'); };
  const closeModal = ()  => { setModal(null); setTarget(null); dispatch(clearBatchErrors()); };

  const handleDelete = async () => {
    if (!target) return;
    const result = await dispatch(deleteBatch(target._id));
    if (deleteBatch.fulfilled.match(result)) {
      toast.success(`"${target.name}" deleted`);
      closeModal();
    } else {
      toast.error(deleteError || 'Failed to delete batch');
    }
  };

  const TABS = isAdmin
    ? ['all', 'active', 'upcoming', 'completed', 'cancelled']
    : ['all', 'active', 'upcoming', 'completed'];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc',
      fontFamily:"'DM Sans',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── HEADER ── */}
        <div className="header-row" style={{ display:'flex', alignItems:'flex-start',
          justifyContent:'space-between', flexWrap:'wrap', gap:14, marginBottom:26 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#0f172a',
                letterSpacing:'-0.4px', margin:0 }}>
                {isAdmin ? 'Batches' : 'My Batches'}
              </h1>
              {!isAdmin && (
                <span style={{ fontSize:'0.67rem', fontWeight:700, padding:'2px 8px',
                  borderRadius:99, background:'#f1f5f9', color:'#64748b',
                  letterSpacing:'0.5px', textTransform:'uppercase' }}>
                  View Only
                </span>
              )}
            </div>
            <p style={{ fontSize:'0.83rem', color:'#64748b', margin:0 }}>
              {isAdmin
                ? 'Create and manage training batches. Courses pulled from Course Catalogue.'
                : 'Your assigned training batches.'}
            </p>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {!isAdmin && (
              <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 13px',
                background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:9,
                fontSize:'0.77rem', color:'#0369a1', fontWeight:500 }}>
                🔒 Read-only
              </div>
            )}
            {isAdmin && (
              <button onClick={openAdd}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px',
                  borderRadius:9, border:'none',
                  background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color:'#fff', fontWeight:700, fontSize:'0.84rem', cursor:'pointer',
                  boxShadow:'0 2px 8px rgba(99,102,241,.35)', fontFamily:'inherit' }}>
                + Add Batch
              </button>
            )}
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="stats-grid" style={{ display:'grid',
          gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
          {[
            { label: isAdmin ? 'Total' : 'My Batches', value:stats.total,     color:'#6366f1', bg:'#eef2ff' },
            { label:'Active',                           value:stats.active,    color:'#15803d', bg:'#f0fdf4' },
            { label:'Upcoming',                         value:stats.upcoming,  color:'#1d4ed8', bg:'#eff6ff' },
            { label:'Done',                             value:stats.completed, color:'#374151', bg:'#f9fafb' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background:'#fff', border:'1px solid #e2e8f0',
              borderRadius:12, padding:'13px 15px', display:'flex', alignItems:'center', gap:11 }}>
              <div style={{ width:38, height:38, borderRadius:9, background:bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1.1rem', fontWeight:800, color, fontFamily:'DM Mono,monospace' }}>
                {value}
              </div>
              <div style={{ fontSize:'0.75rem', fontWeight:600, color:'#64748b',
                textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── SEARCH + TABS ── */}
        <div className="search-row" style={{ display:'flex', alignItems:'center',
          gap:12, flexWrap:'wrap', marginBottom:16 }}>
          <div style={{ position:'relative', flex:1, minWidth:180 }}>
            <span style={{ position:'absolute', left:11, top:'50%',
              transform:'translateY(-50%)', fontSize:'0.85rem', color:'#94a3b8' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, course, trainer…" className="fi"
              style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9,
                padding:'9px 12px 9px 34px', fontSize:'0.83rem', color:'#0f172a',
                background:'#fff', fontFamily:'inherit' }} />
          </div>
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:9, padding:3, gap:2 }}>
            {TABS.map(t => (
              <button key={t} className={`tab-btn ${tab === t ? 'act' : ''}`}
                onClick={() => setTab(t)}
                style={{ padding:'6px 12px', borderRadius:7, fontSize:'0.77rem',
                  fontWeight:600, color: tab === t ? '#0f172a' : '#64748b',
                  background:'transparent', fontFamily:'inherit',
                  textTransform:'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── ERROR ── */}
        {batchError && batchStatus === 'failed' && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca',
            borderRadius:9, padding:'10px 14px', fontSize:'0.79rem',
            color:'#b91c1c', marginBottom:14 }}>
            ⚠️ {batchError}
          </div>
        )}

        {/* ── LOADING ── */}
        {batchStatus === 'loading' && (
          <div className="batch-grid" style={{ display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer-row" />)}
          </div>
        )}

        {/* ── GRID ── */}
        {batchStatus !== 'loading' && filtered.length > 0 && (
          <div className="batch-grid" style={{ display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {filtered.map((b, i) => (
              <BatchCard key={b._id} batch={b} idx={i}
                isAdmin={isAdmin} onEdit={openEdit} onDelete={openDelete} />
            ))}
          </div>
        )}

        {/* ── EMPTY ── */}
        {batchStatus !== 'loading' && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>📦</div>
            <div style={{ fontWeight:700, fontSize:'0.94rem', marginBottom:6 }}>
              {search ? 'No batches match your search' : 'No batches found'}
            </div>
            <div style={{ fontSize:'0.81rem' }}>
              {isAdmin ? 'Click "+ Add Batch" to create one.' : 'No batches assigned yet.'}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── rendered at root level, centered overlay ── */}
      {(modal === 'add' || modal === 'edit') && (
        <BatchFormModal
          editBatch={modal === 'edit' ? target : null}
          trainers={trainers}
          courses={courses}
          onClose={closeModal}
        />
      )}

      {modal === 'delete' && target && (
        <DeleteModal
          batch={target}
          deleting={deleteStatus === 'loading'}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default Batches;