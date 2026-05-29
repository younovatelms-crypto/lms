import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchBatches, selectAllBatches } from '../../features/admin/adminSlice';

export default function AdminBatches() {
  const dispatch = useAppDispatch();
  const batches = useAppSelector(selectAllBatches);
  
  useEffect(() => { 
    dispatch(fetchBatches()); 
  }, [dispatch]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return { background: '#DCFCE7', color: '#15803D' };
      case 'completed': return { background: '#DBEAFE', color: '#1D4ED8' };
      case 'upcoming': return { background: '#FEF3C7', color: '#B45309' };
      default: return { background: '#F1F5F9', color: '#475569' };
    }
  };

  return (
    <div style={{ 
      padding: '32px 36px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#F8FAFC',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ 
          fontSize: 28, 
          fontWeight: 800, 
          marginBottom: 6, 
          color: '#0F172A',
          letterSpacing: '-0.5px'
        }}>
          Batches ({batches.length})
        </h2>
        <p style={{ 
          margin: 0, 
          color: '#64748B', 
          fontSize: 14,
          fontWeight: 500
        }}>
          Manage training batches and monitor their progress.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: 16 
      }}>
        {batches.map(b => (
          <div key={b._id} style={{ 
            background: '#ffffff', 
            borderRadius: 16, 
            padding: 20, 
            boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)', 
            border: '1px solid #E2E8F0',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0F172A', fontWeight: 700 }}>{b.name}</h3>
              <span style={{
                ...getStatusStyle(b.status),
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 999,
                fontWeight: 700,
                textTransform: 'capitalize'
              }}>
                {b.status}
              </span>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              Course: {b.course || '—'}
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              Trainer: {b.trainerId?.name || 'Unassigned'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B', fontWeight: 500 }}>
              Start: {b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'}
            </p>
          </div>
        ))}
        
        {batches.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            background: '#ffffff',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
          }}>
            <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>No batches found</p>
          </div>
        )}
      </div>
    </div>
  );
}
// src/pages/admin/Batches.jsx  (also works at src/pages/trainer/Batches.jsx)
// Role-aware: Admin gets full CRUD + Add Batch form. Trainer gets read-only view.
// All data via Redux: batchSlice (state.batches) + adminSlice trainers list

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

// ── batchSlice ──────────────────────────────────────────────────────────────
import {
  fetchBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  selectAllBatches,
  selectBatchesStatus,
  selectBatchesError,
  selectBatchCreateStatus,
  selectBatchCreateError,
  selectBatchUpdateStatus,
  selectBatchUpdateError,
  selectBatchDeleteStatus,
  resetBatchCreateStatus,
  clearBatchErrors,
} from '../../features/session/batchSlice';

// ── adminSlice — trainer list for the "Assign Trainer" dropdown (admin only) ──
import {
  fetchTrainers,
  selectAdminTrainers,
  selectAdminTrainersStatus,
} from '../../features/admin/adminSlice';

// ── auth ────────────────────────────────────────────────────────────────────
import { selectUserRole } from '../../features/auth/authSlice';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COURSES  = ['YIEP', 'Fullstack', 'Data Science', 'DevOps', 'UI/UX', 'Other'];
const STATUSES = ['upcoming', 'active', 'completed', 'cancelled'];

