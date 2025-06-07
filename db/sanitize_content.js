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

    const targetSourceId = 1; // Change target source ID to 1
    const linesToRemove = 13;

    console.log(`Removing first ${linesToRemove} lines from article content for source_id = ${targetSourceId}...`);

    const contentFields = [
      'raw_content',
      'raw_content_es',
      'raw_content_ht'
    ];

    let totalArticlesProcessed = 0;
    let totalArticlesUpdated = 0;

    // Fetch articles for the target source
    const articlesResult = await client.query(
      `SELECT id, raw_content, raw_content_es, raw_content_ht FROM articles WHERE source_id = $1`,
      [targetSourceId]
    );
    const articles = articlesResult.rows;

    console.log(`Found ${articles.length} articles for source ID ${targetSourceId}.`);

    for (const article of articles) {
      let updated = false;
      const updateValues = [];
      const updateFields = [];
      let paramIndex = 1;

      for (const field of contentFields) {
        if (article[field]) {
          const lines = article[field].split('\n');
          if (lines.length > linesToRemove) {
            const newContent = lines.slice(linesToRemove).join('\n');
            if (newContent !== article[field]) { // Only update if content actually changed
              updateFields.push(`${field} = $${paramIndex++}`);
              updateValues.push(newContent);
              updated = true;
            }
          }
        }
      }

      if (updated) {
        updateValues.push(article.id); // Add article ID for WHERE clause
        const updateQuery = `UPDATE articles SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
        await client.query(updateQuery, updateValues);
        totalArticlesUpdated++;
        console.log(`  Updated article ID: ${article.id}`);
      }
      totalArticlesProcessed++;
    }

    console.log(`Processed ${totalArticlesProcessed} articles. Updated ${totalArticlesUpdated} articles.`);

    client.release();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during database operation:', err);
  }
};

sanitizeContent();
