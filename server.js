require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const { connectDB } = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const notesRoutes = require('./src/routes/notes.routes');
const adminRoutes = require('./src/routes/admin.routes');
const setupChat = require('./src/socket/chatHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.IO chat listeners
setupChat(io);

// Server startup
const PORT = process.env.PORT || 5000;

async function startServer(port = PORT) {
  await connectDB();
  return new Promise((resolve) => {
    server.listen(port, () => {
      // Exact format shown in Fig 3: [server] listening on http://localhost:5000
      console.log(`[server] listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };
