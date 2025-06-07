const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer TOKEN"

  if (!token && req.query.token) {
    token = req.query.token; // Fallback to query parameter for SSE
  }

  if (token == null) {
    // If no token, return 401 Unauthorized
    console.warn(`[WARN] ${new Date().toISOString()} - Authentication failed: No token provided for ${req.method} ${req.url}`);
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // If token is invalid, return 403 Forbidden
      console.warn(`[WARN] ${new Date().toISOString()} - Authentication failed: Invalid token for ${req.method} ${req.url}`, err.message);
      return res.sendStatus(403);
    }
    // If token is valid, attach user information to the request and proceed
    req.user = user;
    console.log(`[INFO] ${new Date().toISOString()} - Authentication successful for user ID: ${user.userId}, username: ${user.username}`);
    next();
  });
};

module.exports = authenticateToken;
