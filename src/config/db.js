const mongoose = require('mongoose');

let isMongoConnected = false;

async function connectDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_connect_platform';
  try {
    // Attempt connection with 2.5s timeout so startup is quick even if Mongo is not running
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2500
    });
    isMongoConnected = true;
    console.log('[database] Connected to MongoDB');
  } catch (err) {
    isMongoConnected = false;
    console.log('[database] MongoDB not detected; using persistent local storage (MongoDB ObjectId compatible)');
  }
}

function getIsMongoConnected() {
  return isMongoConnected;
}

module.exports = {
  connectDB,
  getIsMongoConnected
};
