require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const adminRoutes = require('./routes/admin');
const initChat = require('./sockets/chat');
const { registerListeners } = require('./events/listeners');

// Fail fast if required secrets are missing
for (const key of ['JWT_SECRET', 'MONGO_URI']) {
  if (!process.env[key]) {
    console.error(`[server] Missing ${key} in .env`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'))); // tiny chat test client

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
// Handles malformed JSON bodies and any uncaught errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON' });
  console.error('[error]', err);
  res.status(500).json({ message: 'Server error' });
});

registerListeners();
initChat(io);

connectDB()
  .then(() => server.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  });
