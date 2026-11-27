/**
 * Socket.IO Chat Handler
 * Handles real-time, event-driven bidirectional communication
 * Formats console logs to match Fig 3 in Lab 4 assignment specifications:
 *
 * User connected: <socket.id>
 * <socket.id> joined room <room>
 * [<room>] <username>: <message>
 */
function setupChat(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join room event (supports both object { room, username } and plain room string)
    socket.on('joinRoom', (data) => {
      let room = 'general';
      let username = 'User';

      if (typeof data === 'string') {
        room = data;
      } else if (data && typeof data === 'object') {
        room = data.room || 'general';
        username = data.username || 'User';
      }

      socket.join(room);
      console.log(`${socket.id} joined room ${room}`);

      // Notify other members of the room
      socket.to(room).emit('systemMessage', {
        type: 'user_joined',
        text: `${username} joined room ${room}`,
        username,
        room,
        timestamp: new Date().toISOString()
      });
    });

    // Chat message event
    socket.on('chatMessage', (data) => {
      const room = data && data.room ? data.room : 'general';
      const username = data && data.username ? data.username : 'Anonymous';
      const message = data && data.message ? data.message : '';

      // Console output matching Fig 3
      console.log(`[${room}] ${username}: ${message}`);

      // Broadcast message to everyone in the room (including sender)
      io.to(room).emit('chatMessage', {
        room,
        username,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      // console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = setupChat;
