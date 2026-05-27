// src/pages/admin/Registrations.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchRegistrations, convertRegistration, selectAllRegistrations } from '../../features/admin/adminSlice';
import toast from 'react-hot-toast';
export default function AdminRegistrations() {
  const dispatch      = useAppDispatch();
  const registrations = useAppSelector(selectAllRegistrations);
  useEffect(() => { dispatch(fetchRegistrations()); }, [dispatch]);
  const handleApprove = async (id) => {
    const result = await dispatch(convertRegistration({ id, batchId: null }));
    if (convertRegistration.fulfilled.match(result)) toast.success('Trainee approved');
    else toast.error('Failed to approve');
  };
  return (
    <div style={{ padding: 32, fontFamily: 'Calibri,sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Pending Registrations ({registrations.length})</h2>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#1A1A2E', color: '#fff' }}>
            {['Name','Email','Applied','Action'].map(h => <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:13 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {registrations.map((r,i) => (
              <tr key={r._id} style={{ background: i%2?'#f8f9ff':'#fff', borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{r.name}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{r.email}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                <td style={{ padding:'11px 16px' }}>
                  <button onClick={() => handleApprove(r._id)} style={{ background:'#059669', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:12 }}>Approve</button>
                </td>
              </tr>
            ))}
            {registrations.length===0 && <tr><td colSpan={4} style={{ padding:32, textAlign:'center', color:'#999' }}>No pending registrations</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
