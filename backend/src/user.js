const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const saltRounds = 10; // For bcrypt password hashing

// Register a new user
async function registerUser(pool, username, password) {
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', // Corrected column names
      [username, hashedPassword]
    );
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Error registering user:', error);
    // Check for unique constraint violation (email already exists)
    if (error.code === '23505') {
      return { success: false, message: 'Email already exists.' }; // Changed message to reflect email
    }
    return { success: false, message: 'Failed to register user.' };
  }
}

// Login a user
async function loginUser(pool, username, password) {
  try {
    // Corrected column name from username to email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return { success: false, message: 'Invalid email or password.' }; // Changed message to reflect email
    }

    // Corrected column name from password_hash to password_hash (already correct)
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, message: 'Invalid email or password.' }; // Changed message to reflect email
    }

    // Generate JWT token (replace 'your_jwt_secret' with a strong, secret key)
    // Corrected username in token payload to email
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
