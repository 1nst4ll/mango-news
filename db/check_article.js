require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT
});

const checkArticle = async (articleId) => {
  try {
    console.log('Connecting to the database...');
    const client = await pool.connect();
    console.log('Connected to the database.');

    console.log(`Fetching content for article_id = ${articleId}...`);
    const result = await client.query(
      "SELECT id, title, source_url, thumbnail_url, publication_date, author, summary, raw_content, title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht, source_id, created_at, updated_at FROM articles WHERE id = $1",
      [articleId]
    );
    
    if (result.rows.length > 0) {
      const article = result.rows[0];
      console.log('--- Article Details ---');
      console.log('ID:', article.id);
      console.log('Title:', article.title);
      console.log('Source URL:', article.source_url);
      console.log('Thumbnail URL:', article.thumbnail_url);
      console.log('Publication Date:', article.publication_date);
      console.log('Author:', article.author);
      console.log('Summary:', article.summary);
      console.log('Raw Content (Original):', article.raw_content);
      console.log('Title (Spanish):', article.title_es);
      console.log('Summary (Spanish):', article.summary_es);
      console.log('Raw Content (Spanish):', article.raw_content_es);
      console.log('Title (Haitian Creole):', article.title_ht);
      console.log('Summary (Haitian Creole):', article.summary_ht);
      console.log('Raw Content (Haitian Creole):', article.raw_content_ht);
      console.log('Source ID:', article.source_id);
      console.log('Created At:', article.created_at);
      console.log('Updated At:', article.updated_at);
      console.log('-----------------------');
    } else {
      console.log(`Article with id ${articleId} not found.`);
    }

    client.release();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error during database operation:', err);
  }
};

const articleId = process.argv[2];
if (!articleId) {
  console.error('Please provide an article ID.');
  process.exit(1);
}

checkArticle(articleId);
