// src/components/live/LiveRoom.jsx
//
// ONE shared LiveKit room used by BOTH trainer and trainee.
//   - Video/audio : anyone with canPublish=true streams camera + mic.
//   - Screen share: available from the control bar for publishers.
//   - Chat        : both sides exchange text over LiveKit's data channel.
//
// Layout (Google-Meet style):
//   - A big "spotlight" stage fills the width with the most relevant track:
//       screen share  >  pinned tile  >  active speaker  >  the other person.
//   - Everyone else sits in a small thumbnail filmstrip (click a thumb to pin
//     it into the spotlight; click the spotlight again to un-pin).
//   - So a trainee sees the TRAINER large and wide, with their own camera as a
//     small self-view thumbnail (and vice-versa) — no more tiny equal tiles.
//   - Desktop: spotlight on the left, chat docked on the right.
//   - Mobile : video fills the screen; chat opens as a slide-up drawer.
//
// Props:
//   token        : LiveKit access token
//   serverUrl    : wss URL
//   canPublish   : true -> show camera/mic/screen-share controls
//   title        : session title for the header
//   identityName : display name shown in chat
//   onLeave      : called when the user leaves / disconnects
import React, { useState, useMemo } from 'react';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useChat,
  isTrackReference,
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
  const [chatOpen, setChatOpen] = useState(false); // mobile drawer state

  if (!token || !serverUrl) {
    return (
      <div className="p-6">
        <button onClick={onLeave} className="text-sm text-gray-500 mb-4">&larr; Back</button>
        <p className="text-red-500">No live connection. Please re-join the session.</p>
      </div>
    );
  }

  return (
    <div className="lk-shell" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0b0f17' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-2 text-white"
        style={{ background: '#111827', borderBottom: '1px solid #1f2937' }}
      >
        <span className="font-semibold truncate text-sm sm:text-base">{title}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChatOpen((o) => !o)}
            className="lk-chat-toggle px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
          >
            {chatOpen ? 'Hide chat' : 'Chat'}
          </button>
          <button onClick={onLeave} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
            Leave
          </button>
        </div>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video={canPublish}
        audio={canPublish}
        onDisconnected={onLeave}
        data-lk-theme="default"
        style={{ flex: 1, minHeight: 0, display: 'flex' }}
      >
        {/* Video column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Stage />
          </div>

          {/* Control bar: camera, mic, screen-share (publishers only). */}
          {canPublish && (
            <div style={{ background: '#111827', borderTop: '1px solid #1f2937' }}>
              <ControlBar
                variation="verbose"
                controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
              />
            </div>
          )}
        </div>

        {/* Chat: docked sidebar on desktop, slide-up drawer on mobile. */}
        <ChatPanel myName={identityName} open={chatOpen} onClose={() => setChatOpen(false)} />

        {/* Plays remote audio for everyone (essential to actually hear the room). */}
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Responsive + Meet-style layout rules. */}
      <style>{`
        .lk-chat {
          width: 340px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-left: 1px solid #e5e7eb;
          background: #fff;
        }
        .lk-chat-toggle { display: none; }
        @media (max-width: 767px) {
          .lk-chat-toggle { display: inline-block; }
          .lk-chat {
            position: fixed;
            left: 0; right: 0; bottom: 0;
            width: 100%;
            height: 60dvh;
            border-left: none;
            border-top: 1px solid #e5e7eb;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            box-shadow: 0 -8px 30px rgba(0,0,0,.35);
            transform: translateY(100%);
            transition: transform .22s ease;
            z-index: 50;
          }
          .lk-chat.open { transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .lk-chat.closed { display: none; }
        }

        /* ---- Google-Meet style spotlight + filmstrip ---- */
        .meet-stage {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          box-sizing: border-box;
        }
        .meet-spotlight {
          position: relative;
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #11161f;
          border-radius: 14px;
          overflow: hidden;
        }
        /* The spotlight tile fills the whole wide stage. */
        .meet-spotlight .lk-participant-tile {
          width: 100%;
          height: 100%;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
        }
        .meet-spotlight .lk-participant-tile video,
        .meet-spotlight .lk-participant-tile .lk-participant-media-video {
          width: 100%;
          height: 100%;
          object-fit: cover;     /* camera fills the frame, Meet-style */
        }
        /* A shared screen must never be cropped -> contain on black. */
        .meet-spotlight.is-screen .lk-participant-tile video,
        .meet-spotlight.is-screen .lk-participant-tile .lk-participant-media-video {
          object-fit: contain;
          background: #000;
        }

        /* Thumbnail filmstrip under the spotlight. */
        .meet-strip {
          flex-shrink: 0;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }
        .meet-thumb {
          position: relative;
          flex: 0 0 auto;
          width: 168px;
          height: 96px;            /* 16:9 thumbnails */
          border-radius: 10px;
          overflow: hidden;
          background: #11161f;
          border: 2px solid transparent;
          padding: 0;
          cursor: pointer;
        }
        .meet-thumb.is-active { border-color: #3b82f6; }   /* pinned highlight */
        .meet-thumb .lk-participant-tile {
          width: 100%; height: 100%; border-radius: 8px; overflow: hidden;
        }
        .meet-thumb .lk-participant-tile video,
        .meet-thumb .lk-participant-tile .lk-participant-media-video {
          width: 100%; height: 100%; object-fit: cover;
        }
        @media (max-width: 767px) {
          .meet-thumb { width: 120px; height: 68px; }
        }
      `}</style>
    </div>
  );
}

