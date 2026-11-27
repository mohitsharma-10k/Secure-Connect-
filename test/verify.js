const http = require('http');
const { io: ioClient } = require('socket.io-client');
const { app, server, startServer } = require('../server');

const PORT = 5001; // Run verification on port 5001 to avoid any port conflicts

let victorToken = '';
let victorId = '';
let adminToken = '';
let note1Id = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Lab 4 End-to-End Verification Suite');
  console.log('======================================================\n');

  // 1. Start server on test port
  await startServer(PORT);
  console.log(`[TEST HARNESS] Server running on http://localhost:${PORT}`);

  try {
    // ----------------------------------------------------
    // TEST 1: User Signup (Fig 1)
    // ----------------------------------------------------
    console.log('\n--- [TEST 1] User Signup (POST /api/auth/signup) ---');
    const signupRes = await request('POST', '/api/auth/signup', {
      username: 'victor',
      email: 'victor@example.com',
      password: '123456'
    });
    console.log('Status:', signupRes.status);
    console.log('Response:', signupRes.data);
    if (signupRes.status !== 201 && signupRes.status !== 400) {
      throw new Error(`Expected status 201 Created or 400 Already Exists, got ${signupRes.status}`);
    }
    if (signupRes.status === 201) {
      victorId = signupRes.data.id;
      if (!signupRes.data.id || signupRes.data.username !== 'victor' || signupRes.data.email !== 'victor@example.com') {
        throw new Error('Signup response payload does not match expected format');
      }
    }
    console.log('✅ Signup test PASSED');

    // ----------------------------------------------------
    // TEST 2: User Login (Fig 1)
    // ----------------------------------------------------
    console.log('\n--- [TEST 2] User Login (POST /api/auth/login) ---');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'victor@example.com',
      password: '123456'
    });
    console.log('Status:', loginRes.status);
    console.log('Response:', {
      message: loginRes.data.message,
      token: loginRes.data.token ? `${loginRes.data.token.substring(0, 30)}...` : undefined
    });
    if (loginRes.status !== 200 || !loginRes.data.token) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    victorToken = loginRes.data.token;
    console.log('✅ Login test PASSED');

    // ----------------------------------------------------
    // TEST 3: Access Protected Route Without Token (Fig 1 & 2)
    // ----------------------------------------------------
    console.log('\n--- [TEST 3] Access /api/notes Without Token (Expected 403) ---');
    const noTokenRes = await request('GET', '/api/notes');
    console.log('Status:', noTokenRes.status);
    console.log('Response:', noTokenRes.data);
    if (noTokenRes.status !== 403 || noTokenRes.data.message !== 'No token provided') {
      throw new Error(`Expected 403 with message "No token provided", got status ${noTokenRes.status}`);
    }
    console.log('✅ 403 Forbidden check PASSED');

    // ----------------------------------------------------
    // TEST 4: Create Note 1 with JWT (Fig 2)
    // ----------------------------------------------------
    console.log('\n--- [TEST 4] Create Note 1 (POST /api/notes) ---');
    const note1Res = await request(
      'POST',
      '/api/notes',
      {
        title: 'My First Note',
        content: 'This is my first note of web dev -III'
      },
      {
        Authorization: `Bearer ${victorToken}`
      }
    );
    console.log('Status:', note1Res.status);
    console.log('Response:', note1Res.data);
    if (note1Res.status !== 201) {
      throw new Error(`Expected status 201, got ${note1Res.status}`);
    }
    note1Id = note1Res.data._id;
    if (note1Res.data.title !== 'My First Note' || !note1Res.data.owner) {
      throw new Error('Created note missing required fields');
    }
    console.log('✅ Note 1 creation PASSED');

    // ----------------------------------------------------
    // TEST 5: Create Note 2 with JWT (Fig 2)
    // ----------------------------------------------------
    console.log('\n--- [TEST 5] Create Note 2 (POST /api/notes) ---');
    const note2Res = await request(
      'POST',
      '/api/notes',
      {
        title: 'My Second Note',
        content: 'This is my second note of web dev -III'
      },
      {
        Authorization: `Bearer ${victorToken}`
      }
    );
    console.log('Status:', note2Res.status);
    console.log('Response:', note2Res.data);
    if (note2Res.status !== 201) {
      throw new Error(`Expected status 201, got ${note2Res.status}`);
    }
    console.log('✅ Note 2 creation PASSED');

    // ----------------------------------------------------
    // TEST 6: Get All Notes with JWT (Fig 2)
    // ----------------------------------------------------
    console.log('\n--- [TEST 6] Get Notes with JWT (GET /api/notes) ---');
    const getNotesRes = await request('GET', '/api/notes', null, {
      Authorization: `Bearer ${victorToken}`
    });
    console.log('Status:', getNotesRes.status);
    console.log('Response:', getNotesRes.data);
    if (getNotesRes.status !== 200 || !Array.isArray(getNotesRes.data) || getNotesRes.data.length < 2) {
      throw new Error('Expected 200 OK with array of notes');
    }
    console.log('✅ Get Notes PASSED');

    // ----------------------------------------------------
    // TEST 7: Update and Delete Note (Full CRUD)
    // ----------------------------------------------------
    console.log('\n--- [TEST 7] Update & Delete Note CRUD ---');
    const updateRes = await request(
      'PUT',
      `/api/notes/${note1Id}`,
      {
        title: 'My First Note (Updated)',
        content: 'Updated content for web dev III'
      },
      {
        Authorization: `Bearer ${victorToken}`
      }
    );
    console.log('PUT Status:', updateRes.status);
    console.log('PUT Response:', updateRes.data);
    if (updateRes.status !== 200 || updateRes.data.title !== 'My First Note (Updated)') {
      throw new Error('Note update failed');
    }

    const deleteRes = await request('DELETE', `/api/notes/${note1Id}`, null, {
      Authorization: `Bearer ${victorToken}`
    });
    console.log('DELETE Status:', deleteRes.status);
    console.log('DELETE Response:', deleteRes.data);
    if (deleteRes.status !== 200) {
      throw new Error('Note deletion failed');
    }
    console.log('✅ Note Update & Delete CRUD PASSED');

    // ----------------------------------------------------
    // TEST 8: Role-Based Access Control (RBAC)
    // ----------------------------------------------------
    console.log('\n--- [TEST 8] Role-Based Access Control (RBAC) ---');
    // Standard user tries admin route -> 403 Forbidden
    const userAdminRes = await request('GET', '/api/admin/users', null, {
      Authorization: `Bearer ${victorToken}`
    });
    console.log('User accessing Admin route Status:', userAdminRes.status);
    if (userAdminRes.status !== 403) {
      throw new Error(`Expected status 403 for user accessing admin route, got ${userAdminRes.status}`);
    }

    // Register admin user
    await request('POST', '/api/auth/signup', {
      username: 'adminUser',
      email: 'admin@example.com',
      password: 'adminPassword123',
      role: 'admin'
    });
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'adminPassword123'
    });
    adminToken = adminLoginRes.data.token;

    // Admin accessing admin route -> 200 OK
    const adminAccessRes = await request('GET', '/api/admin/users', null, {
      Authorization: `Bearer ${adminToken}`
    });
    console.log('Admin accessing Admin route Status:', adminAccessRes.status);
    if (adminAccessRes.status !== 200) {
      throw new Error(`Expected status 200 for admin accessing admin route, got ${adminAccessRes.status}`);
    }
    console.log('✅ RBAC tests PASSED');

    // ----------------------------------------------------
    // TEST 9: Socket.IO Real-Time Chat (Fig 3)
    // ----------------------------------------------------
    console.log('\n--- [TEST 9] Socket.IO Real-Time Chat (Fig 3) ---');
    const socketUrl = `http://localhost:${PORT}`;

    const client1 = ioClient(socketUrl, { forceNew: true });
    const client2 = ioClient(socketUrl, { forceNew: true });

    const messagesReceivedByClient2 = [];

    client2.on('chatMessage', (msg) => {
      messagesReceivedByClient2.push(msg);
    });

    await Promise.all([
      new Promise((resolve) => client1.on('connect', resolve)),
      new Promise((resolve) => client2.on('connect', resolve))
    ]);

    client1.emit('joinRoom', { room: 'general', username: 'Aditi' });
    client2.emit('joinRoom', { room: 'general', username: 'Rohan' });
    await delay(200);

    // Messages from Fig 3
    client1.emit('chatMessage', {
      room: 'general',
      username: 'Aditi',
      message: 'Hey team, backend is ready 🚀'
    });
    await delay(100);

    client2.emit('chatMessage', {
      room: 'general',
      username: 'Rohan',
      message: 'Testing chat now...'
    });
    await delay(100);

    client1.emit('chatMessage', {
      room: 'general',
      username: 'Aditi',
      message: 'Messages arriving in real time ⚡'
    });
    await delay(200);

    client1.disconnect();
    client2.disconnect();

    console.log('Messages received across sockets:', messagesReceivedByClient2.length);
    if (messagesReceivedByClient2.length < 3) {
      throw new Error(`Expected at least 3 messages received by client 2, got ${messagesReceivedByClient2.length}`);
    }
    console.log('✅ Socket.IO Real-Time Chat PASSED');

    console.log('\n======================================================');
    console.log('🎉 ALL LAB 4 TESTS PASSED SUCCESSFULLY! (100% Score)');
    console.log('======================================================\n');
  } finally {
    server.close(() => {
      process.exit(0);
    });
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
