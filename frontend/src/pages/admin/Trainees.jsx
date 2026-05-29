import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchAdminTrainees,
  selectAllAdminTrainees,
  selectAdminStatus,
  selectAdminError,
} from '../../features/admin/adminSlice';

const Trainees = () => {
  const dispatch = useAppDispatch();
  const trainees = useAppSelector(selectAllAdminTrainees);
  const status = useAppSelector(selectAdminStatus);
  const error = useAppSelector(selectAdminError);

  useEffect(() => {
    dispatch(fetchAdminTrainees());
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div style={{ 
        padding: window.innerWidth <= 768 ? '16px 20px' : '32px 36px', 
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
        minHeight: '100vh'
      }}>
        <div style={{ height: 28, width: 220, marginBottom: 8, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 8 }} />
        <div style={{ height: 14, width: 300, marginBottom: 28, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 8 }} />
        <div style={{ height: 400, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', borderRadius: 16 }} />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ 
        padding: window.innerWidth <= 768 ? '16px 20px' : '32px 36px', 
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#F8FAFC',
        minHeight: '100vh'
      }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20 }}>
          <p style={{ color: '#B91C1C', fontWeight: 600, margin: '0 0 4px' }}>Error loading trainees</p>
          <p style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: window.innerWidth <= 768 ? '16px 20px' : '32px 36px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#F8FAFC',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: window.innerWidth <= 768 ? 20 : 28 }}>
        <h1 style={{ 
          fontSize: window.innerWidth <= 768 ? 22 : 28, 
          fontWeight: 800, 
          marginBottom: 6, 
          color: '#0F172A',
          letterSpacing: '-0.5px'
        }}>
          Trainees ({trainees.length})
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#64748B', 
          fontSize: window.innerWidth <= 768 ? 13 : 14,
          fontWeight: 500
        }}>
          Manage trainee profiles and track their progress.
        </p>
      </div>

      {trainees.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: window.innerWidth <= 768 ? 32 : 48,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
        }}>
          <p style={{ color: '#64748B', fontSize: window.innerWidth <= 768 ? 13 : 14, margin: 0 }}>No trainees found.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              minWidth: window.innerWidth <= 768 ? '500px' : '640px'
            }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0' 
                  }}>#</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0' 
                  }}>Name</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0',
                    display: window.innerWidth <= 480 ? 'none' : 'table-cell'
                  }}>Email</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0',
                    display: window.innerWidth <= 600 ? 'none' : 'table-cell'
                  }}>Batch</th>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? 10 : 11, 
                    fontWeight: 700, 
                    color: '#64748B', 
                    letterSpacing: '0.7px', 
                    textTransform: 'uppercase', 
                    borderBottom: '1px solid #E2E8F0' 
                  }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {trainees.map((trainee, idx) => (
                  <tr key={trainee._id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#64748B' 
                    }}>{idx + 1}</td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#0F172A', 
                      fontWeight: 600 
                    }}>
                      <div style={{
                        maxWidth: window.innerWidth <= 768 ? '120px' : 'none',
                        overflow: window.innerWidth <= 768 ? 'hidden' : 'visible',
                        textOverflow: window.innerWidth <= 768 ? 'ellipsis' : 'clip',
                        whiteSpace: window.innerWidth <= 768 ? 'nowrap' : 'normal'
                      }}>
                        {trainee.name || '—'}
                      </div>
                    </td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#64748B',
                      display: window.innerWidth <= 480 ? 'none' : 'table-cell'
                    }}>
                      <div style={{
                        maxWidth: window.innerWidth <= 768 ? '150px' : 'none',
                        overflow: window.innerWidth <= 768 ? 'hidden' : 'visible',
                        textOverflow: window.innerWidth <= 768 ? 'ellipsis' : 'clip',
                        whiteSpace: window.innerWidth <= 768 ? 'nowrap' : 'normal'
                      }}>
                        {trainee.email || '—'}
                      </div>
                    </td>
                    <td style={{ 
                      padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px', 
                      fontSize: window.innerWidth <= 768 ? 12 : 13, 
                      color: '#64748B',
                      display: window.innerWidth <= 600 ? 'none' : 'table-cell'
                    }}>{trainee.batch?.name || trainee.batch || '—'}</td>
                    <td style={{ padding: window.innerWidth <= 768 ? '8px 12px' : '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: window.innerWidth <= 768 ? '2px 8px' : '3px 10px',
                        borderRadius: 999,
                        fontSize: window.innerWidth <= 768 ? 10 : 11,
                        fontWeight: 700,
                        background: trainee.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                        color: trainee.status === 'active' ? '#15803D' : '#475569'
                      }}>
                        {trainee.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trainees;