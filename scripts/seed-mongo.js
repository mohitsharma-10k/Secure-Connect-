require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_connect_platform';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  // Drop existing data to make it clean
  await db.collection('users').deleteMany({});
  await db.collection('notes').deleteMany({});

  const hashedPasswordVictor = await bcrypt.hash('123456', 10);
  const hashedPasswordAdmin = await bcrypt.hash('adminPassword123', 10);

  // Exact user matching Fig 1
  const victorId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const now1 = new Date();
  const now2 = new Date(Date.now() + 1000 * 60 * 3);

  await db.collection('users').insertMany([
    {
      _id: victorId,
      username: 'victor',
      email: 'victor@example.com',
      password: hashedPasswordVictor,
      role: 'user',
      createdAt: now1,
      updatedAt: now1
    },
    {
      _id: adminId,
      username: 'adminUser',
      email: 'admin@example.com',
      password: hashedPasswordAdmin,
      role: 'admin',
      createdAt: now1,
      updatedAt: now1
    }
  ]);

  // Exact notes matching Fig 2
  await db.collection('notes').insertMany([
    {
      _id: new mongoose.Types.ObjectId(),
      title: 'My First Note',
      content: 'This is my first note of web dev -III',
      owner: victorId.toString(),
      createdAt: now1,
      updatedAt: now1
    },
    {
      _id: new mongoose.Types.ObjectId(),
      title: 'My Second Note',
      content: 'This is my second note of web dev -III',
      owner: victorId.toString(),
      createdAt: now2,
      updatedAt: now2
    }
  ]);

  console.log('✅ MongoDB successfully populated with Lab 4 data:');
  console.log(' - Database: secure_connect_platform');
  console.log(' - Collection: users (victor, adminUser)');
  console.log(' - Collection: notes (My First Note, My Second Note)');

  await mongoose.disconnect();
}

seed().catch(console.error);
