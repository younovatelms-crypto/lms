// src/pages/admin/BatchDetails.jsx
// Route: /admin/batches/view/:id
// Shows a single batch's full info + enrolled students (multi-batch aware) + tabs.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// batchSlice — list is the source; we find the batch by id (fetch if empty)
import {
  fetchBatches,
  selectAllBatches,
  selectBatchesStatus,
} from '../../features/session/batchSlice';

// adminSlice — trainees, to derive who is in this batch
import {
  fetchAdminTrainees,
  selectAllAdminTrainees,
  selectAdminTraineesStatus,
} from '../../features/admin/adminSlice';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  upcoming:  { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  active:    { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  completed: { bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
  cancelled: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// Does this trainee belong to the given batch? (batchIds = [obj|id], or legacy batchId)
const traineeInBatch = (t, batchId) => {
  const src = Array.isArray(t.batchIds) && t.batchIds.length
    ? t.batchIds
    : (t.batchId ? [t.batchId] : []);
  return src.some((b) => String(b && typeof b === 'object' ? b._id : b) === String(batchId));
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing:border-box; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  .bd-tab { transition:all .15s; border:none; cursor:pointer; }
  .bd-tab.act { background:#fff!important; color:#0f172a!important; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  .bd-row:hover { background:#f9fafb!important; }
  .fi:focus { outline:none!important; border-color:#6366f1!important; box-shadow:0 0 0 3px rgba(99,102,241,.12)!important; }
  @media (max-width:640px){
    .bd-stats { grid-template-columns:repeat(2,1fr)!important; }
    .bd-info  { grid-template-columns:1fr!important; }
    .bd-head  { flex-direction:column!important; align-items:flex-start!important; }
  }
`;

const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.upcoming;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:c.bg, color:c.color,
      fontSize:'0.74rem', fontWeight:600, padding:'3px 11px', borderRadius:99 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot }} />
      {status}
    </span>
  );
};

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
    <div style={{ width:26, height:26, borderRadius:'50%', border:'3px solid #e2e8f0',
      borderTopColor:'#6366f1', animation:'spin .7s linear infinite' }} />
  </div>
);

const BatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const batches       = useSelector(selectAllBatches) ?? [];
  const batchStatus   = useSelector(selectBatchesStatus);
  const trainees      = useSelector(selectAllAdminTrainees) ?? [];
  const traineeStatus = useSelector(selectAdminTraineesStatus);

  const [tab, setTab]       = useState('overview');
  const [search, setSearch] = useState('');

  // Fetch the lists if we landed here directly (deep link / refresh).
  useEffect(() => {
    if (!batches.length) dispatch(fetchBatches());
    dispatch(fetchAdminTrainees());
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const batch = useMemo(
    () => batches.find((b) => String(b._id) === String(id)),
    [batches, id]
  );

  // Students enrolled in this batch.
  const students = useMemo(
    () => trainees.filter((t) => traineeInBatch(t, id)),
    [trainees, id]
  );

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  const loading = (batchStatus === 'loading' && !batch);

  const BackBtn = () => (
    <button
      onClick={() => navigate('/admin/batches')}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px',
        borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#475569',
        fontWeight:600, fontSize:'0.82rem', cursor:'pointer', fontFamily:'inherit', marginBottom:18 }}
    >
      ← Back to batches
    </button>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans',system-ui,sans-serif", color:'#0f172a' }}>
      <style>{CSS}</style>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>
        <BackBtn />

        {loading ? (
          <Spinner />
        ) : !batch ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🔍</div>
            <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:6 }}>Batch not found</div>
            <div style={{ fontSize:'0.82rem' }}>It may have been deleted, or the link is invalid.</div>
          </div>
        ) : (
          <div style={{ animation:'fadeUp .3s ease' }}>
            {/* ── HEADER ── */}
            <div className="bd-head" style={{ display:'flex', justifyContent:'space-between',
              alignItems:'flex-start', gap:16, background:'#fff', border:'1px solid #e2e8f0',
              borderRadius:16, padding:'22px 24px', marginBottom:18 }}>
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ width:54, height:54, borderRadius:12, background:'#eef2ff',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#6366f1',
                  fontWeight:700, fontSize:'1.1rem', fontFamily:'DM Mono,monospace' }}>
                  {(batch.name || 'B').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ fontSize:'1.4rem', fontWeight:800, margin:0, letterSpacing:'-0.4px' }}>
                    {batch.name}
                  </h1>
                  <div style={{ marginTop:6 }}><StatusPill status={batch.status || 'upcoming'} /></div>
                </div>
              </div>
              <div style={{ fontSize:'0.8rem', color:'#64748b', textAlign:'right' }}>
                <div style={{ fontWeight:600, color:'#374151' }}>{batch.course || '—'}</div>
                <div style={{ marginTop:2 }}>Starts {fmtDate(batch.startDate)}</div>
              </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="bd-stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
              gap:12, marginBottom:18 }}>
              {[
                { label:'Enrolled',  value: students.length, bg:'#eef2ff', color:'#6366f1' },
                { label:'Capacity',  value: batch.maxStudents ?? '—', bg:'#f0fdf4', color:'#15803d' },
                { label:'Trainer',   value: batch.trainerId?.name || '—', bg:'#eff6ff', color:'#1d4ed8', small:true },
                { label:'Status',    value: batch.status || 'upcoming', bg:'#f9fafb', color:'#374151', small:true },
              ].map(({ label, value, bg, color, small }) => (
                <div key={label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: small ? '0.92rem' : '1.5rem', fontWeight:800, color,
                    fontFamily: small ? 'inherit' : 'DM Mono,monospace', whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── TABS ── */}
            <div style={{ display:'inline-flex', background:'#f1f5f9', borderRadius:10, padding:3, gap:2, marginBottom:16 }}>
              {['overview', 'students'].map((t) => (
                <button key={t} className={`bd-tab ${tab === t ? 'act' : ''}`} onClick={() => setTab(t)}
                  style={{ padding:'8px 18px', borderRadius:8, fontSize:'0.82rem', fontWeight:600,
                    color: tab === t ? '#0f172a' : '#64748b', background:'transparent', fontFamily:'inherit', textTransform:'capitalize' }}>
                  {t === 'students' ? `Students (${students.length})` : 'Overview'}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'22px 24px' }}>
                <div className="bd-info" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 24px' }}>
                  {[
                    ['Course',       batch.course || '—'],
                    ['Trainer',      batch.trainerId?.name || '—'],
                    ['Trainer Email',batch.trainerId?.email || '—'],
                    ['Start Date',   fmtDate(batch.startDate)],
                    ['Max Students', batch.maxStudents ?? '—'],
                    ['Enrolled',     `${students.length} student${students.length === 1 ? '' : 's'}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{k}</div>
                      <div style={{ fontSize:'0.88rem', fontWeight:500, color:'#0f172a' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {batch.description && (
                  <div style={{ marginTop:20, borderTop:'1px solid #f1f5f9', paddingTop:16 }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Description</div>
                    <p style={{ fontSize:'0.86rem', color:'#475569', lineHeight:1.6, margin:0 }}>{batch.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── STUDENTS TAB ── */}
            {tab === 'students' && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid #f1f5f9' }}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="fi"
                    placeholder="Search students by name or email…"
                    style={{ width:'100%', border:'1.5px solid #e2e8f0', borderRadius:9, padding:'9px 13px',
                      fontSize:'0.85rem', color:'#0f172a', fontFamily:'inherit' }} />
                </div>

                {traineeStatus === 'loading' ? (
                  <Spinner />
                ) : students.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'48px 20px', color:'#94a3b8' }}>
                    <div style={{ fontSize:'2.4rem', marginBottom:10 }}>🎓</div>
                    <div style={{ fontWeight:700, fontSize:'0.9rem' }}>No students enrolled yet</div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'48px 20px', color:'#94a3b8' }}>
                    <div style={{ fontSize:'2.4rem', marginBottom:10 }}>🔍</div>
                    <div style={{ fontWeight:700, fontSize:'0.9rem' }}>No students match your search</div>
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:520 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['#', 'Name', 'Email', 'Status'].map((h) => (
                            <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:'0.68rem',
                              fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.6px',
                              borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s, i) => (
                          <tr key={s._id || i} className="bd-row" style={{ borderBottom:'1px solid #f1f5f9' }}>
                            <td style={{ padding:'11px 16px', fontSize:'0.82rem', color:'#94a3b8' }}>{i + 1}</td>
                            <td style={{ padding:'11px 16px', fontSize:'0.85rem', fontWeight:600, color:'#0f172a' }}>{s.name || '—'}</td>
                            <td style={{ padding:'11px 16px', fontSize:'0.82rem', color:'#64748b' }}>{s.email || '—'}</td>
                            <td style={{ padding:'11px 16px' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:99,
                                fontSize:'0.7rem', fontWeight:700,
                                background: s.isActive ? '#dcfce7' : '#f1f5f9',
                                color: s.isActive ? '#15803d' : '#475569' }}>
                                {s.isActive ? 'Active' : 'In-Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchDetails;