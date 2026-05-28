import React, { useEffect, useMemo, useState } from 'react';

// Admin LMS Content page
// NOTE: Backend endpoints for LMS content are not present in the current repo.
// This page provides a clean management UI scaffold that can be wired later.

const C = {
  brand: '#2f6f9b',
  brand2: '#1f3d63',
  text: '#172033',
  sub: '#657691',
  line: '#dbe3ed',
  card: '#ffffff',
  bg: '#f5f8fc',
  ok: '#16a05f',
  warn: '#d47a00',
  err: '#e12e2a',
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, letterSpacing: 0.4, marginBottom: 6 }}>
        {label}
      </div>
      {children}
      {hint ? <div style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        outline: 'none',
        background: '#fff',
        fontFamily: 'inherit',
      }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        outline: 'none',
        background: '#fff',
        minHeight: 96,
        resize: 'vertical',
        fontFamily: 'inherit',
      }}
    />
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: '10px 16px',
        background: C.brand,
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontWeight: 800,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: '10px 16px',
        background: '#fff',
        color: C.brand2,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontWeight: 800,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </button>
  );
}

export default function AdminLmsContent() {
  const [activeTab, setActiveTab] = useState('manage');

  // Local-only scaffold state (until backend wiring)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('video');
  const [url, setUrl] = useState('');

  const templateItems = useMemo(
    () => [
      { type: 'video', label: 'Videos' },
      { type: 'document', label: 'Documents' },
      { type: 'quiz', label: 'Quizzes' },
      { type: 'link', label: 'Links' },
    ],
    []
  );

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCreate = (e) => {
    e.preventDefault();
    // Scaffold: just show success; backend integration can replace this.
    if (!title.trim()) {
      setToast({ kind: 'error', msg: 'Title is required.' });
      return;
    }
    setToast({ kind: 'success', msg: 'LMS item created (UI scaffold). Hook up backend to persist.' });
    setTitle('');
    setDescription('');
    setUrl('');
    setContentType('video');
  };

  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: C.text }}>LMS Content</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>
            Create and manage training content for sessions. (UI scaffold — backend endpoints can be wired later.)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <GhostButton
            onClick={() => setActiveTab('manage')}
            style={{
              borderColor: activeTab === 'manage' ? C.brand : C.line,
              color: activeTab === 'manage' ? C.brand : C.brand2,
            }}
          >
            Manage
          </GhostButton>
          <GhostButton
            onClick={() => setActiveTab('preview')}
            style={{
              borderColor: activeTab === 'preview' ? C.brand : C.line,
              color: activeTab === 'preview' ? C.brand : C.brand2,
            }}
          >
            Preview
          </GhostButton>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            marginBottom: 18,
            padding: '12px 14px',
            borderRadius: 12,
            background: toast.kind === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${toast.kind === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: toast.kind === 'success' ? '#047857' : '#B91C1C',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {toast.msg}
        </div>
      ) : null}

      <div
        style={{
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
          overflow: 'hidden',
        }}
      >
        {activeTab === 'manage' ? (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 18 }}>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Content Type">
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1px solid ${C.line}`,
                        outline: 'none',
                        background: '#fff',
                        fontFamily: 'inherit',
                      }}
                    >
                      {templateItems.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="URL / Asset Link" hint="Optional for video/link content">
                    <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                  </Field>
                </div>

                <Field label="Title">
                  <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., React Hooks - Part 1" />
                </Field>

                <Field label="Description" hint="Shown to trainees before/while starting a session">
                  <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short overview of what learners will get..." />
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                  <PrimaryButton type="submit">Create LMS Item</PrimaryButton>
                  <GhostButton
                    type="button"
                    onClick={() => {
                      setTitle('');
                      setDescription('');
                      setUrl('');
                      setContentType('video');
                      setToast({ kind: 'success', msg: 'Form cleared.' });
                    }}
                  >
                    Clear
                  </GhostButton>
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: C.sub, fontWeight: 700 }}>
                    Saved locally only
                  </div>
                </div>
              </form>

              <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: 18 }}>
                <div style={{ fontWeight: 900, color: C.text, marginBottom: 10 }}>What’s included</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: C.sub, fontSize: 13, lineHeight: 1.8 }}>
                  <li>Form to add LMS items (type, title, description, optional URL)</li>
                  <li>Preview tab to show how content can be grouped</li>
                  <li>Ready to wire into backend once LMS content endpoints exist</li>
                </ul>

                <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: '#F8FAFC', border: `1px solid ${C.line}` }}>
                  <div style={{ fontWeight: 900, color: C.brand2, marginBottom: 6, fontSize: 13 }}>Next integration step</div>
                  <div style={{ color: C.sub, fontSize: 13 }}>
                    Add endpoints for LMS content CRUD and session-to-content mapping, then replace the UI scaffold submission.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'stretch' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, color: C.text, marginBottom: 10 }}>Session Content Preview</div>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Module', 'Type', 'Title', 'Status'].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: C.sub, fontSize: 12 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { module: '1', type: 'video', title: 'React Hooks - Part 1', status: 'Published' },
                        { module: '2', type: 'document', title: 'JSX Patterns (Guide)', status: 'Published' },
                        { module: '3', type: 'quiz', title: 'Quiz: Hooks Basics', status: 'Scheduled' },
                      ].map((row, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                          <td style={{ padding: '11px 14px', color: C.text, fontWeight: 800 }}>{row.module}</td>
                          <td style={{ padding: '11px 14px', color: C.sub, fontWeight: 800, textTransform: 'capitalize' }}>{row.type}</td>
                          <td style={{ padding: '11px 14px', color: C.text, fontWeight: 700 }}>{row.title}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 900,
                                color: row.status === 'Published' ? C.ok : C.warn,
                                background: row.status === 'Published' ? '#ECFDF5' : '#FFFBEB',
                                border: `1px solid ${row.status === 'Published' ? '#BBF7D0' : '#FDE68A'}`,
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ width: 320 }}>
                <div style={{ fontWeight: 900, color: C.text, marginBottom: 10 }}>Assignments link</div>
                <div style={{ color: C.sub, fontSize: 13, lineHeight: 1.7 }}>
                  Once assignments are created, you can connect them to a session module here.
                  <br />
                  <br />
                  Currently this is a UI-only preview.
                </div>
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: '#F8FAFC', border: `1px solid ${C.line}` }}>
                  <div style={{ fontWeight: 900, color: C.brand2, marginBottom: 6, fontSize: 13 }}>Tip</div>
                  <div style={{ color: C.sub, fontSize: 13 }}>
                    Use <b>Admin → Assignments</b> to manage quizzes/tasks and later map them to LMS content.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

