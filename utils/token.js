const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function verifyToken(token) {
  // Pin the algorithm so tokens signed with "none" or another alg are rejected
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
