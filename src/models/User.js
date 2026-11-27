const mongoose = require('mongoose');
const { UserStore } = require('../utils/store');
const { getIsMongoConnected } = require('../config/db');

// Mongoose schema definition
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  {
    timestamps: true
  }
);

const MongoUserModel = mongoose.models.User || mongoose.model('User', UserSchema);

// Hybrid model wrapper
const User = {
  async findOne(query) {
    if (getIsMongoConnected()) {
      return await MongoUserModel.findOne(query);
    }
    return await UserStore.findOne(query);
  },

  async findById(id) {
    if (getIsMongoConnected()) {
      return await MongoUserModel.findById(id);
    }
    return await UserStore.findById(id);
  },

  async create(data) {
    if (getIsMongoConnected()) {
      const created = await MongoUserModel.create(data);
      return {
        _id: created._id.toString(),
        id: created._id.toString(),
        username: created.username,
        email: created.email,
        role: created.role,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
      };
    }
    return await UserStore.create(data);
  },

  async find(query = {}) {
    if (getIsMongoConnected()) {
      return await MongoUserModel.find(query).select('-password');
    }
    const users = await UserStore.find(query);
    return users.map(({ password, ...u }) => u);
  }
};

module.exports = User;
