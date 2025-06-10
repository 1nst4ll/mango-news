require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT || 5432 // Default PostgreSQL port
});

const getSundayEditions = async () => {
  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Connected to the database.');

    console.log('Fetching all entries from sunday_editions table...');
    const result = await client.query(
      "SELECT id, title, summary, narration_url, image_url, publication_date, created_at, updated_at FROM sunday_editions ORDER BY publication_date DESC"
    );
    
    if (result.rows.length > 0) {
      console.log('--- Sunday Editions ---');
      result.rows.forEach((edition, index) => {
        console.log(`\n--- Edition ${index + 1} ---`);
        console.log('ID:', edition.id);
        console.log('Title:', edition.title);
        console.log('Summary:', edition.summary);
        console.log('Narration URL:', edition.narration_url);
        console.log('Image URL:', edition.image_url);
        console.log('Publication Date:', edition.publication_date);
        console.log('Created At:', edition.created_at);
        console.log('Updated At:', edition.updated_at);
      });
      console.log('\n-----------------------');
    } else {
      console.log('No entries found in the sunday_editions table.');
    }

    client.release();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during database operation:', err);
  } finally {
    await pool.end(); // Close the pool when done
  }
};

getSundayEditions();
