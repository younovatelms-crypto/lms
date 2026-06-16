import React, { useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

/**
 * TraineeLiveSession
 * ------------------
 * Joins a scheduled session as a STUDENT (subscribe-only).
 * Calls the shared role-aware backend: POST /api/livekit/token
 *   body  -> { room, identity, name, role: 'student' }
 *   reply -> { token, url, role }
 *
 * Props:
 *   session : the session object (needs _id; title is optional)
 *   user    : { id, name }  — the logged-in trainee
 *   onLeave : optional callback when they exit the room
 */
const TraineeLiveSession = ({ session, user, onLeave }) => {
  const [connection, setConnection] = useState(null); // { token, url }
  const [status, setStatus] = useState('idle');       // idle | connecting | joined | error
  const [error, setError] = useState(null);

  const room = `session_${session._id}`; // MUST match what the trainer joins

  const handleJoin = async () => {
    setStatus('connecting');
    setError(null);
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          room,
          identity: user.id,            // must be unique per participant
          name: user.name,
          role: 'student',              // <-- this is the trainee grant
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to get a join token');
      }

      const { token, url } = await res.json();
      setConnection({ token, url });
      setStatus('joined');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleLeave = () => {
    setConnection(null);
    setStatus('idle');
    onLeave?.();
  };

  // ---- In the room (subscribe-only viewer) ----
  if (status === 'joined' && connection) {
    return (
      <div className="h-screen w-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
          <span className="font-semibold truncate">
            {session.title || 'Live Session'} · watching
          </span>
          <button
            onClick={handleLeave}
            className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-sm"
          >
            Leave
          </button>
        </div>

        <div className="flex-1">
          <LiveKitRoom
            serverUrl={connection.url}
            token={connection.token}
            connect={true}
            // Student is subscribe-only: don't publish or request camera/mic.
            video={false}
            audio={false}
            onDisconnected={handleLeave}
            data-lk-theme="default"
            style={{ height: '100%' }}
          >
            {/* VideoConference works fine for viewers; the server grant
                (canPublish:false) prevents publishing regardless of UI. */}
            <VideoConference />
            {/* Required so the trainer's audio is actually heard. */}
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  // ---- Pre-join / lobby ----
  return (
    <div className="p-6 max-w-md">
      <h2 className="text-xl font-bold mb-2">{session.title || 'Session'}</h2>
      <p className="text-sm text-gray-500 mb-4">
        You'll join as a viewer. The trainer's video and audio will appear once they're live.
      </p>

      {error && (
        <div className="mb-3 p-3 rounded-md bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      <button
        onClick={handleJoin}
        disabled={status === 'connecting'}
        className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
      >
        {status === 'connecting' ? 'Connecting…' : 'Join Session'}
      </button>
    </div>
  );
};

export default TraineeLiveSession;