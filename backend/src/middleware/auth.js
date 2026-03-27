const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Priority 1: HttpOnly cookie (browser requests after login)
  let token = req.cookies && req.cookies.jwt;

  // Priority 2: Authorization header (API clients, backward compat)
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  // Priority 3: Query parameter (SSE streams — EventSource cannot set headers)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    console.warn(`[WARN] ${new Date().toISOString()} - Authentication failed: No token provided for ${req.method} ${req.url}`);
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.warn(`[WARN] ${new Date().toISOString()} - Authentication failed: Invalid token for ${req.method} ${req.url}`, err.message);
      return res.status(403).json({ error: 'Forbidden: Invalid token.' });
    }
    req.user = user;
    console.log(`[INFO] ${new Date().toISOString()} - Authentication successful for user ID: ${user.userId}, email: ${user.email}`);
    next();
  });
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    console.warn(`[WARN] ${new Date().toISOString()} - RBAC denied: user ${req.user?.userId} role=${req.user?.role}, required=${roles.join('|')}`);
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
  }
  next();
};

module.exports = { authenticateToken, requireRole };
