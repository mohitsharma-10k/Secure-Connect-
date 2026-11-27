const appEvents = require('./appEvents');

const stats = { signups: 0, logins: 0, notesCreated: 0, chatMessages: 0 };

function registerListeners() {
  appEvents.on('user:registered', (user) => {
    stats.signups++;
    console.log(`[event] user:registered -> ${user.username} (${user.email})`);
  });

  appEvents.on('user:loggedIn', (user) => {
    stats.logins++;
    console.log(`[event] user:loggedIn -> ${user.username}`);
  });

  appEvents.on('note:created', (note) => {
    stats.notesCreated++;
    console.log(`[event] note:created -> "${note.title}" by ${note.owner}`);
  });

  appEvents.on('note:deleted', (note) => {
    console.log(`[event] note:deleted -> "${note.title}"`);
  });

  appEvents.on('chat:message', () => {
    stats.chatMessages++;
  });
}

module.exports = { registerListeners, stats };
