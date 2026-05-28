import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchUsers,
  selectAdminUsers,
  selectAdminUsersStatus,
  selectAdminUsersError,
} from '../../features/admin/adminSlice';

export default function AdminUsers() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAdminUsers);
  const status = useAppSelector(selectAdminUsersStatus);
  const error = useAppSelector(selectAdminUsersError);

  const [search, setSearch] = useState('');

  // Fetch once; API supports search/pagination later.
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, search]);

  if (status === 'loading') return <div style={{ padding: 32 }}>Loading users…</div>;
  if (status === 'failed') return <div style={{ padding: 32, color: '#e12e2a' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#172033' }}>All Users ({filtered.length})</h2>
          <p style={{ margin: 0, color: '#657691', fontSize: 13 }}>View trainees and trainers (admin).</p>
        </div>

        <div style={{ minWidth: 260 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #dbe3ed',
              outline: 'none',
              fontSize: 13,
              fontFamily: 'inherit',
              background: '#fff',
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #dbe3ed',
          boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#657691' }}>
              {['Name', 'Email', 'Role', 'Status', 'Joined'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    letterSpacing: '.7px',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid #dbe3ed',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((u, idx) => {
              const active = u.isActive === true || u.isActive === 'true';
              return (
                <tr key={u._id || idx} style={{ background: idx % 2 ? '#f8fafc' : '#fff' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#172033' }}>{u.name || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#657691' }}>{u.email || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#657691' }}>{u.role || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13 }}>
                    <span
                      style={{
                        background: active ? 'rgba(22,160,95,0.12)' : 'rgba(101,118,145,0.14)',
                        color: active ? '#16a05f' : '#657691',
                        border: `1px solid ${active ? 'rgba(22,160,95,0.35)' : '#dbe3ed'}`,
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#657691' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#657691', fontSize: 13 }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

