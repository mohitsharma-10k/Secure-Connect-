const { parseCookies } = require('../utils/cookies');
const { verifyToken } = require('../utils/token');

// Token may arrive as "Authorization: Bearer <jwt>" or as a "token" cookie
function extractToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return parseCookies(req.headers.cookie).token || null;
}

function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(403).json({ message: 'No token provided' });

  try {
    const { id, username, role } = verifyToken(token);
    req.user = { id, username, role };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// RBAC: authorize('admin') or authorize('admin', 'moderator')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
