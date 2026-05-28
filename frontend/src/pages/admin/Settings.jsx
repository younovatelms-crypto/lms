import React from 'react';

export default function AdminSettings() {
  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#172033' }}>Admin Settings</h2>
      <p style={{ margin: 0, color: '#657691', fontSize: 13 }}>
        Configure admin preferences, security options, and system integrations.
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
        <div style={{ padding: 18, borderBottom: '1px solid #eef3f8' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#172033' }}>Coming soon</h3>
          <p style={{ margin: '6px 0 0', color: '#657691', fontSize: 13 }}>
            This page is added to support the admin navigation. Hook it to backend APIs when ready.
          </p>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <SettingCard title="User management" desc="Roles, status rules, and approvals." />
          <SettingCard title="Security" desc="Password policy, session limits, audit logs." />
          <SettingCard title="Integrations" desc="Email/SMS providers and webhooks." />
          <SettingCard title="System" desc="Admin defaults and feature toggles." />
        </div>
      </div>
    </div>
  );
}

function SettingCard({ title, desc }) {
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
            fontWeight: 800,
            fontSize: 12,
            cursor: 'not-allowed',
          }}
        >
          Configure
        </button>
      </div>
    </div>
  );
}

