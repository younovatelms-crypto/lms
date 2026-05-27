// src/services/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('accessToken='))
          ?.split('=')[1];

      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.role = decoded.role;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.userId} (${socket.role})`);

    // Join role-based room
    socket.join(socket.role);
    socket.join(`user:${socket.userId}`);

    socket.on('join:session', (sessionId) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('leave:session', (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Emit helpers used by controllers
const emitToSession = (sessionId, event, data) => {
  getIO().to(`session:${sessionId}`).emit(event, data);
};

const emitToRole = (role, event, data) => {
  getIO().to(role).emit(event, data);
};

const emitToUser = (userId, event, data) => {
  getIO().to(`user:${userId}`).emit(event, data);
};

module.exports = { initSocket, getIO, emitToSession, emitToRole, emitToUser };