const STATUS_COLORS = {
  upcoming:  { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  active:    { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  completed: { bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
  cancelled: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
};

const EMPTY_FORM = {
  name:        '',
  description: '',
  trainerId:   '',
  startDate:   '',
  maxStudents: 25,
  course:      'YIEP',
  status:      'upcoming',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes slideIn  { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(8px);  } to { opacity:1; transform:translateY(0); } }
  @keyframes spin     { to   { transform: rotate(360deg); } }
  @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

  .batch-card { transition: box-shadow .18s, transform .18s; cursor:default; }
  .batch-card:hover { box-shadow: 0 8px 28px rgba(15,23,42,.12) !important; transform: translateY(-1px); }
  .icon-btn { transition: background .15s, transform .15s; border:none; cursor:pointer; }
  .icon-btn:hover { background: #f1f5f9 !important; transform: scale(1.08); }
  .delete-btn:hover { background: #fee2e2 !important; }
  .tab-btn { transition: all .15s; }
  .tab-btn:hover { background: #f8fafc !important; }
  .tab-btn.active { background: #fff !important; color: #0f172a !important; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  .form-input { transition: border-color .15s, box-shadow .15s; }
  .form-input:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
  .submit-btn { transition: opacity .15s, transform .15s; }
  .submit-btn:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
  .submit-btn:disabled { opacity:.55; cursor:not-allowed; }
  .shimmer-row {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 10px;
    height: 80px;
  }
  @media (max-width: 900px) {
    .page-layout { flex-direction: column !important; }
    .sidebar-panel { width: 100% !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.upcoming;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:c.bg, color:c.color,
      fontSize:'0.71rem', fontWeight:600, padding:'3px 10px', borderRadius:99 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot }} />
      {status}
    </span>
  );
};

const FieldLabel = ({ children, required }) => (
  <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'#374151', marginBottom:5 }}>
    {children}{required && <span style={{ color:'#ef4444', marginLeft:3 }}>*</span>}
  </label>
);

const Input = ({ label, required, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <input className="form-input" required={required} {...props}
      style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'9px 12px',
        fontSize:'0.85rem', color:'#0f172a', background:'#fff', fontFamily:'inherit', ...props.style }} />
  </div>
);

const Select = ({ label, required, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <FieldLabel required={required}>{label}</FieldLabel>}
    <div style={{ position:'relative' }}>
      <select className="form-input" required={required} {...props}
        style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'9px 32px 9px 12px',
          fontSize:'0.85rem', color:'#0f172a', background:'#fff', appearance:'none',
          WebkitAppearance:'none', cursor:'pointer', fontFamily:'inherit', ...props.style }}>
        {children}
      </select>
      <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
        pointerEvents:'none', color:'#94a3b8', fontSize:'0.7rem' }}>▾</span>
    </div>
  </div>
);

