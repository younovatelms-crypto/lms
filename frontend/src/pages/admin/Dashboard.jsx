// src/pages/admin/Dashboard.jsx
// Matches Youva OS Blueprint Screen 03 — Admin Dashboard
// KPI cards · Attendance trend bars · Recent activity table · Fully responsive

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchDashboard,
  selectAdminDashboard,
  selectAdminStatus,
  selectAdminError,
} from '../../features/admin/adminSlice';

// ─── Palette (matches blueprint dark nav + light content) ─────────────────────
const C = {
  brand:    '#1f3d63',
  accent:   '#2f6f9b',
  teal:     '#0d8c83',
  green:    '#16a05f',
  greenLt:  '#dff8e9',
  orange:   '#d47a00',
  orangeLt: '#fff0bf',
  red:      '#e12e2a',
  redLt:    '#ffe1df',
  yellow:   '#9b6500',
  yellowLt: '#fff3c4',
  blue:     '#2f6fdf',
  blueLt:   '#d9e8ff',
  purple:   '#6d3be6',
  purpleLt: '#ede6ff',
  white:    '#FFFFFF',
  gray50:   '#F8FAFC',
  gray100:  '#EEF3F8',
  gray200:  '#DBE3ED',
  gray400:  '#7B8CA5',
  gray500:  '#657691',
  gray700:  '#27334A',
  gray900:  '#172033',
};

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS = {
  Live:        { bg: C.greenLt,  color: C.green  },
  Active:      { bg: C.greenLt,  color: C.green  },
  Completed:   { bg: C.greenLt,  color: C.green  },
  Pending:     { bg: C.yellowLt, color: C.yellow },
  Upcoming:    { bg: C.yellowLt, color: C.yellow },
  'In Progress':{ bg: C.blueLt, color: C.blue   },
  Rejected:    { bg: C.redLt,    color: C.red    },
  Absent:      { bg: C.redLt,    color: C.red    },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, subUp, accent = C.accent, fill }) => (
  <div style={{
    background:   fill || C.white,
    border:       `1px solid ${C.gray200}`,
    borderRadius: 10,
    padding:      '20px 20px',
    minWidth:     0,
    boxShadow:    '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
  }}>
    <p style={{ fontSize: 12, color: C.gray500, fontWeight: 600,
                letterSpacing: '0.4px', textTransform: 'uppercase', margin: '0 0 6px' }}>
      {label}
    </p>
    <p style={{ fontSize: 34, fontWeight: 800, color: C.gray900, margin: '0 0 6px', lineHeight: 1 }}>
      {value ?? 0}
    </p>
    {sub && (
      <p style={{ fontSize: 12, color: subUp ? C.green : C.gray400, margin: 0, fontWeight: 500 }}>
        {sub}
      </p>
    )}
  </div>
);

// ─── Progress Bar Row ─────────────────────────────────────────────────────────
const ProgressRow = ({ label, pct, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
    <span style={{ fontSize: 13, color: C.gray700, width: 200, flexShrink: 0,
                   fontFamily: 'Courier New, monospace' }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 10, background: C.gray100,
                  borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%',
                    background: color, borderRadius: 6,
                    transition: 'width 0.6s ease' }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color, width: 40, textAlign: 'right' }}>
      {pct}%
    </span>
  </div>
);





