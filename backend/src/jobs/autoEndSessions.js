// src/jobs/autoEndSessions.js  — call once at startup
const cron = require('node-cron');               // npm i node-cron
const Session = require('../models/Session');
const { stopRecording } = require('../services/livekitService');

cron.schedule('* * * * *', async () => {          // every minute
  const due = await Session.find({ status: 'live', autoEnd: true });
  for (const s of due) {
    if (s.isOver()) {
      await stopRecording(s.egressId).catch(() => {});
      s.status = 'completed';
      s.recordingStatus = 'processing';
      s.endedAt = new Date();
      await s.save();
    }
  }
});