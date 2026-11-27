const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  let token = null;

  // Extract from Authorization header (Bearer <token> or raw <token>)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader) {
    if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  }

  // Also check x-access-token header or cookie if present
  if (!token && req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  // Check Cookie header if present (e.g., token=... or jwt=...)
  if (!token && req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === 'token' || key === 'jwt') {
        token = value;
        break;
      }
    }
  }

  // If no token is provided: 403 Forbidden matching Lab 4 Screenshot Fig 1 & Fig 2
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_webdev3_lab4_secure';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = {
  verifyToken
};