// ─── Status Badge ─────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = STATUS[status] || { bg: C.gray100, color: C.gray500 };
  return (
    <span style={{
      background:   s.bg,
      color:        s.color,
      fontWeight:   700,
      fontSize:     11,
      padding:      '3px 10px',
      borderRadius: 20,
      letterSpacing:'0.3px',
    }}>
      {status}
    </span>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <p style={{
    fontSize: 11, fontWeight: 700, color: C.gray500,
    letterSpacing: '0.8px', textTransform: 'uppercase',
    margin: '0 0 14px', borderBottom: `2px solid ${C.gray200}`,
    paddingBottom: 8,
  }}>
    {title}
  </p>
);

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const Skeleton = ({ h = 20, w = '100%', r = 6, mb = 0 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'yn-shimmer 1.4s infinite',
    marginBottom: mb,
  }} />
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const dispatch  = useAppDispatch();
  const dashboard = useAppSelector(selectAdminDashboard);
  const status    = useAppSelector(selectAdminStatus);
  const error     = useAppSelector(selectAdminError);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  // ── Safe field extraction with fallbacks ──────────────────────────────────
  const totalTrainees        = dashboard?.totalTrainees        ?? 0;
  const totalTrainers        = dashboard?.totalTrainers        ?? 0;
  const totalBatches         = dashboard?.totalBatches         ?? 0;
  const activeBatches        = dashboard?.activeBatches        ?? 0;
  const totalSessions        = dashboard?.totalSessions        ?? 0;
  const attendanceRate       = dashboard?.attendanceRate       ?? 0;
  const placementReady       = dashboard?.placementReady       ?? 0;
  const offerLetters         = dashboard?.offerLetters         ?? 0;
  const pendingApprovals     = dashboard?.pendingApprovals     ?? 0;
  const activeRegistrations  = dashboard?.activeRegistrations  ?? 0;

  const batchTrends = dashboard?.batchAttendance ?? [
    { name: 'Batch A — Full Stack',  pct: 85, color: C.accent },
    { name: 'Batch B — Data Science',pct: 91, color: C.teal   },
    { name: 'Batch C — UI/UX Design',pct: 78, color: C.purple },
    { name: 'Batch D — React Adv.',  pct: 72, color: C.orange },
  ];

  const recentActivity = dashboard?.recentActivity ?? [];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (status === 'loading' && !dashboard) {
    return (
      <div style={s.page}>
        <style>{shimmerCSS}</style>
        <Skeleton h={28} w={220} mb={8} />
        <Skeleton h={14} w={300} mb={28} />
        <div style={s.kpiGrid}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} h={96} r={12} />)}
        </div>
        <Skeleton h={180} r={12} mb={20} />
        <Skeleton h={220} r={12} />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (status === 'failed') {
    return (
      <div style={s.page}>
        <div style={{
          background: C.redLt, border: `1px solid #FECACA`,
          borderRadius: 12, padding: '20px 24px',
        }}>
          <p style={{ color: C.red, fontWeight: 600, margin: '0 0 4px' }}>
            Failed to load dashboard
          </p>
          <p style={{ color: '#B91C1C', fontSize: 13, margin: '0 0 16px' }}>{error}</p>
          <button
            onClick={() => dispatch(fetchDashboard())}
            style={{
              padding: '8px 20px', background: C.red, color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{shimmerCSS}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.gray900, margin: '0 0 4px' }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 13, color: C.gray500, margin: 0 }}>
          Real-time KPI overview — trainees, attendance, placement, and system health
        </p>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <KpiCard
          label="Total Trainees"
          value={totalTrainees}
          sub="↑ +12 this month"
          subUp
          accent={C.accent}
        />
        <KpiCard
          label="Active Batches"
          value={activeBatches || totalBatches}
          sub="2 starting soon"
          accent={C.teal}
        />
        <KpiCard
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          sub="↑ +3% vs last week"
          subUp
          accent={C.green}
        />
        <KpiCard
          label="Placement Ready"
          value={placementReady}
          sub="↑ +8 this week"
          subUp
          accent={C.purple}
        />
        <KpiCard
          label="Offer Letters"
          value={offerLetters}
          sub="Q2 2026"
          accent={C.orange}
        />
      </div>

      {/* Secondary stats row */}
      <div style={{ ...s.kpiGrid, gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', marginBottom: 28 }}>
        <KpiCard label="Total Trainers"        value={totalTrainers}       accent={C.teal}   />
        <KpiCard label="Total Sessions"        value={totalSessions}       accent={C.blue}   />
        <KpiCard label="Pending Approvals"     value={pendingApprovals}    accent={C.red}    />
        <KpiCard label="Active Registrations"  value={activeRegistrations} accent={C.accent} />
      </div>

      {/* Attendance trend */}
      <div style={s.card}>
        <SectionHeader title="Platform Activity — Weekly Attendance Trend" />
        {batchTrends.map((b, i) => (
          <ProgressRow key={i} label={b.name} pct={b.pct} color={b.color} />
        ))}
      </div>

      {/* Recent activity table */}
      <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 12px' }}>
          <SectionHeader title="Recent Activity" />
        </div>

        {recentActivity.length === 0 ? (
          <p style={{ padding: '0 24px 20px', color: C.gray400, fontSize: 13 }}>
            No recent activity to display.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.brand }}>
                  {['Time', 'User', 'Action', 'Module', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: '#fff', fontWeight: 600,
                      fontSize: 12, letterSpacing: '0.3px',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, idx) => (
                  <tr key={idx} style={{
                    background: idx % 2 === 0 ? C.white : C.gray50,
                    borderBottom: `1px solid ${C.gray100}`,
                  }}>
                    <td style={s.td}>
                      {item.time
                        ? item.time
                        : item.date
                          ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                    </td>
                    <td style={{ ...s.td, color: C.accent, fontWeight: 600 }}>
                      {item.user || item.userName || '—'}
                    </td>
                    <td style={s.td}>
                      {item.action || item.message || item.description || '—'}
                    </td>
                    <td style={{ ...s.td, color: C.blue }}>
                      {item.module || '—'}
                    </td>
                    <td style={s.td}>
                      <Badge status={item.status || 'Pending'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Empty state when API returns no data */}
      {!dashboard && status === 'succeeded' && (
        <p style={{ color: C.gray400, fontSize: 13, marginTop: 16 }}>
          No dashboard data returned from the server.
        </p>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding:    '28px 32px',
    fontFamily: "'Public Sans', system-ui, sans-serif",
    maxWidth:   1200,
    margin:     0,
  },
  kpiGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap:                 16,
    marginBottom:        20,
  },
  card: {
    background:   '#fff',
    border:       `1px solid ${C.gray200}`,
    borderRadius: 10,
    padding:      '20px 24px',
    marginBottom: 20,
    boxShadow:    '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
  },
  td: {
    padding:   '11px 16px',
    color:     C.gray700,
    whiteSpace:'nowrap',
  },
};

const shimmerCSS = `
  @keyframes yn-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (max-width: 640px) {
    .yn-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

export default Dashboard;
