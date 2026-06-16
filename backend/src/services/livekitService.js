// src/services/livekitService.js  — COMPLETE
'use strict';
const {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  WebhookReceiver,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} = require('livekit-server-sdk');

const apiKey    = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

// Client URL (ws) is what the browser uses; the server API clients need http(s).
const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const host = (process.env.LIVEKIT_HOST || LIVEKIT_URL)
  .replace(/^wss:/, 'https:')
  .replace(/^ws:/,  'http:');

const roomService     = new RoomServiceClient(host, apiKey, apiSecret);
const egressClient    = new EgressClient(host, apiKey, apiSecret);
const webhookReceiver = new WebhookReceiver(apiKey, apiSecret);

// ── THE MISSING EXPORT ───────────────────────────────────────────────
// kind: 'publisher' | 'trainer' → can publish; anything else → subscribe-only
async function generateLiveKitToken(user, roomName, kind = 'subscriber') {
  if (!apiKey || !apiSecret) throw new Error('LiveKit API key/secret not configured');

  const canPublish = kind === 'publisher' || kind === 'trainer';
  const role       = user.role || (canPublish ? 'trainer' : 'student');
  const identity   = `${role}-${user._id}`;

  const at = new AccessToken(apiKey, apiSecret, { identity, name: user.name, ttl: '3h' });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
    roomRecord: canPublish,
    roomAdmin: canPublish,
  });
  return at.toJwt(); // v2: async
}

// ── Recording ────────────────────────────────────────────────────────
function buildFileOutput() {
  // Local disk by default; S3/R2/B2 if env vars are present (REQUIRED on LiveKit Cloud).
  if (process.env.S3_BUCKET) {
    return new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: '{room_name}/{time}.mp4',
      output: {
        case: 's3',
        value: new S3Upload({
          accessKey: process.env.S3_ACCESS_KEY,
          secret:    process.env.S3_SECRET_KEY,
          bucket:    process.env.S3_BUCKET,
          region:    process.env.S3_REGION,
          endpoint:  process.env.S3_ENDPOINT, // set for R2 / Backblaze / MinIO
        }),
      },
    });
  }
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: '/out/{room_name}/{time}.mp4', // self-hosted egress only
  });
}

async function startRecording(roomName) {
  const info = await egressClient.startRoomCompositeEgress(roomName, { file: buildFileOutput() });
  return info.egressId;
}

async function stopRecording(egressId) {
  if (!egressId) return;
  try { await egressClient.stopEgress(egressId); }
  catch (err) { console.error('stopEgress failed →', err.message); }
}

module.exports = {
  LIVEKIT_URL,
  roomService,
  egressClient,
  webhookReceiver,
  generateLiveKitToken,
  startRecording,
  stopRecording,
};