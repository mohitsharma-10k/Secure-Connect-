const express = require('express');
const Note = require('../models/Note');
const { verifyToken } = require('../middleware/auth.middleware');
const appEmitter = require('../events/appEmitter');

const router = express.Router();

// Apply verifyToken middleware to all notes routes
router.use(verifyToken);

/**
 * GET /api/notes
 * Fetch all notes for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const notes = await Note.find({ owner: userId });
    return res.status(200).json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({ message: 'Error retrieving notes' });
  }
});

/**
 * POST /api/notes
 * Create a new note for the authenticated user
 */
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const userId = req.user.id;
    const newNote = await Note.create({
      title,
      content,
      owner: userId
    });

    // Emit event
    appEmitter.emit('note:created', newNote);

    // Exact response structure matching Fig 2
    return res.status(201).json(newNote);
  } catch (err) {
    console.error('Error creating note:', err);
    return res.status(500).json({ message: 'Error creating note' });
  }
});

/**
 * GET /api/notes/:id
 * Retrieve a specific note by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Ownership check (or admin)
    if (note.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: not authorized to view this note' });
    }

    return res.status(200).json(note);
  } catch (err) {
    console.error('Error retrieving note:', err);
    return res.status(500).json({ message: 'Error retrieving note' });
  }
});

/**
 * PUT /api/notes/:id
 * Update an existing note
 */
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Ownership check
    if (note.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: cannot update another user note' });
    }

    const { title, content } = req.body;
    const updated = await Note.findByIdAndUpdate(req.params.id, {
      title: title !== undefined ? title : note.title,
      content: content !== undefined ? content : note.content
    });

    // Emit event
    appEmitter.emit('note:updated', updated);

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating note:', err);
    return res.status(500).json({ message: 'Error updating note' });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete an existing note
 */
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Ownership check
    if (note.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: cannot delete another user note' });
    }

    await Note.findByIdAndDelete(req.params.id);

    // Emit event
    appEmitter.emit('note:deleted', req.params.id);

    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    return res.status(500).json({ message: 'Error deleting note' });
  }
});

module.exports = router;
