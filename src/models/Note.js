const mongoose = require('mongoose');
const { NoteStore } = require('../utils/store');
const { getIsMongoConnected } = require('../config/db');

// Mongoose schema definition
const NoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    owner: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const MongoNoteModel = mongoose.models.Note || mongoose.model('Note', NoteSchema);

// Hybrid model wrapper
const Note = {
  async find(query = {}) {
    if (getIsMongoConnected()) {
      return await MongoNoteModel.find(query).sort({ createdAt: 1 });
    }
    return await NoteStore.find(query);
  },

  async findById(id) {
    if (getIsMongoConnected()) {
      return await MongoNoteModel.findById(id);
    }
    return await NoteStore.findById(id);
  },

  async create(data) {
    if (getIsMongoConnected()) {
      const created = await MongoNoteModel.create(data);
      return {
        _id: created._id.toString(),
        title: created.title,
        content: created.content,
        owner: created.owner,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
      };
    }
    return await NoteStore.create(data);
  },

  async findByIdAndUpdate(id, data) {
    if (getIsMongoConnected()) {
      const updated = await MongoNoteModel.findByIdAndUpdate(id, data, { new: true });
      if (!updated) return null;
      return {
        _id: updated._id.toString(),
        title: updated.title,
        content: updated.content,
        owner: updated.owner,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      };
    }
    return await NoteStore.findByIdAndUpdate(id, data);
  },

  async findByIdAndDelete(id) {
    if (getIsMongoConnected()) {
      return await MongoNoteModel.findByIdAndDelete(id);
    }
    return await NoteStore.findByIdAndDelete(id);
  }
};

module.exports = Note;
