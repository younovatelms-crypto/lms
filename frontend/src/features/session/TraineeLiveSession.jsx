// src/features/session/TraineeLiveSession.jsx
//
// Trainee live view. Shows a "Join Session" screen, fetches a SUBSCRIBE token from
// the backend, then enters the shared LiveRoom (video viewer + chat).
// Crash-proof: user/token come from the redux store, never from a possibly-undefined prop.
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import LiveRoom from '../../components/live/LiveRoom';

const API = process.env.REACT_APP_API_BASE_URL || ''; // '' → CRA proxy to :8080

const TraineeLiveSession = ({ session, connection: connectionProp, onLeave }) => {
  const token = useSelector((s) => s.auth?.token || '');
  const user  = useSelector((s) => s.auth?.user) || {};

  const [connection, setConnection] = useState(connectionProp || null); // { token, url, role }
  const [status, setStatus] = useState(connectionProp ? 'joined' : 'idle'); // idle|connecting|joined|error
  const [error, setError] = useState(null);

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
      setConnection({ token: data.token, url: data.url, role: data.role || 'student' });
      setStatus('joined');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to join the session.');
      setStatus('error');
    }
  };

  const handleLeave = () => {
    setConnection(null);
    setStatus('idle');
    if (typeof onLeave === 'function') onLeave();
  };

  // ── In the room (viewer: no publish, but can chat) ──
  if (status === 'joined' && connection?.token && connection?.url) {
    return (
      <LiveRoom
        token={connection.token}
        serverUrl={connection.url}
        canPublish={true}                 // trainee is a viewer
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
        You'll join as a viewer. The trainer's video and audio will appear once they're live.
        You can use the chat to ask questions.
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