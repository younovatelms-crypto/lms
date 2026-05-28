// src/services/livekitService.js
'use strict';
const { AccessToken } = require('livekit-server-sdk');

/**
 * generateLiveKitToken
 * @param {object} user            – { _id, name, role }
 * @param {string} roomName
 * @param {'publisher'|'subscriber'} participantType
 */
const generateLiveKitToken = async (user, roomName, participantType) => {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: user._id.toString(), name: user.name, ttl: 300 }
  );

  if (participantType === 'publisher') {
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
  } else {
    // Trainees subscribe only — cannot publish video/audio
    at.addGrant({ roomJoin: true, room: roomName, canPublish: false, canSubscribe: true, canPublishData: false });
  }

  return at.toJwt();
};

module.exports = { generateLiveKitToken };
