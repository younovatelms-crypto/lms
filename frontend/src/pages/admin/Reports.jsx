import React from 'react';

export default function AdminReports() {
  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#172033' }}>Admin Reports</h2>
      <p style={{ margin: 0, color: '#657691', fontSize: 13 }}>
        View aggregated reports across users, sessions, attendance, and placements.
      </p>

      <div
        style={{
          marginTop: 18,
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #dbe3ed',
          boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
        }}
      >
        <div style={{ padding: 18, borderBottom: '1px solid #eef3f8', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#172033' }}>Report center</h3>
            <p style={{ margin: '6px 0 0', color: '#657691', fontSize: 13 }}>
              Choose a report type. (UI only for now.)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" disabled style={btnDisabled}>Generate CSV</button>
            <button type="button" disabled style={btnDisabled}>Generate PDF</button>
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <ReportCard title="User activity" desc="Logins, status changes, and role updates." />
          <ReportCard title="Sessions overview" desc="Planned vs completed sessions." />
          <ReportCard title="Attendance summary" desc="Present/absent breakdown per batch." />
          <ReportCard title="Placements" desc="Pipeline performance and outcomes." />
        </div>
      </div>
    </div>
  );
}

const btnDisabled = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #dbe3ed',
  background: '#eaf2fb',
  color: '#94a3b8',
  fontWeight: 900,
  fontSize: 12,
  cursor: 'not-allowed',
};

function ReportCard({ title, desc }) {
  return (
    <div
      style={{
        border: '1px solid #dbe3ed',
        borderRadius: 12,
        padding: 16,
        background: '#f8fafc',
      }}
    >
      <div style={{ fontWeight: 900, color: '#172033', fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 6, color: '#657691', fontSize: 13 }}>{desc}</div>
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          disabled
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: '1px solid #dbe3ed',
            background: '#eaf2fb',
            color: '#94a3b8',
            fontWeight: 900,
            fontSize: 12,
            cursor: 'not-allowed',
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}

