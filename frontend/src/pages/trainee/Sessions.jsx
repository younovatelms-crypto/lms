import React, { useEffect, useState } from 'react';

const TraineeSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch sessions');
        const data = await res.json();
        setSessions(data);
        setStatus('succeeded');
      } catch (err) {
        setError(err.message);
        setStatus('failed');
      }
    };
    fetchData();
  }, []);

  if (status === 'loading') return <div className="p-6 text-gray-500">Loading sessions…</div>;
  if (status === 'failed')  return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Sessions</h1>
      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session, idx) => (
            <div key={session._id || idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-800 text-lg">{session.title || 'Untitled Session'}</h2>
              <p className="text-sm text-gray-500 mt-1">{session.description || 'No description.'}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                <span>📅 {session.date ? new Date(session.date).toLocaleDateString() : 'TBD'}</span>
                <span>⏰ {session.time || 'TBD'}</span>
                <span>👤 {session.trainer?.name || session.trainer || 'TBD'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TraineeSessions;