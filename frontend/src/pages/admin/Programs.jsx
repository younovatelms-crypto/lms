import React, { useMemo, useState } from 'react';

const Programs = () => {
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

  const StatusPill = ({ status }) => {
    const getStyle = () => {
      switch (status) {
        case 'active': return { background: '#DCFCE7', color: '#15803D' };
        case 'completed': return { background: '#DBEAFE', color: '#1D4ED8' };
        case 'upcoming': return { background: '#FEF3C7', color: '#B45309' };
        case 'draft': return { background: '#F1F5F9', color: '#475569' };
        default: return { background: '#F1F5F9', color: '#475569' };
      }
    };

    return (
      <span
        style={{
          ...getStyle(),
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
  };

  return (
    <div style={{ 
      padding: '32px 36px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#F8FAFC',
      minHeight: '100vh'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28,
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 800, 
            marginBottom: 6, 
            color: '#0F172A',
            letterSpacing: '-0.5px'
          }}>
            Programs ({filtered.length})
          </h2>
          <p style={{ 
            margin: 0, 
            color: '#64748B', 
            fontSize: 14,
            fontWeight: 500
          }}>
            Manage curriculum programs and track their lifecycle.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Add Program UI not implemented yet (mock page).')}
          style={{
            background: '#1E3A5F',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(30,58,95,0.18)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
        >
          + Add Program
        </button>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
      }}>
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
                border: '1px solid #E2E8F0',
                outline: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
                background: '#F8FAFC',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              outline: 'none',
              fontSize: 13,
              fontFamily: 'inherit',
              background: '#fff',
              color: '#0F172A',
              cursor: 'pointer'
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

      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(30,58,95,0.08)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Program', 'Code', 'Status', 'Start', 'End'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    letterSpacing: '.7px',
                    textTransform: 'uppercase',
                    color: '#64748B',
                    fontWeight: 700,
                    borderBottom: '1px solid #E2E8F0',
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
                  borderBottom: '1px solid #E2E8F0',
                  transition: 'background 0.15s'
                }}
              >
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 13, 
                  color: '#0F172A', 
                  fontWeight: 600 
                }}>
                  {p.name}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 13, 
                  color: '#64748B' 
                }}>
                  {p.programCode}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <StatusPill status={p.status} />
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 13, 
                  color: '#64748B' 
                }}>
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: 13, 
                  color: '#64748B' 
                }}>
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ 
                  padding: 48, 
                  textAlign: 'center', 
                  color: '#64748B', 
                  fontSize: 13 
                }}>
                  No programs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ 
        marginTop: 16, 
        color: '#64748B', 
        fontSize: 12,
        fontWeight: 500
      }}>
        Note: This page uses mock data until a backend <b>Programs</b> API is added.
      </div>
    </div>
  );
};

export default Programs;