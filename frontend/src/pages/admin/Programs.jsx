import React, { useMemo, useState } from 'react';

const C = {
  brand: '#1f3d63',
  brand2:'#26486f',
  text1:'#172033',
  text2:'#657691',
  line:'#dbe3ed',
  bg:'#f5f8fc',
  card:'#ffffff',
  success:'#16a05f',
  warning:'#d47a00',
  danger:'#e12e2a',
  blue:'#2f6f9b',
};

const statusColor = {
  active: C.success,
  completed: C.blue,
  upcoming: C.warning,
  draft: C.text2,
};

function StatusPill({ status }) {
  const bg = statusColor[status] || C.text2;
  return (
    <span
      style={{
        background: bg,
        color: '#fff',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

export default function AdminPrograms() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  // Mock data (until backend programs API exists)
  const programs = useMemo(
    () => [
      {
        _id: 'p1',
        name: 'Full Stack Development',
        programCode: 'FS-101',
        status: 'active',
        startDate: '2026-01-15',
        endDate: '2026-04-30',
      },
      {
        _id: 'p2',
        name: 'Data Science Bootcamp',
        programCode: 'DS-201',
        status: 'active',
        startDate: '2026-02-01',
        endDate: '2026-05-15',
      },
      {
        _id: 'p3',
        name: 'UI/UX Design Track',
        programCode: 'UX-301',
        status: 'upcoming',
        startDate: '2026-06-01',
        endDate: '2026-08-31',
      },
      {
        _id: 'p4',
        name: 'React Advanced',
        programCode: 'RA-401',
        status: 'completed',
        startDate: '2025-10-01',
        endDate: '2025-12-20',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.programCode.toLowerCase().includes(q);
      const matchesStatus = status === 'all' ? true : p.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [programs, query, status]);

  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: C.text1 }}>
            Programs ({filtered.length})
          </h2>
          <p style={{ margin: 0, color: C.text2, fontSize: 13 }}>
            Manage curriculum programs and track their lifecycle.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => alert('Add Program UI not implemented yet (mock page).')}
            style={{
              background: C.brand,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(31,61,99,0.18)',
            }}
          >
            + Add Program
          </button>
        </div>
      </div>

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', minWidth: 240 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by program name or code"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.line}`,
                outline: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.line}`,
                outline: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
                background: '#fff',
                color: C.text1,
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      <div
        style={{
          background: C.card,
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${C.line}`,
          boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: C.text2 }}>
              {['Program', 'Code', 'Status', 'Start', 'End'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    letterSpacing: '.7px',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${C.line}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p._id}
                style={{
                  background: i % 2 ? '#f8fafc' : '#fff',
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <td style={{ padding: '11px 16px', fontSize: 13, color: C.text1, fontWeight: 700 }}>
                  {p.name}
                </td>
                <td style={{ padding: '11px 16px', fontSize: 13, color: C.text2 }}>
                  {p.programCode}
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <StatusPill status={p.status} />
                </td>
                <td style={{ padding: '11px 16px', fontSize: 13, color: C.text2 }}>
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '11px 16px', fontSize: 13, color: C.text2 }}>
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: C.text2, fontSize: 13 }}>
                  No programs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, color: C.text2, fontSize: 12 }}>
        Note: This page uses mock data until a backend <b>Programs</b> API is added.
      </div>
    </div>
  );
}

