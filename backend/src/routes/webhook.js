// routes/webhook.js  — receives egress_ended and saves recordingUrl
'use strict';
const express = require('express');
const { webhookReceiver } = require('../services/livekitService');
const Session = require('../models/Session');
const router = express.Router();

router.post('/webhook', async (req, res) => {
  try {
    // req.body MUST be the raw Buffer/string here (see mounting note below)
    const event = await webhookReceiver.receive(req.body, req.get('Authorization'));

    if (event.event === 'egress_ended') {
      const eg   = event.egressInfo;
      const file = eg?.fileResults?.[0];
      const relPath = (file?.filename || '').replace(/^\/out\//, ''); // "<room>/<time>.mp4"
      const recordingUrl = relPath
        ? `${process.env.PUBLIC_API_URL || 'http://localhost:8080'}/recordings/${relPath}`
        : '';

      await Session.findOneAndUpdate(
        { $or: [{ egressId: eg.egressId }, { roomName: eg.roomName }] },
        { recordingUrl, status: 'completed', endedAt: new Date() }
      );
      console.log('Recording saved →', recordingUrl);
    }
    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('ok'); // always 200 so LiveKit doesn't retry-storm
  }
});

module.exports = router;