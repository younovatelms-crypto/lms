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
  const status   = useAppSelector(selectAdminStatus);
  const error    = useAppSelector(selectAdminError);

  useEffect(() => {
    dispatch(fetchAdminTrainees());
  }, [dispatch]);

  if (status === 'loading') return <div className="p-6 text-gray-500">Loading trainees…</div>;
  if (status === 'failed')  return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Trainees</h1>
      {trainees.length === 0 ? (
        <p className="text-gray-500">No trainees found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Batch</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {trainees.map((trainee, idx) => (
                <tr key={trainee._id || idx} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{trainee.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{trainee.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{trainee.batch?.name || trainee.batch || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      trainee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {trainee.status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Trainees;