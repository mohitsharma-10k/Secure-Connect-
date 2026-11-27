/**
 * Role-Based Access Control (RBAC) middleware
 * Checks if the authenticated user has one of the required roles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    const userRole = req.user.role || 'user';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Access denied: insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
