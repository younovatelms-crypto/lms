// src/pages/admin/Batches.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchBatches, selectAllBatches } from '../../features/admin/adminSlice';
export default function AdminBatches() {
  const dispatch = useAppDispatch();
  const batches  = useAppSelector(selectAllBatches);
  useEffect(() => { dispatch(fetchBatches()); }, [dispatch]);
  const statusColor = { active:'#059669', completed:'#4F46E5', upcoming:'#D97706' };
  return (
    <div style={{ padding: 32, fontFamily: 'Calibri,sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Batches ({batches.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {batches.map(b => (
          <div key={b._id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.06)', borderTop: `3px solid ${statusColor[b.status]||'#ccc'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#1A1A2E' }}>{b.name}</h3>
              <span style={{ fontSize: 11, background: statusColor[b.status]||'#ccc', color:'#fff', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{b.status}</span>
            </div>
            <p style={{ margin: '8px 0 4px', fontSize: 12, color: '#666' }}>Course: {b.course || '—'}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Trainer: {b.trainerId?.name || 'Unassigned'}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>Start: {b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'}</p>
          </div>
        ))}
        {batches.length === 0 && <p style={{ color: '#999' }}>No batches found</p>}
      </div>
    </div>
  );
}
