const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const { authenticate } = require('../middleware/auth');
const appEvents = require('../events/appEvents');

const router = express.Router();
router.use(authenticate); // every notes route is protected

const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid note id' });
  next();
};

const validBody = ({ title, content }) =>
  typeof title === 'string' && title.trim() && typeof content === 'string' && content.trim();

// Create
router.post('/', async (req, res) => {
  try {
    if (!validBody(req.body || {})) return res.status(400).json({ message: 'title and content are required' });
    const note = await Note.create({
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      owner: req.user.id, // always from the token, never from the body
    });
    appEvents.emit('note:created', note);
    res.status(201).json(note);
  } catch (err) {
    console.error('[notes:create]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Read all (own notes only)
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: 1 });
    res.json(notes);
  } catch (err) {
    console.error('[notes:list]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Read one
router.get('/:id', validId, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    console.error('[notes:get]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update
router.put('/:id', validId, async (req, res) => {
  try {
    if (!validBody(req.body || {})) return res.status(400).json({ message: 'title and content are required' });
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { title: req.body.title.trim(), content: req.body.content.trim() },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    appEvents.emit('note:updated', note);
    res.json(note);
  } catch (err) {
    console.error('[notes:update]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete
router.delete('/:id', validId, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    appEvents.emit('note:deleted', note);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('[notes:delete]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
