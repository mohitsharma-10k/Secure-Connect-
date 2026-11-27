// Client script for Web Dev III Lab 4 Dashboard
let authToken = localStorage.getItem('jwt_token') || '';
let currentUser = JSON.parse(localStorage.getItem('user_info') || 'null');
let socket = null;
let currentRoom = 'general';

function log(message, type = 'info') {
  const container = document.getElementById('consoleLogs');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${message}`;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

function updateAuthUI() {
  const tokenDisplay = document.getElementById('tokenDisplay');
  const currentUserLabel = document.getElementById('currentUserLabel');
  const logoutBtn = document.getElementById('logoutBtn');
  const indicator = document.querySelector('.status-indicator');

  tokenDisplay.value = authToken;

  if (authToken && currentUser) {
    currentUserLabel.textContent = `${currentUser.username} (${currentUser.role || 'user'})`;
    indicator.classList.add('online');
    logoutBtn.classList.remove('hidden');
  } else {
    currentUserLabel.textContent = 'Not authenticated';
    indicator.classList.remove('online');
    logoutBtn.classList.add('hidden');
  }
}

// Tab Switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Clear active token
document.getElementById('clearTokenBtn').addEventListener('click', () => {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info');
  updateAuthUI();
  log('JWT Token cleared. Subsequent requests will test unauthorized/403 scenarios.', 'info');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info');
  updateAuthUI();
  document.getElementById('notesList').innerHTML = '<div class="empty-state">Logged out.</div>';
  document.getElementById('notesCount').textContent = '0';
  log('User logged out.', 'info');
});

// Signup handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;

  try {
    log(`POST /api/auth/signup for "${username}"...`, 'info');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });
    const data = await res.json();

    if (res.status === 201) {
      log(`Signup success (201 Created): ${JSON.stringify(data)}`, 'success');
      alert(`User registered successfully! You can now log in with ${email}`);
      // switch to login tab
      document.querySelector('[data-tab="loginTab"]').click();
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = password;
    } else {
      log(`Signup failed (${res.status}): ${data.message || JSON.stringify(data)}`, 'error');
      alert(`Signup error: ${data.message}`);
    }
  } catch (err) {
    log(`Signup request error: ${err.message}`, 'error');
  }
});

// Login handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    log(`POST /api/auth/login for "${email}"...`, 'info');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.status === 200 && data.token) {
      authToken = data.token;
      // Decode JWT payload
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        currentUser = payload;
        localStorage.setItem('user_info', JSON.stringify(payload));
        document.getElementById('chatUser').value = payload.username || 'User';
      } catch (err) {
        currentUser = { email };
      }
      localStorage.setItem('jwt_token', authToken);
      updateAuthUI();
      log(`Login success (200 OK). JWT Token received: ${data.token.substring(0, 32)}...`, 'success');
      fetchNotes();
    } else {
      log(`Login failed (${res.status}): ${data.message || JSON.stringify(data)}`, 'error');
      alert(`Login failed: ${data.message}`);
    }
  } catch (err) {
    log(`Login request error: ${err.message}`, 'error');
  }
});

// Fetch Notes
async function fetchNotes(overrideToken = null) {
  const tokenToUse = overrideToken !== null ? overrideToken : authToken;
  const headers = {};
  if (tokenToUse) {
    headers['Authorization'] = `Bearer ${tokenToUse}`;
  }

  log(`GET /api/notes (Token: ${tokenToUse ? 'Provided' : 'None'})...`, 'info');
  try {
    const res = await fetch('/api/notes', { headers });
    const data = await res.json();

    if (res.status === 200) {
      renderNotes(data);
      log(`GET /api/notes (200 OK): Loaded ${data.length} notes.`, 'success');
    } else {
      log(`GET /api/notes response (${res.status}): ${JSON.stringify(data)}`, res.status === 403 ? 'error' : 'info');
      document.getElementById('notesList').innerHTML = `<div class="empty-state error">Response ${res.status}: ${data.message || 'Access blocked'}</div>`;
      document.getElementById('notesCount').textContent = '0';
    }
  } catch (err) {
    log(`Notes fetch error: ${err.message}`, 'error');
  }
}

function renderNotes(notes) {
  const container = document.getElementById('notesList');
  const countEl = document.getElementById('notesCount');
  countEl.textContent = notes.length;

  if (!notes || notes.length === 0) {
    container.innerHTML = '<div class="empty-state">No notes found for this user. Create one above!</div>';
    return;
  }

  container.innerHTML = notes
    .map(
      (note) => `
    <div class="note-item" data-id="${note._id}">
      <div class="note-item-header">
        <span class="note-item-title">${escapeHtml(note.title)}</span>
        <span class="note-item-date">${new Date(note.createdAt).toLocaleDateString()}</span>
      </div>
      <div class="note-item-content">${escapeHtml(note.content)}</div>
      <div class="note-item-meta">
        <span>Owner: ${escapeHtml(note.owner)}</span>
        <div class="note-actions">
          <button class="btn btn-sm btn-outline" onclick="editNote('${note._id}', '${escapeAttr(note.title)}', '${escapeAttr(note.content)}')">Edit</button>
          <button class="btn btn-sm btn-danger-outline" onclick="deleteNote('${note._id}')">Delete</button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

// Create Note
document.getElementById('createNoteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('noteTitle').value;
  const content = document.getElementById('noteContent').value;

  if (!authToken) {
    alert('Please log in first to obtain a JWT token.');
    return;
  }

  try {
    log(`POST /api/notes ("${title}")...`, 'info');
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();

    if (res.status === 201) {
      log(`POST /api/notes (201 Created): ${JSON.stringify(data)}`, 'success');
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteContent').value = '';
      fetchNotes();
    } else {
      log(`Note creation failed (${res.status}): ${JSON.stringify(data)}`, 'error');
      alert(`Error creating note: ${data.message}`);
    }
  } catch (err) {
    log(`Note creation error: ${err.message}`, 'error');
  }
});

