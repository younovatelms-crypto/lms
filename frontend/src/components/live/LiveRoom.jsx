// src/components/live/LiveRoom.jsx
//
// ONE shared LiveKit room used by BOTH trainer and trainee.
//   • Video/audio: trainer publishes (canPublish=true), trainee subscribes.
//   • Chat: both sides exchange text over LiveKit's data channel
//     (the backend grants canPublishData=true to everyone, so trainees can chat too).
//
// Props:
//   token      : LiveKit access token (from your /join or /start API)
//   serverUrl  : wss URL (returned by the same API as `url`)
//   canPublish : true for trainer, false for trainee (controls camera/mic)
//   title      : session title for the header
//   identityName : display name shown in chat
//   onLeave    : called when the user leaves / disconnects
import React from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useChat,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

export default function LiveRoom({
  token,
  serverUrl,
  canPublish = true,
  title = 'Live Session',
  identityName = 'You',
  onLeave,
}) {
  if (!token || !serverUrl) {
    return (
      <div className="p-6">
        <button onClick={onLeave} className="text-sm text-gray-500 mb-4">← Back</button>
        <p className="text-red-500">No live connection. Please re-join the session.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
        <span className="font-semibold">{title}</span>
        <button onClick={onLeave} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
          Leave
        </button>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video={canPublish}          // trainer turns camera on; trainee is viewer
        audio={canPublish}
        onDisconnected={onLeave}
        data-lk-theme="default"
        style={{ flex: 1, minHeight: 0, display: 'flex' }}
      >
        {/* Left: video grid. Right: chat. */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Stage />
          </div>
          {canPublish && <ControlBar variation="minimal" />}
        </div>

        <ChatPanel myName={identityName} />

        {/* Plays remote audio for everyone (essential for the trainee viewer). */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// ── Video grid (camera + screen-share tracks of all participants) ──────────────
function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

// ── Chat panel (LiveKit data channel via useChat) ─────────────────────────────
function ChatPanel({ myName }) {
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = React.useState('');
  const endRef = React.useRef(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const onSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    try {
      await send(text);
      setDraft('');
    } catch (_) {
      /* send failures are rare; keep the draft so the user can retry */
    }
  };

  return (
    <aside
      style={{ width: 320 }}
      className="flex flex-col border-l border-gray-200 bg-white"
    >
      <div className="px-3 py-2 border-b border-gray-200 font-semibold text-gray-700 text-sm">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chatMessages.length === 0 ? (
          <p className="text-xs text-gray-400">No messages yet. Say hi 👋</p>
        ) : (
          chatMessages.map((m) => {
            const fromName = m.from?.name || m.from?.identity || 'Participant';
            const mine = (m.from?.name || '') === myName;
            return (
              <div key={m.timestamp + (m.from?.identity || '')} className={`text-sm ${mine ? 'text-right' : 'text-left'}`}>
                <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                  {mine ? 'You' : fromName}
                </span>
                <span
                  className={`inline-block px-3 py-1.5 rounded-2xl ${
                    mine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSend} className="p-2 border-t border-gray-200 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </aside>
  );
}