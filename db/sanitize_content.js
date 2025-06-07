require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT
});

const sanitizeContent = async () => {
  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Connected to the database.');

    console.log('Sanitizing content fields for source_id = 6...');

    const phrasesToSanitize = [
      'TwitterFacebook',
      'Share this:',
      'Comparte esto:',
      'Pataje sa:'
    ];

    const contentFields = [
      'raw_content',
      'title_es',
      'summary_es',
      'raw_content_es',
      'title_ht',
      'summary_ht',
      'raw_content_ht'
    ];

    let totalRecordsUpdated = 0;

    for (const phrase of phrasesToSanitize) {
      for (const field of contentFields) {
        const regex = phrase.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1'); // Escape special characters
        const updateQuery = `
          UPDATE articles
          SET ${field} = regexp_replace(${field}, $1, '', 'g')
          WHERE source_id = 6 AND ${field} LIKE $2
        `;
        const result = await client.query(updateQuery, [regex, `%${phrase}%`]);
        totalRecordsUpdated += result.rowCount;
        console.log(`  Updated ${result.rowCount} records for field '${field}' with phrase '${phrase}'.`);
      }
    }
    console.log(`Total records updated: ${totalRecordsUpdated}.`);

    client.release();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during database operation:', err);
  }
};

sanitizeContent();
