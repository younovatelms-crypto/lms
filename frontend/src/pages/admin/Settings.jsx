// src/pages/admin/AdminSettings.jsx
// LMS Admin Settings — tabbed, API-backed.
//   GET  /api/admin/settings                  → loads all sections
//   PUT  /api/admin/settings/:section         → saves one section
//   PUT  /api/admin/account/password          → change admin password
// Self-contained (axios + token from localStorage). Swap to your settings slice if preferred.

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// ─── Config ─────────────────────────────────────────────────────────────────
// NOTE: do NOT use `import.meta` here — this app bundles to a classic script
// (bundle.js), where `import.meta` throws "Cannot use 'import.meta' outside a
// module". Read env via process.env (CRA/webpack) with a window fallback.
const readApiBase = () => {
  try {
    if (typeof window !== 'undefined' && window.__API_BASE__) return window.__API_BASE__;
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.REACT_APP_API_BASE_URL
        || process.env.REACT_APP_API_BASE
        || process.env.API_BASE_URL;
    }
  } catch (_) {}
  return undefined;
};
const API = readApiBase() || 'http://localhost:8080';
const BRAND = '#3f7da0';

const authHeaders = () => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwt');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Defaults (also the shape the backend should return/accept) ───────────────
const DEFAULTS = {
  general: {
    orgName: '', supportEmail: '', logoUrl: '',
    timezone: 'Asia/Kolkata', defaultLanguage: 'en', academicYear: '',
  },
  security: {
    passwordMinLength: 8, requireUppercase: true, requireNumber: true,
    require2FA: false, sessionTimeoutMins: 60, maxLoginAttempts: 5,
    allowSelfRegistration: true, requireApproval: false,
  },
  notifications: {
    emailEnabled: true, smtpHost: '', smtpPort: 587, smtpUser: '', fromEmail: '',
    smsEnabled: false, smsProvider: 'none',
  },
  integrations: {
    paymentGateway: 'none', paymentKey: '',
    zoomApiKey: '', zoomApiSecret: '',
    googleSsoEnabled: false, s3Bucket: '',
  },
  features: {
    discussions: true, mentorship: true, gamification: false,
    certificates: true, liveClasses: true, maintenanceMode: false,
  },
};

const TABS = [
  { id: 'general',       label: 'General',       icon: '🏛️' },
  { id: 'security',      label: 'Security',      icon: '🔒' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'integrations',  label: 'Integrations',  icon: '🔌' },
  { id: 'features',      label: 'Features',      icon: '🧩' },
  { id: 'account',       label: 'Account',       icon: '👤' },
];

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'];
const LANGUAGES = [['en', 'English'], ['hi', 'Hindi'], ['ta', 'Tamil'], ['te', 'Telugu'], ['kn', 'Kannada']];
const SMS_PROVIDERS = [['none', 'None'], ['twilio', 'Twilio'], ['msg91', 'MSG91'], ['textlocal', 'Textlocal']];
const PAY_GATEWAYS = [['none', 'None'], ['razorpay', 'Razorpay'], ['stripe', 'Stripe'], ['payu', 'PayU']];

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&display=swap');
  .as-wrap *, .as-wrap *::before, .as-wrap *::after { box-sizing: border-box; }
  @keyframes as-spin { to { transform: rotate(360deg); } }
  @keyframes as-fade { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
  .as-input:focus, .as-select:focus { outline: none; border-color: ${BRAND}; box-shadow: 0 0 0 3px rgba(63,125,160,.15); }
  .as-tab:hover { background: #f1f6fb; color: #172033; }
  .as-btn:hover:not(:disabled) { opacity: .9; }
  .as-btn:disabled { opacity: .55; cursor: not-allowed; }

  /* Switch */
  .as-switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .as-switch input { opacity: 0; width: 0; height: 0; }
  .as-slider { position: absolute; inset: 0; cursor: pointer; background: #cbd5e1; border-radius: 99px; transition: background .18s; }
  .as-slider::before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .18s; }
  .as-switch input:checked + .as-slider { background: ${BRAND}; }
  .as-switch input:checked + .as-slider::before { transform: translateX(18px); }
  .as-switch input:disabled + .as-slider { opacity: .5; cursor: not-allowed; }

  @media (max-width: 820px) {
    .as-shell  { flex-direction: column !important; }
    .as-tabs   { flex-direction: row !important; overflow-x: auto; width: 100% !important; border-right: none !important; border-bottom: 1px solid #eef3f8; }
    .as-tab    { white-space: nowrap; border-radius: 8px !important; }
    .as-grid   { grid-template-columns: 1fr !important; }
    .as-pad    { padding: 16px !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

const inputSt = {
  width: '100%', border: '1px solid #dbe3ed', borderRadius: 9, padding: '9px 12px',
  fontSize: 13.5, color: '#172033', background: '#fff', fontFamily: 'inherit',
};

const Field = ({ label, hint, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 5 }}>{hint}</div>}
  </div>
);

const TextField = ({ label, hint, value, onChange, type = 'text', placeholder }) => (
  <Field label={label} hint={hint}>
    <input className="as-input" type={type} value={value ?? ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} style={inputSt} />
  </Field>
);

const NumberField = ({ label, hint, value, onChange, min, max }) => (
  <Field label={label} hint={hint}>
    <input className="as-input" type="number" min={min} max={max} value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} style={inputSt} />
  </Field>
);

const SelectField = ({ label, hint, value, onChange, options }) => (
  <Field label={label} hint={hint}>
    <div style={{ position: 'relative' }}>
      <select className="as-select" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputSt, appearance: 'none', WebkitAppearance: 'none', paddingRight: 30, cursor: 'pointer' }}>
        {options.map((o) => {
          const [val, txt] = Array.isArray(o) ? o : [o, o];
          return <option key={val} value={val}>{txt}</option>;
        })}
      </select>
      <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 11, pointerEvents: 'none' }}>▾</span>
    </div>
  </Field>
);

