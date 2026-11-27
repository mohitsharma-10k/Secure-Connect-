const express = require('express');
const User = require('../models/User');
const Note = require('../models/Note');
const { verifyToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');

const router = express.Router();

// Only admin role can access these routes
router.use(verifyToken, authorizeRoles('admin'));

/**
 * GET /api/admin/users
 * Returns list of all registered users (RBAC demo)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    return res.status(200).json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ message: 'Error retrieving users' });
  }
});

/**
 * GET /api/admin/notes
 * Returns all notes in system across all users
 */
router.get('/notes', async (req, res) => {
  try {
    const notes = await Note.find({});
    return res.status(200).json(notes);
  } catch (err) {
    console.error('Admin notes error:', err);
    return res.status(500).json({ message: 'Error retrieving all notes' });
  }
});

module.exports = router;