const Spinner = ({ size = 22 }) => (
  <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
    <div style={{ width:size, height:size, borderRadius:'50%', border:'2.5px solid #e2e8f0',
      borderTopColor:'#6366f1', animation:'spin .7s linear infinite' }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH CARD
// ═══════════════════════════════════════════════════════════════════════════════

const CARD_ACCENTS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6'];

const BatchCard = ({ batch, idx, isAdmin, onEdit, onDelete }) => {
  const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
  const initials = (batch.name || 'B').slice(0,2).toUpperCase();
  const trainer  = batch.trainerId?.name || '—';
  const start    = batch.startDate
    ? new Date(batch.startDate).toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' })
    : '—';

  return (
    <div className="batch-card" style={{
      background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
      padding:'18px 20px', position:'relative', overflow:'hidden',
      animation:'fadeUp .3s ease',
    }}>
      {/* Top accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent, borderRadius:'14px 14px 0 0' }} />

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        {/* Avatar + name */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:`${accent}18`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'DM Mono, monospace', fontWeight:500, fontSize:'0.85rem', color:accent, flexShrink:0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.92rem', color:'#0f172a', marginBottom:3 }}>
              {batch.name}
            </div>
            <StatusPill status={batch.status || 'upcoming'} />
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div style={{ display:'flex', gap:5, flexShrink:0 }}>
            <button className="icon-btn" onClick={() => onEdit(batch)}
              style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}
              title="Edit">✏️</button>
            <button className="icon-btn delete-btn" onClick={() => onDelete(batch)}
              style={{ width:30, height:30, borderRadius:7, background:'#f8fafc',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem' }}
              title="Delete">🗑️</button>
          </div>
        )}
      </div>

      {/* Meta grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', marginTop:14 }}>
        {[
          { icon:'🎓', label:'Course',    value: batch.course      || '—'  },
          { icon:'👤', label:'Trainer',   value: trainer                    },
          { icon:'📅', label:'Starts',    value: start                      },
          { icon:'👥', label:'Capacity',  value: batch.maxStudents ? `${batch.maxStudents} students` : '—' },
        ].map(({ icon, label, value }) => (
          <div key={label}>
            <div style={{ fontSize:'0.67rem', fontWeight:600, color:'#94a3b8',
              textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize:'0.82rem', fontWeight:500, color:'#374151',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {batch.description && (
        <div style={{ marginTop:12, fontSize:'0.78rem', color:'#64748b', lineHeight:1.5,
          borderTop:'1px solid #f1f5f9', paddingTop:10,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {batch.description}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADD / EDIT BATCH FORM  (admin only)
// POST /api/batches  or  PUT /api/batches/:id
// ═══════════════════════════════════════════════════════════════════════════════

const BatchForm = ({ editBatch, trainers, onClose }) => {
  const dispatch     = useDispatch();
  const createStatus = useSelector(selectBatchCreateStatus);
  const createError  = useSelector(selectBatchCreateError);
  const updateStatus = useSelector(selectBatchUpdateStatus);
  const updateError  = useSelector(selectBatchUpdateError);

  const isEdit = !!editBatch;
  const [form, setForm] = useState(
    isEdit ? {
      name:        editBatch.name        || '',
      description: editBatch.description || '',
      trainerId:   editBatch.trainerId?._id || editBatch.trainerId || '',
      startDate:   editBatch.startDate ? editBatch.startDate.slice(0,10) : '',
      maxStudents: editBatch.maxStudents || 25,
      course:      editBatch.course      || 'YIEP',
      status:      editBatch.status      || 'upcoming',
    } : { ...EMPTY_FORM }
  );

  const saving = createStatus === 'loading' || updateStatus === 'loading';
  const err    = createError  || updateError;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      maxStudents: Number(form.maxStudents),
      startDate:   form.startDate || undefined,
      trainerId:   form.trainerId || undefined,
    };

    let result;
    if (isEdit) {
      result = await dispatch(updateBatch({ id: editBatch._id, ...payload }));
    } else {
      result = await dispatch(createBatch(payload));
    }

    const action = isEdit ? updateBatch : createBatch;
    if (action.fulfilled.match(result)) {
      toast.success(isEdit ? 'Batch updated!' : 'Batch created!');
      dispatch(resetBatchCreateStatus());
      dispatch(fetchBatches());
      onClose();
    }
  };

  return (
    <div style={{ animation:'slideIn .25s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h3 style={{ fontWeight:700, fontSize:'1rem', color:'#0f172a' }}>
          {isEdit ? '✏️ Edit Batch' : '➕ Add New Batch'}
        </h3>
        <button className="icon-btn" onClick={onClose}
          style={{ width:28, height:28, borderRadius:6, background:'#f1f5f9',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'0.9rem', color:'#64748b' }}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <Input
          label="Batch Name" required
          placeholder="e.g. Batch 2026-A"
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />

        <Select
          label="Course" required
          value={form.course}
          onChange={e => set('course', e.target.value)}
        >
          {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Select
          label="Assign Trainer"
          value={form.trainerId}
          onChange={e => set('trainerId', e.target.value)}
        >
          <option value="">— No trainer yet —</option>
          {trainers.map(t => (
            <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
          ))}
        </Select>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Input
            label="Start Date"
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
          <Input
            label="Max Students" required
            type="number" min="1" max="500"
            value={form.maxStudents}
            onChange={e => set('maxStudents', e.target.value)}
          />
        </div>

        <Select
          label="Status"
          value={form.status}
          onChange={e => set('status', e.target.value)}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>

        <div style={{ marginBottom:18 }}>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description of this batch…"
            rows={3}
            className="form-input"
            style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'9px 12px',
              fontSize:'0.85rem', color:'#0f172a', resize:'vertical', fontFamily:'inherit' }}
          />
        </div>

        {err && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
            padding:'9px 12px', fontSize:'0.77rem', color:'#b91c1c', marginBottom:14 }}>
            ⚠️ {err}
          </div>
        )}

        <button
          type="submit" disabled={saving} className="submit-btn"
          style={{ width:'100%', padding:'11px', borderRadius:9, border:'none',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color:'#fff', fontWeight:700, fontSize:'0.88rem', fontFamily:'inherit' }}
        >
          {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Batch')}
        </button>
      </form>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM
// ═══════════════════════════════════════════════════════════════════════════════

const DeleteConfirm = ({ batch, onConfirm, onCancel, deleting }) => (
  <div style={{ animation:'fadeUp .2s ease', textAlign:'center', padding:'8px 0' }}>
    <div style={{ fontSize:'2.2rem', marginBottom:12 }}>🗑️</div>
    <h3 style={{ fontWeight:700, fontSize:'0.96rem', color:'#0f172a', marginBottom:8 }}>
      Delete "{batch.name}"?
    </h3>
    <p style={{ fontSize:'0.8rem', color:'#64748b', marginBottom:20, lineHeight:1.5 }}>
      This will permanently remove the batch and cannot be undone.
    </p>
    <div style={{ display:'flex', gap:10 }}>
      <button onClick={onCancel} className="submit-btn"
        style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e2e8f0',
          background:'#fff', color:'#374151', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', fontFamily:'inherit' }}>
        Cancel
      </button>
      <button onClick={onConfirm} disabled={deleting} className="submit-btn"
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

const Batches = () => {
  const dispatch = useDispatch();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const role    = useSelector(selectUserRole);
  const isAdmin = role === 'admin';

  // ── Batches ─────────────────────────────────────────────────────────────────
  const batches       = useSelector(selectAllBatches);
  const batchesStatus = useSelector(selectBatchesStatus);
  const batchesError  = useSelector(selectBatchesError);
  const deleteStatus  = useSelector(selectBatchDeleteStatus);

  // ── Trainers list (for admin form dropdown) ─────────────────────────────────
  const trainers       = useSelector(selectAdminTrainers);
  const trainersStatus = useSelector(selectAdminTrainersStatus);

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [tab,         setTab]         = useState('all');       // all | active | upcoming | completed
  const [search,      setSearch]      = useState('');
  const [sidePanel,   setSidePanel]   = useState(null);        // null | 'add' | 'edit' | 'delete'
  const [targetBatch, setTargetBatch] = useState(null);

  // ── Fetch on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchBatches());
    if (isAdmin) dispatch(fetchTrainers());
  }, [dispatch, isAdmin]);

  // ── Derived list ─────────────────────────────────────────────────────────────
  const filtered = batches.filter(b => {
    const matchTab    = tab === 'all' || b.status === tab;
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.course?.toLowerCase().includes(search.toLowerCase()) ||
      b.trainerId?.name?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  // ── Stats strip ──────────────────────────────────────────────────────────────
  const stats = {
    total:     batches.length,
    active:    batches.filter(b => b.status === 'active').length,
    upcoming:  batches.filter(b => b.status === 'upcoming').length,
    completed: batches.filter(b => b.status === 'completed').length,
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openAdd    = () => { if (!isAdmin) return; setTargetBatch(null); setSidePanel('add'); };
  const openEdit   = (b) => { if (!isAdmin) return; setTargetBatch(b);    setSidePanel('edit'); };
  const openDelete = (b) => { if (!isAdmin) return; setTargetBatch(b);    setSidePanel('delete'); };
  const closePanel = () => { setSidePanel(null); setTargetBatch(null); dispatch(clearBatchErrors()); };

  const handleDelete = async () => {
    if (!targetBatch) return;
    const result = await dispatch(deleteBatch(targetBatch._id));
    if (deleteBatch.fulfilled.match(result)) {
      toast.success(`"${targetBatch.name}" deleted`);
      closePanel();
    } else {
      toast.error('Failed to delete batch');
    }
  };

  const TABS = isAdmin ? ['all', 'active', 'upcoming', 'completed', 'cancelled'] : ['all', 'active', 'upcoming', 'completed'];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans', system-ui, sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>

      <div style={{ maxWidth:1320, margin:'0 auto', padding:'28px 24px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:28 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
              <h1 style={{ fontSize:'1.55rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.4px', margin:0 }}>
                {isAdmin ? 'Batches' : 'My Batches'}
              </h1>
              {!isAdmin && (
                <span style={{ fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:99,
                  background:'#f1f5f9', color:'#64748b', letterSpacing:'0.5px', textTransform:'uppercase' }}>
                  View Only
                </span>
              )}
            </div>
            <p style={{ fontSize:'0.84rem', color:'#64748b' }}>
              {isAdmin ? 'Manage all training batches — create, assign trainers, and track progress.'
                       : 'Your assigned training batches.'}
            </p>
          </div>

          {/* Trainer read-only notice */}
          {!isAdmin && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
              background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:9,
              fontSize:'0.78rem', color:'#0369a1', fontWeight:500 }}>
              <span>🔒</span>
              <span>Read-only — contact admin to make changes</span>
            </div>
          )}

          {/* Add Batch — admin only */}
          {isAdmin && (
            <button
              onClick={openAdd}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px',
                borderRadius:9, border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                color:'#fff', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                boxShadow:'0 2px 8px rgba(99,102,241,.35)', fontFamily:'inherit',
                transition:'box-shadow .15s, transform .15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 16px rgba(99,102,241,.5)'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(99,102,241,.35)'; e.currentTarget.style.transform=''; }}
            >
              <span style={{ fontSize:'1rem' }}>+</span> Add Batch
            </button>
          )}
        </div>

        {/* ── STATS STRIP ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label: isAdmin ? 'Total' : 'My Batches', value: stats.total, color:'#6366f1', bg:'#eef2ff' },
            { label:'Active',   value: stats.active,    color:'#15803d', bg:'#f0fdf4' },
            { label:'Upcoming', value: stats.upcoming,  color:'#1d4ed8', bg:'#eff6ff' },
            { label:'Done',     value: stats.completed, color:'#374151', bg:'#f9fafb' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
              padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:bg,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'1.2rem', fontWeight:800, color, fontFamily:'DM Mono, monospace' }}>
                {value}
              </div>
              <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div className="page-layout" style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

          {/* ── CONTENT PANEL ── */}
          <div style={{ flex:1, minWidth:0 }}>

            {/* Search + Tabs */}
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:18 }}>
              {/* Search */}
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:'0.85rem', color:'#94a3b8' }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, course, trainer…"
                  className="form-input"
                  style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9, padding:'9px 12px 9px 34px',
                    fontSize:'0.84rem', color:'#0f172a', background:'#fff', fontFamily:'inherit' }}
                />
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', background:'#f1f5f9', borderRadius:9, padding:3, gap:2 }}>
                {TABS.map(t => (
                  <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`}
                    onClick={() => setTab(t)}
                    style={{ padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer',
                      fontSize:'0.78rem', fontWeight:600,
                      color: tab === t ? '#0f172a' : '#64748b',
                      background: 'transparent', fontFamily:'inherit', textTransform:'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {batchesError && batchesStatus === 'failed' && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9,
                padding:'10px 14px', fontSize:'0.79rem', color:'#b91c1c', marginBottom:16 }}>
                ⚠️ {batchesError}
              </div>
            )}

            {/* Loading shimmer */}
            {batchesStatus === 'loading' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer-row" />)}
              </div>
            )}

            {/* Batch grid */}
            {batchesStatus !== 'loading' && filtered.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {filtered.map((b, i) => (
                  <BatchCard
                    key={b._id} batch={b} idx={i}
                    isAdmin={isAdmin}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {batchesStatus !== 'loading' && filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                <div style={{ fontSize:'3rem', marginBottom:12 }}>📦</div>
                <div style={{ fontWeight:600, fontSize:'0.95rem', marginBottom:6 }}>
                  {search ? 'No batches match your search' : 'No batches found'}
                </div>
                <div style={{ fontSize:'0.82rem' }}>
                  {isAdmin ? 'Click "Add Batch" to create the first one.' : 'No batches assigned yet.'}
                </div>
              </div>
            )}
          </div>

          {/* ── SIDE PANEL ── */}
          {sidePanel && (
            <div className="sidebar-panel" style={{ width:340, flexShrink:0, background:'#fff',
              border:'1px solid #e2e8f0', borderRadius:14, padding:'22px 20px',
              boxShadow:'0 4px 20px rgba(15,23,42,.08)', animation:'slideIn .25s ease' }}>
              {sidePanel === 'delete' ? (
                <DeleteConfirm
                  batch={targetBatch}
                  deleting={deleteStatus === 'loading'}
                  onConfirm={handleDelete}
                  onCancel={closePanel}
                />
              ) : (
                <BatchForm
                  editBatch={sidePanel === 'edit' ? targetBatch : null}
                  trainers={trainers}
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

export default Batches;
