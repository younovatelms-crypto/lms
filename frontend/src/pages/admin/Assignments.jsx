import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchAssignments,
  selectAllAssignments,
  selectAssignmentsError,
  selectAssignmentsStatus,
  createAssignment,
} from '../../features/assignment/assignmentsSlice';

// Admin Assignments page
// Uses existing assignmentsSlice endpoints.

const C = {
  brand: '#2f6f9b',
  brand2: '#1f3d63',
  text: '#172033',
  sub: '#657691',
  line: '#dbe3ed',
  ok: '#16a05f',
  warn: '#d47a00',
  err: '#e12e2a',
  bg: '#f5f8fc',
};

function Badge({ text, tone = 'default' }) {
  const cfg =
    tone === 'ok'
      ? { bg: '#ECFDF5', border: '#BBF7D0', color: C.ok }
      : tone === 'warn'
        ? { bg: '#FFFBEB', border: '#FDE68A', color: C.warn }
        : tone === 'err'
          ? { bg: '#FEF2F2', border: '#FECACA', color: C.err }
          : { bg: '#EEF3F8', border: C.line, color: C.sub };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 900,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      {text}
    </span>
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
        minHeight: 92,
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

export default function AdminAssignments() {
  const dispatch = useAppDispatch();
  const assignments = useAppSelector(selectAllAssignments);
  const status = useAppSelector(selectAssignmentsStatus);
  const error = useAppSelector(selectAssignmentsError);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('assignment');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [sessionId, setSessionId] = useState('');

  const createDisabled = useMemo(() => status === 'loading', [status]);

  useEffect(() => {
    dispatch(fetchAssignments());
  }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();

    // Backend may require different fields; slice simply forwards data.
    // Keep it minimal + optional.
    const payload = {
      title: title.trim(),
      type,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      instructions: instructions.trim() || undefined,
      sessionId: sessionId || undefined,
    };

    if (!payload.title) return;

    await dispatch(createAssignment(payload));

    setTitle('');
    setDueDate('');
    setInstructions('');
    setSessionId('');
    setType('assignment');
  };

  return (
    <div style={{ padding: 32, fontFamily: 'Public Sans, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: C.text }}>Assignments</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>
            Manage assignments/quizzes for sessions.
          </p>
        </div>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 800 }}>
          Total: {assignments?.length ?? 0}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          border: `1px solid ${C.line}`,
          boxShadow: '0 1px 2px rgba(23,32,51,.08), 0 12px 28px rgba(31,61,99,.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 22, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ fontWeight: 900, color: C.text, marginBottom: 10 }}>Create Assignment</div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 6 }}>Title</div>
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Implement ToDo App" />
            </div>

            <div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 6 }}>Type</div>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
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
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
                <option value="project">Project</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 6 }}>Due date</div>
              <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 6 }}>Session ID (optional)</div>
              <TextInput value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="Paste session _id" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 800, marginBottom: 6 }}>Instructions (optional)</div>
              <TextArea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Describe what trainees need to submit..." />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
              <PrimaryButton type="submit" disabled={createDisabled || !title.trim()}>
                Create
              </PrimaryButton>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 800 }}>
                {title.trim() ? 'Ready to create' : 'Title is required'}
              </div>
            </div>
          </form>
        </div>

        <div style={{ padding: 22 }}>
          {status === 'loading' ? (
            <div style={{ color: C.sub, fontWeight: 800 }}>Loading assignments…</div>
          ) : status === 'failed' ? (
            <div style={{ color: C.err, fontWeight: 900 }}>Error: {error || 'Failed to load assignments'}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Title', 'Type', 'Due', 'Session', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: C.sub, fontSize: 12 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(assignments || []).map((a, idx) => {
                    const due = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—';
                    const session = a.sessionId?.name || a.sessionId?._id || a.session?._id || a.sessionId || '—';
                    const statusTxt = a.status || (a.dueDate ? (new Date(a.dueDate) < new Date() ? 'Due' : 'Active') : 'Active');
                    const tone = statusTxt === 'Due' ? 'warn' : 'ok';

                    return (
                      <tr key={a._id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                        <td style={{ padding: '11px 14px', color: C.text, fontWeight: 800 }}>{a.title || 'Untitled'}</td>
                        <td style={{ padding: '11px 14px', color: C.sub, fontWeight: 800, textTransform: 'capitalize' }}>{a.type || '—'}</td>
                        <td style={{ padding: '11px 14px', color: C.text, fontWeight: 700 }}>{due}</td>
                        <td style={{ padding: '11px 14px', color: C.text, fontWeight: 700 }}>{session}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <Badge text={statusTxt} tone={tone} />
                        </td>
                      </tr>
                    );
                  })}

                  {(assignments || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: C.sub, fontWeight: 800 }}>
                        No assignments found
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

