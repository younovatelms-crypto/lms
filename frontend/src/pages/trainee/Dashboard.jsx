// src/pages/trainee/Dashboard.jsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchTraineeDashboard, selectTraineeDashboard } from '../../features/trainee/traineeSlice';
export default function TraineeDashboard() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector(selectTraineeDashboard);
  useEffect(() => { dispatch(fetchTraineeDashboard()); }, [dispatch]);
  if (status === 'loading') return <div style={{ padding:32 }}>Loading…</div>;
  return (
    <div style={{ padding:32, fontFamily:'Calibri,sans-serif' }}>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:24 }}>My Dashboard</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
        {[
          { label:'Attendance %',    value:`${data?.attendancePct ?? 0}%`, color:'#059669', icon:'✅' },
          { label:'Pending Work',    value:data?.pendingAssignments, color:'#E94560', icon:'📝' },
          { label:'Upcoming Sessions', value:data?.upcomingSessions?.length, color:'#4F46E5', icon:'🖥️' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'20px 24px', borderTop:`4px solid ${s.color}`, display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <span style={{ fontSize:28 }}>{s.icon}</span>
            <div><p style={{ margin:0, fontSize:24, fontWeight:700, color:s.color }}>{s.value ?? 0}</p><p style={{ margin:0, fontSize:12, color:'#666' }}>{s.label}</p></div>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize:16, marginBottom:12 }}>Next Sessions</h3>
      {data?.upcomingSessions?.map(s => (
        <div key={s._id} style={{ background:'#fff', borderRadius:10, padding:'14px 20px', marginBottom:8, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <p style={{ margin:0, fontWeight:600 }}>{s.title}</p>
          <p style={{ margin:0, fontSize:12, color:'#888' }}>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : ''}</p>
        </div>
      )) || <p style={{ color:'#999', fontSize:13 }}>No upcoming sessions</p>}
    </div>
  );
}
