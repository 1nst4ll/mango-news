require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT
});

const sanitizeAuthors = async () => {
  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Connected to the database.');

    console.log('Sanitizing author fields for source_id = 1...');
    const result = await client.query(
      "UPDATE articles SET author = REPLACE(author, '•', '') WHERE source_id = 1 AND author LIKE '%•%'"
    );
    console.log(`${result.rowCount} records updated.`);

    client.release();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during database operation:', err);
  }
};

sanitizeAuthors();
