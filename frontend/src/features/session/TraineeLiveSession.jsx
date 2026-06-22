// src/features/session/TraineeLiveSession.jsx
//
// Trainee live view. Shows a "Join Session" screen, fetches a join token from the
// backend (which also stamps the trainee's join time into the attendance module),
// then enters the shared LiveRoom.
//
// Trainees can now turn ON their camera/mic/screen-share and chat — but they join
// MUTED with the camera OFF (autoPublish=false), so nothing broadcasts until they
// choose to. On leave we finalise attendance (leftAt + present/late/partial/absent).
import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import LiveRoom from '../../components/live/LiveRoom';

const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const TraineeLiveSession = ({ session, connection: connectionProp, onLeave }) => {
  const token = useSelector((s) => s.auth?.token || '');
  const user  = useSelector((s) => s.auth?.user) || {};

  const [connection, setConnection] = useState(connectionProp || null); // { token, url, role, canPublish }
  const [status, setStatus] = useState(connectionProp ? 'joined' : 'idle'); // idle|connecting|joined|error
  const [error, setError] = useState(null);

  // Remember when we entered so we can report attended seconds on leave.
  const joinedAtRef = useRef(connectionProp ? Date.now() : null);

  const sessionId = session?._id || session?.id;

  const handleJoin = async () => {
    if (!sessionId) {
      setError('This session is missing an id — please refresh the list.');
      setStatus('error');
      return;
    }
    setStatus('connecting');
    setError(null);
    try {
      const { data } = await axios.post(
        `${API}/api/trainee/sessions/${sessionId}/join`,
        { passcode: session?.passcode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!data?.token || !data?.url) throw new Error(data?.message || 'No valid join token returned.');
      joinedAtRef.current = Date.now();
      setConnection({
        token: data.token,
        url: data.url,
        role: data.role || 'student',
        canPublish: data.canPublish !== false,
      });
      setStatus('joined');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to join the session.');
      setStatus('error');
    }
  };

  // Finalise attendance on the backend, then hand control back to the parent.
  // Best-effort: a failure here must never trap the user inside the room.
  const finaliseAttendance = async () => {
    if (!sessionId) return;
    const attendedSeconds = joinedAtRef.current
      ? Math.max(0, Math.round((Date.now() - joinedAtRef.current) / 1000))
      : undefined;
    try {
      await axios.post(
        `${API}/api/trainee/sessions/${sessionId}/attendance/leave`,
        attendedSeconds != null ? { attendedSeconds } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) { /* ignore — leaving must always succeed */ }
  };

  const handleLeave = async () => {
    await finaliseAttendance();
    setConnection(null);
    setStatus('idle');
    joinedAtRef.current = null;
    if (typeof onLeave === 'function') onLeave();
  };

  // ── In the room ──
  if (status === 'joined' && connection?.token && connection?.url) {
    const canPublish = connection?.canPublish ?? (connection?.role === 'trainer');
    return (
      <LiveRoom
        token={connection.token}
        serverUrl={connection.url}
        canPublish={canPublish}      // trainee may enable cam/mic/screen
        autoPublish={false}          // …but joins muted with camera OFF
        title={session?.title || 'Live Session'}
        identityName={user?.name || 'Trainee'}
        onLeave={handleLeave}
      />
    );
  }

  // ── Pre-join screen ──
  return (
    <div className="p-6">
      {onLeave && (
        <button onClick={handleLeave} className="text-sm text-gray-500 mb-4">← Back to sessions</button>
      )}

      <h1 className="text-xl font-bold mb-1">{session?.title || 'Live Session'}</h1>
      <p className="text-sm text-gray-500 mb-4">
        You'll join the live room. Your camera and microphone start off — turn them on
        from the control bar whenever you like. You can also share your screen and chat.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={status === 'connecting'}
        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
      >
        {status === 'connecting' ? 'Joining…' : 'Join Session'}
      </button>

      <p className="mt-3 text-xs text-gray-400">Signed in as {user?.name || 'trainee'}.</p>
    </div>
  );
};

export default TraineeLiveSession;