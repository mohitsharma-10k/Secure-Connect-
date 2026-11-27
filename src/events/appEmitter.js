const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const appEmitter = new AppEventEmitter();

// Event listeners for audit and real-time event-driven features
appEmitter.on('user:registered', (data) => {
  console.log(`[EVENT] User registered: ${data.username} (${data.email}) [ID: ${data.id}]`);
});

appEmitter.on('user:login', (data) => {
  console.log(`[EVENT] User logged in: ${data.username} (${data.email})`);
});

appEmitter.on('note:created', (note) => {
  console.log(`[EVENT] Note created: "${note.title}" by owner: ${note.owner}`);
});

appEmitter.on('note:updated', (note) => {
  console.log(`[EVENT] Note updated: "${note.title}" [ID: ${note._id}]`);
});

appEmitter.on('note:deleted', (noteId) => {
  console.log(`[EVENT] Note deleted [ID: ${noteId}]`);
});

module.exports = appEmitter;
