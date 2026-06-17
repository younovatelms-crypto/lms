// src/pages/trainer/TrainerLiveControls.jsx
//
// Drop-in trainer control: Go Live → enter the shared LiveRoom as PUBLISHER
// (camera + mic + chat). Render inside your trainer Sessions UI:
//   <TrainerLiveControls session={session} />
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LiveRoom from '../../components/live/LiveRoom';
import {
  startSession,
  endSession,
  clearTrainerConnection,
  selectStartStatus,
  selectStartError,
  selectTrainerConnection,
} from '../../features/session/sessionsSlice';

export default function TrainerLiveControls({ session }) {
  const dispatch = useDispatch();
  const startStatus = useSelector(selectStartStatus);
  const startError  = useSelector(selectStartError);
  const connection  = useSelector(selectTrainerConnection); // { id, token, url, roomName, role }
  const user        = useSelector((s) => s.auth?.user) || {};
  const [entering, setEntering] = useState(false);

  const isLive = session.status === 'live';
  const inThisRoom = entering && connection?.id === session._id && connection?.token;

  const goLive = async () => {
    setEntering(true);
    try {
      await dispatch(startSession(session._id)).unwrap();
    } catch (_) {
      setEntering(false);
    }
  };

  const leave = () => { setEntering(false); dispatch(clearTrainerConnection()); };

  const end = async () => {
    await dispatch(endSession(session._id));
    leave();
  };

  if (inThisRoom) {
    return (
      <LiveRoom
        token={connection.token}
        serverUrl={connection.url}
        canPublish={true}                 // trainer publishes audio/video
        title={session.title || 'Live Session'}
        identityName={user?.name || 'Trainer'}
        onLeave={leave}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {!isLive ? (
        <button
          onClick={goLive}
          disabled={startStatus === 'loading'}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
        >
          {startStatus === 'loading' ? 'Starting…' : '● Go Live'}
        </button>
      ) : (
        <>
          <button onClick={goLive} className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
            Enter Room
          </button>
          <button onClick={end} className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-800">
            End Session
          </button>
        </>
      )}
      {startError && <span className="text-xs text-red-500">{startError}</span>}
    </div>
  );
}