// -- Spotlight + filmstrip stage ----------------------------------------------
function Stage() {
  // Camera tiles keep a placeholder so a participant still shows (avatar) with
  // their camera off; screen-share tracks only appear when actually shared.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Stable id for a track ref so we can pin/compare across renders.
  const idOf = (t) => `${t?.participant?.identity ?? ''}:${t?.source ?? ''}`;

  const [pinnedId, setPinnedId] = useState(null);

  const { focus, strip, isScreen } = useMemo(() => {
    const screen = tracks.filter(
      (t) => t.source === Track.Source.ScreenShare && isTrackReference(t)
    );
    const cams = tracks.filter((t) => t.source === Track.Source.Camera);

    // Choose what goes in the big spotlight, in priority order.
    let f = null;
    if (pinnedId) {
      f = [...screen, ...cams].find((t) => idOf(t) === pinnedId) || null;
    }
    if (!f && screen.length) f = screen[0];                       // a shared screen wins
    if (!f) {
      const remoteCams = cams.filter((t) => !t.participant?.isLocal);
      const speaking = remoteCams.find((t) => t.participant?.isSpeaking);
      f = speaking || remoteCams[0] || cams[0] || null;           // else the other person, else self
    }

    const rest = tracks.filter((t) => idOf(t) !== idOf(f));
    return { focus: f, strip: rest, isScreen: f?.source === Track.Source.ScreenShare };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, pinnedId]);

  if (!focus) {
    return (
      <div className="meet-stage">
        <div className="meet-spotlight">
          <span style={{ color: '#9ca3af', fontSize: 14 }}>Waiting for video…</span>
        </div>
      </div>
    );
  }

  const togglePin = (t) => {
    const id = idOf(t);
    setPinnedId((cur) => (cur === id ? null : id));
  };

  return (
    <div className="meet-stage">
      <div
        className={`meet-spotlight ${isScreen ? 'is-screen' : ''}`}
        onClick={() => pinnedId && setPinnedId(null)}
        title={pinnedId ? 'Click to un-pin' : undefined}
      >
        <ParticipantTile trackRef={focus} />
      </div>

      {strip.length > 0 && (
        <div className="meet-strip">
          {strip.map((t) => {
            const id = idOf(t);
            return (
              <button
                key={id}
                className={`meet-thumb ${pinnedId === id ? 'is-active' : ''}`}
                onClick={() => togglePin(t)}
                title="Click to spotlight"
              >
                <ParticipantTile trackRef={t} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -- Chat panel (LiveKit data channel via useChat) -----------------------------
function ChatPanel({ myName, open, onClose }) {
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
    <aside className={`lk-chat ${open ? 'open' : 'closed'}`}>
      <div className="px-3 py-2 border-b border-gray-200 font-semibold text-gray-700 text-sm flex items-center justify-between">
        <span>Chat</span>
        <button onClick={onClose} className="lk-chat-toggle text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chatMessages.length === 0 ? (
          <p className="text-xs text-gray-400">No messages yet. Say hi.</p>
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
          placeholder="Type a message..."
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