const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Message', messageSchema);
