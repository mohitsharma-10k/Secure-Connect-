const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const appEmitter = require('../events/appEmitter');

const router = express.Router();

/**
 * POST /api/auth/signup
 * Registers a new user with hashed password
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, and password are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    const userId = newUser._id ? newUser._id.toString() : newUser.id;

    // Emit event
    appEmitter.emit('user:registered', {
      id: userId,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    });

    // Exact response structure matching Fig 1
    return res.status(201).json({
      message: 'User registered',
      id: userId,
      username: newUser.username,
      email: newUser.email
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
});

/**
 * POST /api/auth/login
 * Verifies credentials and generates JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userId = user._id ? user._id.toString() : user.id;

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_webdev3_lab4_secure';
    const token = jwt.sign(
      {
        id: userId,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      },
      secret,
      { expiresIn: '24h' }
    );

    // Emit event
    appEmitter.emit('user:login', {
      id: userId,
      username: user.username,
      email: user.email
    });

    // Exact response structure matching Fig 1
    return res.status(200).json({
      message: 'Login successful',
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

module.exports = router;
