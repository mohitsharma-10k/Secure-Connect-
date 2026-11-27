const { parseCookies } = require('../utils/cookies');
const { verifyToken } = require('../utils/token');
const Message = require('../models/Message');
const appEvents = require('../events/appEvents');

const ROOM_RE = /^[a-zA-Z0-9_-]{1,30}$/;
const DEFAULT_ROOM = 'general';

function initChat(io) {
  // Authenticate every socket using the same JWT as the REST API
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers.authorization || '';
      const headerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      const token =
        socket.handshake.auth?.token ||
        (headerMatch ? headerMatch[1].trim() : null) ||
        parseCookies(socket.handshake.headers.cookie).token;
      if (!token) return next(new Error('No token provided'));
      const { id, username, role } = verifyToken(token);
      socket.user = { id, username, role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  async function joinRoom(socket, room) {
    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);
    socket.to(room).emit('system', { room, text: `${socket.user.username} joined` });
    socket.emit('joined', { room });

    try {
      const history = await Message.find({ room }).sort({ createdAt: -1 }).limit(20).lean();
      socket.emit('history', { room, messages: history.reverse() });
    } catch (err) {
      console.error('[chat:history]', err.message);
    }
  }

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    joinRoom(socket, DEFAULT_ROOM);

    socket.on('joinRoom', (room) => {
      if (typeof room !== 'string' || !ROOM_RE.test(room)) {
        return socket.emit('error_message', { message: 'Invalid room name' });
      }
      joinRoom(socket, room);
    });

    socket.on('leaveRoom', (room) => {
      if (typeof room !== 'string' || !socket.rooms.has(room)) return;
      socket.leave(room);
      socket.to(room).emit('system', { room, text: `${socket.user.username} left` });
    });

    socket.on('chatMessage', async (payload) => {
      const { room, text } = payload || {};
      if (typeof room !== 'string' || typeof text !== 'string') return;
      const clean = text.trim().slice(0, 1000);
      // Only allow sending to rooms this socket has actually joined
      if (!clean || !socket.rooms.has(room)) {
        return socket.emit('error_message', { message: 'Join the room before sending messages' });
      }

      const message = { room, username: socket.user.username, text: clean, createdAt: new Date() };
      io.to(room).emit('message', message);
      console.log(`[${room}] ${message.username}: ${clean}`);
      appEvents.emit('chat:message', message);

      try {
        await Message.create(message);
      } catch (err) {
        console.error('[chat:persist]', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = initChat;
