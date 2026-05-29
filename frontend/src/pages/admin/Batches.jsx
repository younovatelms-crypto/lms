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