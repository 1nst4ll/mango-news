const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { registerUser, loginUser } = require('../user');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// User Registration
router.post('/register', authLimiter, async (req, res) => {
  const endpoint = '/api/register';
  const { username, password } = req.body;
  if (!username || !password) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing username or password`);
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const result = await registerUser(pool, username, password);
    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - User registered successfully: ${result.user.email}`);
      res.status(201).json({ message: 'User registered successfully.', user: { id: result.user.id, email: result.user.email } });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - User registration failed: ${result.message}`);
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during registration:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Login
router.post('/login', authLimiter, async (req, res) => {
  const endpoint = '/api/login';
  const { username, password, rememberMe } = req.body;
  if (!username || !password) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing username or password`);
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const result = await loginUser(pool, username, password);
    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - User logged in successfully: ${username}`);
      const isProd = process.env.NODE_ENV === 'production';
      const accessMaxAge  = 60 * 60 * 1000;
      const refreshMaxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

      res.cookie('jwt', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'strict',
        maxAge: accessMaxAge,
      });
      res.cookie('jwt_refresh', result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'strict',
        maxAge: refreshMaxAge,
        path: '/api/refresh',
      });
      return res.json({ message: 'Login successful.' });
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Login failed: ${result.message}`);
      res.status(401).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during login:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Logout
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'strict' };
  res.clearCookie('jwt', cookieOpts);
  res.clearCookie('jwt_refresh', { ...cookieOpts, path: '/api/refresh' });
  res.json({ message: 'Logged out successfully.' });
});

// Token Refresh
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies && req.cookies.jwt_refresh;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token.' });
  }
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }
  const jwt = require('jsonwebtoken');
  jwt.verify(refreshToken, refreshSecret, (err, payload) => {
    if (err || payload.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid refresh token.' });
    }
    const newAccessToken = jwt.sign(
      { userId: payload.userId, email: payload.email, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('jwt', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      maxAge: 60 * 60 * 1000,
    });
    res.json({ message: 'Token refreshed.' });
  });
});

// Session check
router.get('/me', authenticateToken, (req, res) => {
  res.json({ userId: req.user.userId, email: req.user.email });
});

module.exports = router;
