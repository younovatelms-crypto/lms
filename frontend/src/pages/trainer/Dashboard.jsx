import React, { useEffect, useState } from 'react';

const StatCard = ({ label, value, color }) => {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <div className={`border rounded-xl p-5 shadow-sm ${colorMap[color] || colorMap.blue}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
};

const TrainerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/trainer/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard');
        const data = await res.json();
        setDashboard(data);
        setStatus('succeeded');
      } catch (err) {
        setError(err.message);
        setStatus('failed');
      }
    };
    fetchData();
  }, []);

  if (status === 'loading') return <div className="p-6 text-gray-500">Loading dashboard…</div>;
  if (status === 'failed')  return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Trainer Dashboard</h1>
      {dashboard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard label="My Sessions"     value={dashboard.totalSessions  ?? 0} color="blue" />
          <StatCard label="My Trainees"     value={dashboard.totalTrainees  ?? 0} color="green" />
          <StatCard label="Assignments Due" value={dashboard.assignmentsDue ?? 0} color="orange" />
        </div>
      ) : (
        <p className="text-gray-500">No dashboard data available.</p>
      )}
    </div>
  );
};

export default TrainerDashboard;