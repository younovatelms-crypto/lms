// src/pages/admin/Sessions.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchSessions, selectAllSessions } from '../../features/session/sessionsSlice';
export default function AdminSessions() {
  const dispatch  = useAppDispatch();
  const sessions  = useAppSelector(selectAllSessions);
  useEffect(() => { dispatch(fetchSessions()); }, [dispatch]);
  const sc = { scheduled:'#2f6f9b', live:'#e12e2a', completed:'#16a05f', cancelled:'#657691' };
  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: '#172033' }}>Sessions ({sessions.length})</h2>
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)', border: '1px solid #dbe3ed' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc', color: '#657691' }}>
            {['Title','Batch','Trainer','Scheduled','Status'].map(h => <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, letterSpacing:'.7px', textTransform:'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {sessions.map((s,i) => (
              <tr key={s._id} style={{ background: i%2?'#f8fafc':'#fff', borderBottom:'1px solid #dbe3ed' }}>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.title}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.batchId?.name||'—'}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.trainerId?.name||'—'}</td>
                <td style={{ padding:'11px 16px', fontSize:13 }}>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '—'}</td>
                <td style={{ padding:'11px 16px' }}><span style={{ background:sc[s.status]||'#ccc', color:'#fff', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{s.status}</span></td>
              </tr>
            ))}
            {sessions.length===0 && <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#657691' }}>No sessions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
