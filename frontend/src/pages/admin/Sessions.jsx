// src/pages/admin/Sessions.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchSessions, selectAllSessions } from '../../features/session/sessionsSlice';
export default function AdminSessions() {
  const dispatch  = useAppDispatch();
  const sessions  = useAppSelector(selectAllSessions);
  useEffect(() => { dispatch(fetchSessions()); }, [dispatch]);
  const sc = { scheduled:'#4F46E5', live:'#E94560', completed:'#059669', cancelled:'#999' };
  return (
    <div style={{ padding: 32, fontFamily: 'Calibri,sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Sessions ({sessions.length})</h2>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#1A1A2E', color: '#fff' }}>
            {['Title','Batch','Trainer','Scheduled','Status'].map(h => <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:13 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {sessions.map((s,i) => (
              <tr key={s._id} style={{ background: i%2?'#f8f9ff':'#fff', borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.title}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.batchId?.name||'—'}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.trainerId?.name||'—'}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '—'}</td>
                <td style={{ padding:'11px 16px' }}><span style={{ background:sc[s.status]||'#ccc', color:'#fff', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{s.status}</span></td>
              </tr>
            ))}
            {sessions.length===0 && <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#999' }}>No sessions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
