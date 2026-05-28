// src/pages/admin/Batches.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchBatches, selectAllBatches } from '../../features/admin/adminSlice';
export default function AdminBatches() {
  const dispatch = useAppDispatch();
  const batches  = useAppSelector(selectAllBatches);
  useEffect(() => { dispatch(fetchBatches()); }, [dispatch]);
  const statusColor = { active:'#16a05f', completed:'#2f6f9b', upcoming:'#d47a00' };
  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: '#172033' }}>Batches ({batches.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {batches.map(b => (
          <div key={b._id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)', border: '1px solid #dbe3ed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#172033' }}>{b.name}</h3>
              <span style={{ fontSize: 11, background: statusColor[b.status]||'#ccc', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{b.status}</span>
            </div>
            <p style={{ margin: '8px 0 4px', fontSize: 12, color: '#657691' }}>Course: {b.course || '—'}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#657691' }}>Trainer: {b.trainerId?.name || 'Unassigned'}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7b8ca5' }}>Start: {b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'}</p>
          </div>
        ))}
        {batches.length === 0 && <p style={{ color: '#657691' }}>No batches found</p>}
      </div>
    </div>
  );
}
