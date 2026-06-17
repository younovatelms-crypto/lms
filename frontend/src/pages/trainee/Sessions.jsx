// src/pages/trainee/Sessions.jsx   →  route /trainee/sessions
//
// Lists the trainee's sessions and lets them join a LIVE one.
// Pairs with features/sessions/sessionsSlice.js (store key "traineeSessions").
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TraineeLiveSession from '../../features/session/TraineeLiveSession';
import {
  fetchSessions,
  joinSession,
  clearConnection,
  selectSessions,
  selectSessionsStatus,
  selectSessionsError,
  selectJoinStatus,
  selectJoinError,
} from '../../features/sessions/sessionsSlice';

const TraineeSessions = () => {
  const dispatch = useDispatch();

  const sessions   = useSelector(selectSessions);          // already an array (selector guarantees it)
  const status     = useSelector(selectSessionsStatus);
  const error      = useSelector(selectSessionsError);
  const joinStatus = useSelector(selectJoinStatus);
  const joinError  = useSelector(selectJoinError);

  // active = the session we're currently inside (+ its LiveKit connection); null = list view
  const [active, setActive] = useState(null);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  // Click "Join" → get a LiveKit token via the slice, then enter the room.
  const handleJoin = async (session) => {
    setJoiningId(session._id);
    try {
      const connection = await dispatch(
        joinSession({ id: session._id, passcode: session.passcode })
      ).unwrap();                                   // { id, token, url, roomName, role }
      setActive({ session, connection });
    } catch (_) {
      // joinError is rendered below
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = () => {
    dispatch(clearConnection());
    setActive(null);
  };

  // ── Live room view: hand off entirely to TraineeLiveSession ──
  if (active) {
    return (
      <TraineeLiveSession
        session={active.session}
        connection={active.connection}   // connects with connection.token + connection.url
        onLeave={handleLeave}
      />
    );
  }

  // ── List view ──
  if (status === 'loading' || status === 'idle')
    return <div className="p-6 text-gray-500">Loading sessions…</div>;
  if (status === 'failed')
    return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Sessions</h1>

      {joinError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
          {joinError}
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const isLive      = session.status === 'live';
            const isOver      = session.status === 'completed' || session.status === 'cancelled';
            const trainerName = session.trainerId?.name || 'TBD';
            const isJoining   = joinStatus === 'loading' && joiningId === session._id;

            return (
              <div
                key={session._id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-semibold text-gray-800 text-lg">
                    {session.title || 'Untitled Session'}
                  </h2>
                  <StatusBadge status={session.status} />
                </div>

                <p className="text-sm text-gray-500 mt-1">
                  {session.description || 'No description.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>📅 {formatDate(session.scheduledAt)}</span>
                  <span>⏰ {formatTime(session.scheduledAt, session.timezone)}</span>
                  <span>👤 {trainerName}</span>
                </div>

                {isOver && session.recordingUrl ? (
                  <a
                    href={session.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 text-center transition"
                  >
                    ▶ Watch recording
                  </a>
                ) : (
                  <button
                    onClick={() => handleJoin(session)}
                    disabled={!isLive || isJoining}
                    className={`mt-4 px-4 py-2 rounded-md text-sm font-medium text-white transition
                      ${isLive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}
                      ${isJoining ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {isJoining ? 'Joining…' : isLive ? '● Join Live' : 'Not live yet'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Small presentational helper ──
function StatusBadge({ status }) {
  const map = {
    live:      'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  };
  if (!status) return null;
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ── Date/time formatting off the single scheduledAt field ──
function formatDate(scheduledAt) {
  if (!scheduledAt) return 'TBD';
  return new Date(scheduledAt).toLocaleDateString();
}

function formatTime(scheduledAt, timezone) {
  if (!scheduledAt) return 'TBD';
  return new Date(scheduledAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

export default TraineeSessions;