const ToggleField = ({ label, hint, checked, onChange, disabled }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, border: '1px solid #eef3f8', background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>{hint}</div>}
    </div>
    <label className="as-switch">
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="as-slider" />
    </label>
  </div>
);

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid #e5edf5`, borderTopColor: BRAND, animation: 'as-spin .7s linear infinite' }} />
  </div>
);

const SectionShell = ({ title, desc, saving, onSave, dirty, children, saveLabel = 'Save changes' }) => (
  <div style={{ animation: 'as-fade .2s ease' }}>
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#172033' }}>{title}</h3>
      <p style={{ margin: '5px 0 0', color: '#657691', fontSize: 12.5 }}>{desc}</p>
    </div>
    {children}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid #eef3f8', paddingTop: 16 }}>
      <button className="as-btn" type="button" onClick={onSave} disabled={saving || !dirty}
        style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminSettings() {
  const [tab, setTab]         = useState('general');
  const [form, setForm]       = useState(DEFAULTS);
  const [loaded, setLoaded]   = useState(DEFAULTS);  // last-saved snapshot (dirty check)
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);
  const [saving, setSaving]   = useState(null);      // section id currently saving

  // Account / password change (separate endpoint)
  const [pwd, setPwd]           = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  // ── Load all settings ──
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/admin/settings`, { headers: authHeaders() });
        const payload = data?.settings || data?.data || data || {};
        // Deep-merge each section over defaults so missing keys keep defaults.
        const merged = Object.fromEntries(
          Object.keys(DEFAULTS).map((k) => [k, { ...DEFAULTS[k], ...(payload[k] || {}) }])
        );
        if (alive) { setForm(merged); setLoaded(merged); }
      } catch (e) {
        if (alive) setLoadErr(e.response?.data?.message || e.message || 'Failed to load settings');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const setField = (section, key, value) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));

  const dirty = (section) =>
    JSON.stringify(form[section]) !== JSON.stringify(loaded[section]);

  const saveSection = async (section) => {
    setSaving(section);
    try {
      const { data } = await axios.put(
        `${API}/api/admin/settings/${section}`,
        form[section],
        { headers: authHeaders() }
      );
      const saved = data?.settings?.[section] || data?.[section] || form[section];
      const next = { ...form[section], ...saved };
      setForm((f) => ({ ...f, [section]: next }));
      setLoaded((l) => ({ ...l, [section]: next }));
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const changePassword = async () => {
    if (!pwd.current || !pwd.next) return toast.error('Fill in both password fields');
    if (pwd.next.length < (form.security.passwordMinLength || 8))
      return toast.error(`New password must be at least ${form.security.passwordMinLength || 8} characters`);
    if (pwd.next !== pwd.confirm) return toast.error('Passwords do not match');
    setPwdSaving(true);
    try {
      await axios.put(
        `${API}/api/admin/account/password`,
        { currentPassword: pwd.current, newPassword: pwd.next },
        { headers: authHeaders() }
      );
      setPwd({ current: '', next: '', confirm: '' });
      toast.success('Password updated');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to update password');
    } finally {
      setPwdSaving(false);
    }
  };

  const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

  const body = useMemo(() => {
    if (tab === 'general') {
      const g = form.general;
      return (
        <SectionShell title="General" desc="Organisation identity and locale defaults."
          saving={saving === 'general'} dirty={dirty('general')} onSave={() => saveSection('general')}>
          <div className="as-grid" style={grid}>
            <TextField label="Organisation name" value={g.orgName} onChange={(v) => setField('general', 'orgName', v)} placeholder="Younovate" />
            <TextField label="Support email" type="email" value={g.supportEmail} onChange={(v) => setField('general', 'supportEmail', v)} placeholder="support@…" />
            <TextField label="Logo URL" value={g.logoUrl} onChange={(v) => setField('general', 'logoUrl', v)} placeholder="https://…/logo.png" />
            <TextField label="Academic year" value={g.academicYear} onChange={(v) => setField('general', 'academicYear', v)} placeholder="2025–26" />
            <SelectField label="Timezone" value={g.timezone} onChange={(v) => setField('general', 'timezone', v)} options={TIMEZONES} />
            <SelectField label="Default language" value={g.defaultLanguage} onChange={(v) => setField('general', 'defaultLanguage', v)} options={LANGUAGES} />
          </div>
        </SectionShell>
      );
    }

    if (tab === 'security') {
      const s = form.security;
      return (
        <SectionShell title="Security" desc="Password policy, sessions, and registration controls."
          saving={saving === 'security'} dirty={dirty('security')} onSave={() => saveSection('security')}>
          <div className="as-grid" style={{ ...grid, marginBottom: 16 }}>
            <NumberField label="Min password length" min={6} max={64} value={s.passwordMinLength} onChange={(v) => setField('security', 'passwordMinLength', v)} />
            <NumberField label="Session timeout (minutes)" min={5} max={1440} value={s.sessionTimeoutMins} onChange={(v) => setField('security', 'sessionTimeoutMins', v)} />
            <NumberField label="Max login attempts" min={3} max={20} value={s.maxLoginAttempts} onChange={(v) => setField('security', 'maxLoginAttempts', v)} hint="Account locks after this many failures." />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <ToggleField label="Require uppercase letter" checked={s.requireUppercase} onChange={(v) => setField('security', 'requireUppercase', v)} />
            <ToggleField label="Require a number" checked={s.requireNumber} onChange={(v) => setField('security', 'requireNumber', v)} />
            <ToggleField label="Enforce two-factor (2FA)" hint="All users must set up 2FA at next login." checked={s.require2FA} onChange={(v) => setField('security', 'require2FA', v)} />
            <ToggleField label="Allow self-registration" checked={s.allowSelfRegistration} onChange={(v) => setField('security', 'allowSelfRegistration', v)} />
            <ToggleField label="Require admin approval for new accounts" checked={s.requireApproval} onChange={(v) => setField('security', 'requireApproval', v)} />
          </div>
        </SectionShell>
      );
    }

    if (tab === 'notifications') {
      const n = form.notifications;
      return (
        <SectionShell title="Notifications" desc="Email (SMTP) and SMS delivery configuration."
          saving={saving === 'notifications'} dirty={dirty('notifications')} onSave={() => saveSection('notifications')}>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            <ToggleField label="Enable email notifications" checked={n.emailEnabled} onChange={(v) => setField('notifications', 'emailEnabled', v)} />
          </div>
          <div className="as-grid" style={{ ...grid, marginBottom: 16, opacity: n.emailEnabled ? 1 : 0.55 }}>
            <TextField label="SMTP host" value={n.smtpHost} onChange={(v) => setField('notifications', 'smtpHost', v)} placeholder="smtp.gmail.com" />
            <NumberField label="SMTP port" value={n.smtpPort} onChange={(v) => setField('notifications', 'smtpPort', v)} />
            <TextField label="SMTP username" value={n.smtpUser} onChange={(v) => setField('notifications', 'smtpUser', v)} />
            <TextField label="From email" type="email" value={n.fromEmail} onChange={(v) => setField('notifications', 'fromEmail', v)} placeholder="no-reply@…" />
          </div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            <ToggleField label="Enable SMS notifications" checked={n.smsEnabled} onChange={(v) => setField('notifications', 'smsEnabled', v)} />
          </div>
          <div className="as-grid" style={{ ...grid, opacity: n.smsEnabled ? 1 : 0.55 }}>
            <SelectField label="SMS provider" value={n.smsProvider} onChange={(v) => setField('notifications', 'smsProvider', v)} options={SMS_PROVIDERS} />
          </div>
        </SectionShell>
      );
    }

    if (tab === 'integrations') {
      const i = form.integrations;
      return (
        <SectionShell title="Integrations" desc="Payments, video conferencing, SSO, and storage."
          saving={saving === 'integrations'} dirty={dirty('integrations')} onSave={() => saveSection('integrations')}>
          <div className="as-grid" style={{ ...grid, marginBottom: 16 }}>
            <SelectField label="Payment gateway" value={i.paymentGateway} onChange={(v) => setField('integrations', 'paymentGateway', v)} options={PAY_GATEWAYS} />
            <TextField label="Payment API key" type="password" value={i.paymentKey} onChange={(v) => setField('integrations', 'paymentKey', v)} placeholder="••••••••" />
            <TextField label="Zoom API key" value={i.zoomApiKey} onChange={(v) => setField('integrations', 'zoomApiKey', v)} />
            <TextField label="Zoom API secret" type="password" value={i.zoomApiSecret} onChange={(v) => setField('integrations', 'zoomApiSecret', v)} placeholder="••••••••" />
            <TextField label="S3 bucket" value={i.s3Bucket} onChange={(v) => setField('integrations', 's3Bucket', v)} placeholder="my-lms-uploads" />
          </div>
          <ToggleField label="Enable Google SSO" hint="Allow sign-in with Google Workspace accounts." checked={i.googleSsoEnabled} onChange={(v) => setField('integrations', 'googleSsoEnabled', v)} />
        </SectionShell>
      );
    }

    if (tab === 'features') {
      const f = form.features;
      return (
        <SectionShell title="Features" desc="Turn platform modules on or off."
          saving={saving === 'features'} dirty={dirty('features')} onSave={() => saveSection('features')}>
          <div style={{ display: 'grid', gap: 10 }}>
            <ToggleField label="Discussions / Forum" checked={f.discussions} onChange={(v) => setField('features', 'discussions', v)} />
            <ToggleField label="Mentorship sessions" checked={f.mentorship} onChange={(v) => setField('features', 'mentorship', v)} />
            <ToggleField label="Live classes" checked={f.liveClasses} onChange={(v) => setField('features', 'liveClasses', v)} />
            <ToggleField label="Certificates" checked={f.certificates} onChange={(v) => setField('features', 'certificates', v)} />
            <ToggleField label="Gamification (badges, leaderboard)" checked={f.gamification} onChange={(v) => setField('features', 'gamification', v)} />
            <ToggleField label="Maintenance mode" hint="Shows a maintenance screen to all non-admin users." checked={f.maintenanceMode} onChange={(v) => setField('features', 'maintenanceMode', v)} />
          </div>
        </SectionShell>
      );
    }

    // Account / password
    return (
      <div style={{ animation: 'as-fade .2s ease' }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#172033' }}>Account</h3>
          <p style={{ margin: '5px 0 0', color: '#657691', fontSize: 12.5 }}>Change your admin password.</p>
        </div>
        <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
          <TextField label="Current password" type="password" value={pwd.current} onChange={(v) => setPwd((p) => ({ ...p, current: v }))} />
          <TextField label="New password" type="password" value={pwd.next} onChange={(v) => setPwd((p) => ({ ...p, next: v }))} hint={`At least ${form.security.passwordMinLength || 8} characters.`} />
          <TextField label="Confirm new password" type="password" value={pwd.confirm} onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid #eef3f8', paddingTop: 16 }}>
          <button className="as-btn" type="button" onClick={changePassword} disabled={pwdSaving}
            style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {pwdSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    );
  }, [tab, form, loaded, saving, pwd, pwdSaving]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="as-wrap" style={{ padding: 28, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <style>{CSS}</style>

      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, color: '#172033' }}>Admin Settings</h2>
        <p style={{ margin: 0, color: '#657691', fontSize: 13 }}>
          Configure organisation, security, notifications, integrations, and feature toggles.
        </p>
      </div>

      {loadErr && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
          ⚠️ {loadErr}
        </div>
      )}

      <div className="as-shell" style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: 14, border: '1px solid #dbe3ed', overflow: 'hidden', boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)' }}>
        {/* Tabs rail */}
        <div className="as-tabs" style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 210, flexShrink: 0, padding: 12, borderRight: '1px solid #eef3f8', background: '#fbfdff' }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} className="as-tab" onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
                  padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13.5, fontWeight: active ? 800 : 600,
                  background: active ? 'rgba(63,125,160,.12)' : 'transparent',
                  color: active ? BRAND : '#657691', transition: 'background .15s, color .15s',
                }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="as-pad" style={{ flex: 1, padding: 24, minWidth: 0 }}>
          {loading ? <Spinner /> : body}
        </div>
      </div>
    </div>
  );
}