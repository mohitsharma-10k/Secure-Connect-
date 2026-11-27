const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Note = require('../models/Note');
const { authenticate, authorize } = require('../middleware/auth');
const { stats } = require('../events/listeners');

const router = express.Router();
router.use(authenticate, authorize('admin')); // RBAC: admins only

// List all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    console.error('[admin:users]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user and their notes
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid user id' });
    if (id === req.user.id) return res.status(400).json({ message: 'Admins cannot delete themselves' });

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Note.deleteMany({ owner: id });
    res.json({ message: 'User and their notes deleted' });
  } catch (err) {
    console.error('[admin:delete-user]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Activity counters collected by EventEmitter listeners
router.get('/stats', (req, res) => res.json(stats));

module.exports = router;
