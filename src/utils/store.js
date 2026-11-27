const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate 24-character hexadecimal ObjectId compatible with MongoDB
function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

const dataDir = path.join(__dirname, '../../data');
const dataFilePath = path.join(dataDir, 'db.json');

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFilePath)) {
    const initialData = { users: [], notes: [] };
    fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: [], notes: [] };
  }
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// User model operations
const UserStore = {
  async findOne(query) {
    const db = readData();
    return db.users.find((u) => {
      for (const key in query) {
        if (u[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  },

  async findById(id) {
    const db = readData();
    return db.users.find((u) => u._id === id || u.id === id) || null;
  },

  async create(userData) {
    const db = readData();
    const id = generateObjectId();
    const now = new Date().toISOString();
    const newUser = {
      _id: id,
      id: id,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user',
      createdAt: now,
      updatedAt: now
    };
    db.users.push(newUser);
    writeData(db);
    return newUser;
  },

  async find(query = {}) {
    const db = readData();
    return db.users.filter((u) => {
      for (const key in query) {
        if (u[key] !== query[key]) return false;
      }
      return true;
    });
  }
};

// Note model operations
const NoteStore = {
  async find(query = {}) {
    const db = readData();
    return db.notes.filter((n) => {
      for (const key in query) {
        if (n[key] !== query[key]) return false;
      }
      return true;
    });
  },

  async findById(id) {
    const db = readData();
    return db.notes.find((n) => n._id === id || n.id === id) || null;
  },

  async create(noteData) {
    const db = readData();
    const id = generateObjectId();
    const now = new Date().toISOString();
    const newNote = {
      _id: id,
      title: noteData.title,
      content: noteData.content,
      owner: noteData.owner,
      createdAt: now,
      updatedAt: now
    };
    db.notes.push(newNote);
    writeData(db);
    return newNote;
  },

  async findByIdAndUpdate(id, updateData) {
    const db = readData();
    const index = db.notes.findIndex((n) => n._id === id || n.id === id);
    if (index === -1) return null;

    const note = db.notes[index];
    if (updateData.title !== undefined) note.title = updateData.title;
    if (updateData.content !== undefined) note.content = updateData.content;
    note.updatedAt = new Date().toISOString();

    db.notes[index] = note;
    writeData(db);
    return note;
  },

  async findByIdAndDelete(id) {
    const db = readData();
    const index = db.notes.findIndex((n) => n._id === id || n.id === id);
    if (index === -1) return null;

    const deleted = db.notes.splice(index, 1)[0];
    writeData(db);
    return deleted;
  }
};

module.exports = {
  UserStore,
  NoteStore,
  generateObjectId
};
