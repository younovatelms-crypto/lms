// src/routes/livekitWebhook.js
'use strict';
const express = require('express');
const { webhookReceiver } = require('../services/livekitService');
const Session   = require('../models/Session');
const Recording = require('../models/Recording');
const router = express.Router();

router.post('/webhook', async (req, res) => {
  try {
    const event = await webhookReceiver.receive(req.body, req.get('Authorization'));
    const eg = event.egressInfo;

    if (eg && (event.event === 'egress_ended' || event.event === 'egress_updated')) {
      const file = eg.fileResults?.[0] || {};
      // LiveKit reports duration in nanoseconds, size in bytes (int64 → bigint)
      const durationSeconds = file.duration ? Math.round(Number(file.duration) / 1e9) : 0;
      const sizeBytes       = file.size ? Number(file.size) : 0;

      // prefer the uploaded location (S3/cloud); fall back to a local /recordings path
      const location = file.location || '';
      const relPath  = (file.filename || '').replace(/^\/out\//, '');
      const url = location
        || (relPath ? `${process.env.PUBLIC_API_URL || 'http://localhost:8080'}/recordings/${relPath}` : '');

      const ended = event.event === 'egress_ended';

      const recording = await Recording.findOneAndUpdate(
        { egressId: eg.egressId },
        {
          status:   ended ? 'completed' : 'active',
          url,
          filename: file.filename || '',
          durationSeconds,
          sizeBytes,
          ...(ended ? { endedAt: new Date() } : {}),
        },
        { new: true }
      );

      if (ended) {
        await Session.findOneAndUpdate(
          { $or: [{ egressId: eg.egressId }, { roomName: eg.roomName }] },
          { recordingUrl: url, recordingStatus: 'available' }
        );
        console.log('Recording saved →', url, `(${durationSeconds}s, ${sizeBytes} bytes)`, recording?._id);
      }
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('ok');   // always 200 so LiveKit doesn't retry-storm
  }
});

module.exports = router;