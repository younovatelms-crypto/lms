// src/pages/admin/Batches.jsx
// Role-aware: Admin gets full CRUD. Trainer gets read-only.
// TABLE layout with Create / View / Edit / Delete, multi-filter + pagination.
// View → /admin/batches/view/:id (BatchDetails page).

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  fetchBatches,  createBatch,  updateBatch,  deleteBatch,
  selectAllBatches, selectBatchesStatus, selectBatchesError,
  selectBatchCreateStatus, selectBatchCreateError,
  selectBatchUpdateStatus, selectBatchUpdateError,
  selectBatchDeleteStatus, selectBatchDeleteError,
  resetBatchCreateStatus, clearBatchErrors,
} from '../../features/session/batchSlice';

import {
  fetchCourses,
  selectAllCourses,
  selectCoursesStatus,
} from '../../features/admin/courseSlice';

import {
  fetchTrainers,
  selectAdminTrainers,
} from '../../features/admin/adminSlice';

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

const ROWS_OPTIONS = [5, 10, 20, 50];

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

  .icon-btn { transition:background .15s,transform .15s; border:none; cursor:pointer; }
  .icon-btn:hover { background:#f1f5f9!important; transform:scale(1.08); }
  .del-btn:hover  { background:#fee2e2!important; }
  .view-btn:hover { background:#eff6ff!important; }
  .fi { transition:border-color .15s,box-shadow .15s; }
  .fi:focus { outline:none!important; border-color:#6366f1!important; box-shadow:0 0 0 3px rgba(99,102,241,.12)!important; }
  .sbtn { transition:opacity .15s,transform .15s; }
  .sbtn:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
  .sbtn:disabled { opacity:.5; cursor:not-allowed; }
  .tr-row:hover { background:#f9fafb!important; }
  .pg-btn { transition:all .15s; cursor:pointer; }
  .pg-btn:hover:not(:disabled) { background:#f1f5f9!important; }
  .pg-btn:disabled { opacity:.4; cursor:not-allowed; }

  .modal-overlay {
    position:fixed; inset:0; background:rgba(15,23,42,.45);
    backdrop-filter:blur(3px); display:flex; align-items:center;
    justify-content:center; z-index:9999; padding:16px; animation:fadeUp .2s ease;
  }
  .modal-box {
    background:#fff; border-radius:18px; width:100%; max-width:480px;
    max-height:90vh; overflow-y:auto; padding:28px 28px 24px;
    box-shadow:0 24px 60px rgba(15,23,42,.22);
    animation:modalIn .25s cubic-bezier(.34,1.3,.64,1);
  }

  /* table responsiveness — progressively hide secondary columns */
  @media (max-width: 900px) { .col-cap     { display:none!important; } }
  @media (max-width: 760px) { .col-trainer { display:none!important; } }
  @media (max-width: 600px) { .col-course  { display:none!important; } }
  @media (max-width: 480px) { .col-start   { display:none!important; } }

  @media (max-width:520px) {
    .modal-box  { padding:20px 16px 18px; border-radius:14px; }
    .stats-grid { grid-template-columns:repeat(2,1fr)!important; }
    .header-row { flex-direction:column!important; align-items:flex-start!important; }
    .filter-row { flex-direction:column!important; align-items:stretch!important; }
    .filter-row > * { width:100%!important; }
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
      padding:'2px 9px', borderRadius:99, whiteSpace:'nowrap' }}>
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

// compact filter <select> for the toolbar (no margin/label wrapper)
const FilterSelect = ({ value, onChange, children }) => (
  <div style={{ position:'relative', minWidth:150 }}>
    <select value={value} onChange={onChange} className="fi"
      style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9,
        padding:'9px 30px 9px 12px', fontSize:'0.82rem', color:'#0f172a',
        background:'#fff', appearance:'none', WebkitAppearance:'none',
        cursor:'pointer', fontFamily:'inherit' }}>
      {children}
    </select>
    <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
      pointerEvents:'none', color:'#94a3b8', fontSize:'0.7rem' }}>▾</span>
  </div>
);

const Modal = ({ onClose, children }) => {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH FORM MODAL
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:'1.05rem', color:'#0f172a', margin:0 }}>
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
            style={{ flex:1, padding:'11px', borderRadius:9, border:'1.5px solid #e2e8f0',
              background:'#fff', color:'#374151', fontWeight:600, fontSize:'0.86rem',
              cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="sbtn"
            style={{ flex:2, padding:'11px', borderRadius:9, border:'none',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color:'#fff', fontWeight:700, fontSize:'0.86rem',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Batch')}
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
          style={{ flex:1, padding:'11px', borderRadius:9, border:'1.5px solid #e2e8f0',
            background:'#fff', color:'#374151', fontWeight:600, fontSize:'0.86rem',
            cursor:'pointer', fontFamily:'inherit' }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={deleting} className="sbtn"
          style={{ flex:1, padding:'11px', borderRadius:9, border:'none',
            background:'#dc2626', color:'#fff', fontWeight:700, fontSize:'0.86rem',
            cursor: deleting ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </Modal>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE  (TABLE)
// ═══════════════════════════════════════════════════════════════════════════════

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const Batches = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const role    = useSelector(selectUserRole);
  const isAdmin = role === 'admin';

  const batches      = useSelector(selectAllBatches) ?? [];
  const batchStatus  = useSelector(selectBatchesStatus);
  const batchError   = useSelector(selectBatchesError);
  const deleteStatus = useSelector(selectBatchDeleteStatus);
  const deleteError  = useSelector(selectBatchDeleteError);

  const courses  = useSelector(selectAllCourses) ?? [];
  const trainers = useSelector(selectAdminTrainers) ?? [];

  // ── Filters ──
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [courseFilter,  setCourseFilter]  = useState('all');
  const [trainerFilter, setTrainerFilter] = useState('all');

  // ── Pagination ──
  const [page, setPage]               = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── Modals ──
  const [modal,  setModal]  = useState(null);   // null | 'add' | 'edit' | 'delete'
  const [target, setTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchBatches());
    dispatch(fetchCourses());
    if (isAdmin) dispatch(fetchTrainers());
  }, [dispatch, isAdmin]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1); }, [search, statusFilter, courseFilter, trainerFilter, rowsPerPage]);

  // Distinct courses / trainers present in the data, for the filter dropdowns
  const courseOptions = useMemo(
    () => Array.from(new Set(batches.map(b => b.course).filter(Boolean))).sort(),
    [batches]
  );
  const trainerOptions = useMemo(
    () => Array.from(new Set(batches.map(b => b.trainerId?.name).filter(Boolean))).sort(),
    [batches]
  );

  // ── Apply all filters ──
  const filtered = useMemo(() => batches.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || b.name?.toLowerCase().includes(q)
      || b.course?.toLowerCase().includes(q)
      || b.trainerId?.name?.toLowerCase().includes(q);
    const matchStatus  = statusFilter  === 'all' || b.status === statusFilter;
    const matchCourse  = courseFilter  === 'all' || b.course === courseFilter;
    const matchTrainer = trainerFilter === 'all' || b.trainerId?.name === trainerFilter;
    return matchSearch && matchStatus && matchCourse && matchTrainer;
  }), [batches, search, statusFilter, courseFilter, trainerFilter]);

  const stats = {
    total:     batches.length,
    active:    batches.filter(b => b.status === 'active').length,
    upcoming:  batches.filter(b => b.status === 'upcoming').length,
    completed: batches.filter(b => b.status === 'completed').length,
  };

  // ── Pagination math ──
  const totalRows  = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * rowsPerPage;
  const pageRows   = filtered.slice(startIdx, startIdx + rowsPerPage);

  const activeFilters = (statusFilter !== 'all') + (courseFilter !== 'all') + (trainerFilter !== 'all') + (search ? 1 : 0);

  const resetFilters = () => {
    setSearch(''); setStatusFilter('all'); setCourseFilter('all'); setTrainerFilter('all');
  };

  // ── Modal / action handlers ──
  const openAdd    = ()  => { if (!isAdmin) return; dispatch(clearBatchErrors()); setTarget(null); setModal('add'); };
  const openEdit   = (b) => { if (!isAdmin) return; dispatch(clearBatchErrors()); setTarget(b);    setModal('edit'); };
  const openDelete = (b) => { if (!isAdmin) return; setTarget(b); setModal('delete'); };
  const openView   = (b) => navigate(`/admin/batches/view/${b._id}`);
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

  const th = {
    textAlign:'left', padding:'11px 14px', fontSize:'0.67rem', fontWeight:700,
    color:'#64748b', textTransform:'uppercase', letterSpacing:'0.6px',
    borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap', background:'#f8fafc',
  };
  const td = { padding:'11px 14px', fontSize:'0.83rem', color:'#374151', borderBottom:'1px solid #f1f5f9' };

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc',
      fontFamily:"'DM Sans',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── HEADER ── */}
        <div className="header-row" style={{ display:'flex', alignItems:'flex-start',
          justifyContent:'space-between', flexWrap:'wrap', gap:14, marginBottom:22 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#0f172a',
                letterSpacing:'-0.4px', margin:0 }}>
                {isAdmin ? 'Batches' : 'My Batches'}
              </h1>
              {!isAdmin && (
                <span style={{ fontSize:'0.67rem', fontWeight:700, padding:'2px 8px',
                  borderRadius:99, background:'#f1f5f9', color:'#64748b',
                  letterSpacing:'0.5px', textTransform:'uppercase' }}>View Only</span>
              )}
            </div>
            <p style={{ fontSize:'0.83rem', color:'#64748b', margin:0 }}>
              {isAdmin ? 'Create, view, edit and manage training batches.' : 'Your assigned training batches.'}
            </p>
          </div>

          {isAdmin && (
            <button onClick={openAdd}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px',
                borderRadius:9, border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                color:'#fff', fontWeight:700, fontSize:'0.84rem', cursor:'pointer',
                boxShadow:'0 2px 8px rgba(99,102,241,.35)', fontFamily:'inherit' }}>
              + Add Batch
            </button>
          )}
        </div>

        {/* ── STATS ── */}
        <div className="stats-grid" style={{ display:'grid',
          gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
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

        {/* ── FILTER BAR (multiple filters) ── */}
        <div className="filter-row" style={{ display:'flex', alignItems:'center',
          gap:10, flexWrap:'wrap', marginBottom:16 }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <span style={{ position:'absolute', left:11, top:'50%',
              transform:'translateY(-50%)', fontSize:'0.85rem', color:'#94a3b8' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, course, trainer…" className="fi"
              style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9,
                padding:'9px 12px 9px 34px', fontSize:'0.83rem', color:'#0f172a',
                background:'#fff', fontFamily:'inherit' }} />
          </div>

          <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {BATCH_STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </FilterSelect>

          <FilterSelect value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
            <option value="all">All courses</option>
            {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>

          <FilterSelect value={trainerFilter} onChange={e => setTrainerFilter(e.target.value)}>
            <option value="all">All trainers</option>
            {trainerOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </FilterSelect>

          {activeFilters > 0 && (
            <button onClick={resetFilters} className="sbtn"
              style={{ padding:'9px 14px', borderRadius:9, border:'1.5px solid #fecaca',
                background:'#fef2f2', color:'#dc2626', fontWeight:600, fontSize:'0.8rem',
                cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
              ✕ Clear ({activeFilters})
            </button>
          )}
        </div>

        {/* ── ERROR ── */}
        {batchError && batchStatus === 'failed' && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca',
            borderRadius:9, padding:'10px 14px', fontSize:'0.79rem',
            color:'#b91c1c', marginBottom:14 }}>⚠️ {batchError}</div>
        )}

        {/* ── TABLE CARD ── */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Batch</th>
                  <th style={th} className="col-course">Course</th>
                  <th style={th} className="col-trainer">Trainer</th>
                  <th style={th} className="col-start">Starts</th>
                  <th style={th} className="col-cap">Capacity</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batchStatus === 'loading' ? (
                  <tr><td colSpan={8} style={{ padding:0 }}>
                    <div style={{ height:240, background:'linear-gradient(90deg,#f8fafc 25%,#eef2f7 50%,#f8fafc 75%)',
                      backgroundSize:'400px 100%', animation:'shimmer 1.4s infinite' }} />
                  </td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:'52px 20px', color:'#94a3b8' }}>
                    <div style={{ fontSize:'2.6rem', marginBottom:10 }}>📦</div>
                    <div style={{ fontWeight:700, fontSize:'0.92rem', marginBottom:5 }}>
                      {activeFilters > 0 ? 'No batches match your filters' : 'No batches found'}
                    </div>
                    <div style={{ fontSize:'0.8rem' }}>
                      {isAdmin && activeFilters === 0 ? 'Click "+ Add Batch" to create one.' : 'Try adjusting your filters.'}
                    </div>
                  </td></tr>
                ) : (
                  pageRows.map((b, i) => {
                    const accent = CARD_ACCENTS[(startIdx + i) % CARD_ACCENTS.length];
                    return (
                      <tr key={b._id} className="tr-row" style={{ transition:'background .12s' }}>
                        <td style={{ ...td, color:'#94a3b8', width:40 }}>{startIdx + i + 1}</td>
                        <td style={td}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:8, flexShrink:0,
                              background:`${accent}18`, color:accent, display:'flex',
                              alignItems:'center', justifyContent:'center', fontWeight:700,
                              fontSize:'0.74rem', fontFamily:'DM Mono,monospace' }}>
                              {(b.name || 'B').slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:700, color:'#0f172a', fontSize:'0.85rem',
                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>
                                {b.name}
                              </div>
                              {b.description && (
                                <div style={{ fontSize:'0.72rem', color:'#94a3b8', whiteSpace:'nowrap',
                                  overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>
                                  {b.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={td} className="col-course">{b.course || '—'}</td>
                        <td style={td} className="col-trainer">{b.trainerId?.name || '—'}</td>
                        <td style={td} className="col-start">{fmtDate(b.startDate)}</td>
                        <td style={td} className="col-cap">{b.maxStudents ? `${b.maxStudents}` : '—'}</td>
                        <td style={td}><StatusPill status={b.status || 'upcoming'} /></td>
                        <td style={{ ...td }}>
                          <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                            <button className="icon-btn view-btn" title="View" onClick={() => openView(b)}
                              style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.82rem' }}>👁️</button>
                            {isAdmin && (
                              <>
                                <button className="icon-btn" title="Edit" onClick={() => openEdit(b)}
                                  style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>✏️</button>
                                <button className="icon-btn del-btn" title="Delete" onClick={() => openDelete(b)}
                                  style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}>🗑️</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATOR ── */}
          {batchStatus !== 'loading' && totalRows > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              gap:12, padding:'12px 16px', borderTop:'1px solid #e2e8f0', flexWrap:'wrap' }}>
              <div style={{ fontSize:'0.78rem', color:'#64748b', fontWeight:500 }}>
                Showing <strong style={{ color:'#0f172a' }}>{startIdx + 1}–{Math.min(startIdx + rowsPerPage, totalRows)}</strong> of <strong style={{ color:'#0f172a' }}>{totalRows}</strong>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:'0.78rem', color:'#64748b', fontWeight:600 }}>Rows:</span>
                  <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} className="fi"
                    style={{ padding:'6px 8px', borderRadius:7, border:'1.5px solid #e2e8f0',
                      background:'#fff', fontWeight:700, color:'#0f172a', fontSize:'0.8rem', cursor:'pointer' }}>
                    {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <button className="pg-btn" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding:'7px 12px', borderRadius:7, border:'1px solid #e2e8f0',
                    background:'#fff', fontSize:'0.8rem', fontWeight:600, color:'#475569', fontFamily:'inherit' }}>
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => {
                    const gap = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {gap && <span style={{ color:'#94a3b8', fontSize:'0.8rem' }}>…</span>}
                        <button onClick={() => setPage(p)}
                          style={{ minWidth:34, padding:'7px 10px', borderRadius:7,
                            border:`1px solid ${p === safePage ? '#6366f1' : '#e2e8f0'}`,
                            background: p === safePage ? '#6366f1' : '#fff',
                            color: p === safePage ? '#fff' : '#475569',
                            fontWeight: p === safePage ? 700 : 500, fontSize:'0.8rem',
                            cursor:'pointer', fontFamily:'inherit' }}>
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button className="pg-btn" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding:'7px 12px', borderRadius:7, border:'1px solid #e2e8f0',
                    background:'#fff', fontSize:'0.8rem', fontWeight:600, color:'#475569', fontFamily:'inherit' }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
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