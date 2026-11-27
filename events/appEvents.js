const { EventEmitter } = require('events');

// Single shared emitter used across routes and sockets
module.exports = new EventEmitter();
