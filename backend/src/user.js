const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('./index'); // Import the pool object

const saltRounds = 10; // For bcrypt password hashing

// Register a new user
async function registerUser(username, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Error registering user:', error);
    // Check for unique constraint violation (username already exists)
    if (error.code === '23505') {
      return { success: false, message: 'Username already exists.' };
    }
    return { success: false, message: 'Failed to register user.' };
  }
}

// Login a user
async function loginUser(username, password) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return { success: false, message: 'Invalid username or password.' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, message: 'Invalid username or password.' };
    }

    // Generate JWT token (replace 'your_jwt_secret' with a strong, secret key)
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return { success: true, token };
  } catch (error) {
    console.error('Error logging in user:', error);
    return { success: false, message: 'Failed to login user.' };
  }
}

module.exports = {
  registerUser,
  loginUser,
};