// Update Note
window.editNote = async function (id, currentTitle, currentContent) {
  const newTitle = prompt('Update Note Title:', currentTitle);
  if (newTitle === null) return;
  const newContent = prompt('Update Note Content:', currentContent);
  if (newContent === null) return;

  try {
    log(`PUT /api/notes/${id}...`, 'info');
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });
    const data = await res.json();
    if (res.status === 200) {
      log(`PUT /api/notes/${id} (200 OK)`, 'success');
      fetchNotes();
    } else {
      log(`PUT /api/notes/${id} failed (${res.status}): ${data.message}`, 'error');
    }
  } catch (err) {
    log(`Update note error: ${err.message}`, 'error');
  }
};

// Delete Note
window.deleteNote = async function (id) {
  if (!confirm('Are you sure you want to delete this note?')) return;
  try {
    log(`DELETE /api/notes/${id}...`, 'info');
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    const data = await res.json();
    if (res.status === 200) {
      log(`DELETE /api/notes/${id} (200 OK)`, 'success');
      fetchNotes();
    } else {
      log(`DELETE /api/notes/${id} failed (${res.status}): ${data.message}`, 'error');
    }
  } catch (err) {
    log(`Delete note error: ${err.message}`, 'error');
  }
};

// Refresh Notes button
document.getElementById('fetchNotesBtn').addEventListener('click', () => fetchNotes());

// Test 403 Forbidden without token
document.getElementById('testNoTokenBtn').addEventListener('click', () => {
  log('Testing protected route without token (verifying 403 Forbidden response)...', 'event');
  fetchNotes('');
});

// Socket.IO Chat Setup
function initSocket() {
  if (typeof io === 'undefined') {
    log('Socket.io library not loaded yet.', 'error');
    return;
  }

  socket = io();

  socket.on('connect', () => {
    log(`[Socket.IO] Connected with id: ${socket.id}`, 'success');
    joinCurrentRoom();
  });

  socket.on('chatMessage', (data) => {
    appendChatMessage(data);
  });

  socket.on('systemMessage', (data) => {
    appendSystemMessage(data.text);
  });

  socket.on('disconnect', () => {
    log('[Socket.IO] Disconnected from server', 'error');
  });
}

function joinCurrentRoom() {
  if (!socket) return;
  const room = document.getElementById('chatRoom').value.trim() || 'general';
  const username = document.getElementById('chatUser').value.trim() || 'Anonymous';
  currentRoom = room;

  socket.emit('joinRoom', { room, username });
  log(`[Socket.IO] Joined room: ${room} as ${username}`, 'info');
  appendSystemMessage(`You joined room [${room}]`);
}

document.getElementById('joinRoomBtn').addEventListener('click', joinCurrentRoom);

document.getElementById('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || !socket) return;

  const username = document.getElementById('chatUser').value.trim() || 'Anonymous';
  const room = currentRoom;

  socket.emit('chatMessage', { room, username, message });
  input.value = '';
});

function appendChatMessage(data) {
  const container = document.getElementById('chatMessages');
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg';
  const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  msgEl.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-author">[${escapeHtml(data.room || 'general')}] ${escapeHtml(data.username)}</span>
      <span>${time}</span>
    </div>
    <div class="chat-msg-body">${escapeHtml(data.message)}</div>
  `;
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function appendSystemMessage(text) {
  const container = document.getElementById('chatMessages');
  const sysEl = document.createElement('div');
  sysEl.className = 'system-msg';
  sysEl.textContent = text;
  container.appendChild(sysEl);
  container.scrollTop = container.scrollHeight;
}

document.getElementById('clearLogsBtn').addEventListener('click', () => {
  document.getElementById('consoleLogs').innerHTML = '';
});

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Initial Boot
updateAuthUI();
initSocket();
if (authToken) {
  fetchNotes();
}
