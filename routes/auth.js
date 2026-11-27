const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { signToken } = require('../utils/token');
const appEvents = require('../events/appEvents');

const router = express.Router();
const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

const isString = (v) => typeof v === 'string';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (![username, email, password].every(isString) || !username.trim() || !email.trim() || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }
    if (username.trim().length < 3 || username.trim().length > 30) {
      return res.status(400).json({ message: 'username must be 3-30 characters' });
    }
    if (!EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ $or: [{ email: cleanEmail }, { username: username.trim() }] });
    if (exists) return res.status(409).json({ message: 'Username or email already in use' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Role is NEVER taken from the request body (prevents privilege escalation)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const role = adminEmails.includes(cleanEmail) ? 'admin' : 'user';

    const user = await User.create({ username: username.trim(), email: cleanEmail, passwordHash, role });
    appEvents.emit('user:registered', user);

    res.status(201).json({ message: 'User registered', id: user._id, username: user.username, email: user.email });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Username or email already in use' });
    console.error('[signup]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isString(email) || !isString(password) || !email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    const match = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !match) return res.status(401).json({ message: 'Invalid email or password' });

    const token = signToken(user);
    const { exp } = jwt.decode(token);

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: exp * 1000 - Date.now(),
    });

    appEvents.emit('user:loggedIn', user);
    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me  (simple protected route)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
