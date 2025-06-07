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
      "SELECT raw_content, title_es, summary_es, title_ht, summary_ht, raw_content_es, raw_content_ht, source_id FROM articles WHERE id = $1",
      [articleId]
    );
    
    if (result.rows.length > 0) {
      const article = result.rows[0];
      console.log('Article Content (Original):');
      console.log(article.raw_content);
      console.log('\nArticle Title (Spanish):');
      console.log(article.title_es);
      console.log('\nArticle Summary (Spanish):');
      console.log(article.summary_es);
      console.log('\nArticle Content (Spanish):');
      console.log(article.raw_content_es);
      console.log('\nArticle Title (Haitian Creole):');
      console.log(article.title_ht);
      console.log('\nArticle Summary (Haitian Creole):');
      console.log(article.summary_ht);
      console.log('\nArticle Content (Haitian Creole):');
      console.log(article.raw_content_ht);
      console.log('\nSource ID:');
      console.log(article.source_id);
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
