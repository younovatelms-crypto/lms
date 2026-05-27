import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchHrDashboard,
  selectHrDashboard,
  selectHrStatus,
  selectHrError,
} from '../../features/hr/hrSlice';

const HrDashboard = () => {
  const dispatch  = useAppDispatch();
  const dashboard = useAppSelector(selectHrDashboard);
  const status    = useAppSelector(selectHrStatus);
  const error     = useAppSelector(selectHrError);

  useEffect(() => {
    dispatch(fetchHrDashboard());
  }, [dispatch]);

  if (status === 'loading') return <div className="p-6 text-gray-500">Loading dashboard…</div>;
  if (status === 'failed')  return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">HR Dashboard</h1>
      {dashboard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard label="Total Trainees"    value={dashboard.totalTrainees    ?? 0} color="blue" />
          <StatCard label="Active Trainees"   value={dashboard.activeTrainees   ?? 0} color="green" />
          <StatCard label="Pending Approvals" value={dashboard.pendingApprovals ?? 0} color="yellow" />
        </div>
      ) : (
        <p className="text-gray-500">No dashboard data available.</p>
      )}
    </div>
  );
};

const colorMap = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const StatCard = ({ label, value, color }) => (
  <div className={`border rounded-xl p-5 shadow-sm ${colorMap[color] || colorMap.blue}`}>
    <p className="text-sm font-medium opacity-75">{label}</p>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

export default HrDashboard;