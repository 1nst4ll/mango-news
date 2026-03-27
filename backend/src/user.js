const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const saltRounds = 10; // For bcrypt password hashing

const registrationSchema = z.object({
  username: z.string().email('Invalid email format.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

// Register a new user
async function registerUser(pool, username, password) {
  const validation = registrationSchema.safeParse({ username, password });
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [username, hashedPassword]
    );
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.code === '23505') {
      return { success: false, message: 'Email already exists.' };
    }
    return { success: false, message: 'Failed to register user.' };
  }
}

// Login a user
async function loginUser(pool, username, password) {
  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '_refresh';
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      refreshSecret,
      { expiresIn: '30d' }
    );

    return { success: true, token, refreshToken };
  } catch (error) {
    console.error('Error logging in user:', error);
    return { success: false, message: 'Failed to login user.' };
  }
}

module.exports = {
  registerUser,
  loginUser,
};
