const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg'); // Import Pool from pg
const { scheduleScraper } = require('./scraper');
const { discoverArticleUrls, scrapeArticle } = require('./opensourceScraper'); // Import opensourceScraper functions
const { scrapeUrl: firecrawlScrapeUrl } = require('@mendable/firecrawl-js'); // Assuming firecrawl-js is used for Firecrawl scraping
const { runScraper, runScraperForSource } = require('./scraper'); // Import scraper functions

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Database Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected successfully');
    // Removed redundant client.release()
  }
  done(); // This also releases the client
});


// API Endpoints

// Get all sources
app.get('/api/sources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sources ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sources:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new source
app.post('/api/sources', async (req, res) => {
  const { name, url, is_active, enable_ai_summary, include_selectors, exclude_selectors, scraping_method } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Source name and URL are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO sources (name, url, is_active, enable_ai_summary, include_selectors, exclude_selectors, scraping_method) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, url, is_active !== undefined ? is_active : true, enable_ai_summary !== undefined ? enable_ai_summary : true, include_selectors || null, exclude_selectors || null, scraping_method || 'opensource']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding source:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a source
app.put('/api/sources/:id', async (req, res) => {
  const sourceId = req.params.id;
  const updates = req.body;
  const fields = Object.keys(updates).map((field, index) => `"${field}" = $${index + 2}`).join(', ');
  const values = Object.values(updates);

  if (!fields) {
    return res.status(400).json({ error: 'No update fields provided.' });
  }

  try {
    const result = await pool.query(
      `UPDATE sources SET ${fields} WHERE id = $1 RETURNING *`,
      [sourceId, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating source:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a source
app.delete('/api/sources/:id', async (req, res) => {
  const sourceId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM sources WHERE id = $1 RETURNING *', [sourceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found.' });
    }

    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error('Error deleting source:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get topics based on applied filters
app.get('/api/topics', async (req, res) => {
  const { searchTerm, startDate, endDate, sources } = req.query;
  let query = `
    SELECT DISTINCT t.id, t.name
    FROM topics t
    JOIN article_topics at ON t.id = at.topic_id
    JOIN articles a ON at.article_id = a.id
    LEFT JOIN sources s ON a.source_id = s.id
  `;
  const values = [];
  const conditions = [];
  let valueIndex = 1;

  if (startDate) {
    conditions.push(`a.publication_date >= $${valueIndex++}`);
    values.push(new Date(startDate));
  }

  if (endDate) {
    conditions.push(`a.publication_date <= $${valueIndex++}`);
    values.push(new Date(endDate));
  }

  if (searchTerm) {
    conditions.push(`(a.title ILIKE $${valueIndex} OR a.raw_content ILIKE $${valueIndex})`);
    values.push(`%${searchTerm}%`);
    valueIndex++;
  }

  if (sources) {
    const sourceNames = sources.split(',');
    conditions.push(`s.name = ANY($${valueIndex++})`);
    values.push(sourceNames);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY t.name ASC';

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching filtered topics:', err);
     // If tables don't exist yet, return an empty array as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn('Topics, article_topics, or articles table not found, returning empty array. Ensure database schema is applied.');
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Get all articles
app.get('/api/articles', async (req, res) => {
  const { topic, startDate, endDate, searchTerm, sources } = req.query;
  let query = `
    SELECT
        a.*,
        ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS topics -- Use ARRAY_REMOVE to handle articles without topics
    FROM
        articles a
    LEFT JOIN
        article_topics at ON a.id = at.article_id
    LEFT JOIN
        topics t ON at.topic_id = t.id
    LEFT JOIN
        sources s ON a.source_id = s.id
  `;
  const values = [];
  const conditions = [];
  let valueIndex = 1;

  // Handle comma-separated topics (case-insensitive)
  if (topic) {
    const topicNames = topic.split(',').map(name => name.toLowerCase()); // Convert to lowercase for case-insensitive comparison
    conditions.push(`EXISTS (
      SELECT 1
      FROM article_topics at_filter
      JOIN topics t_filter ON at_filter.topic_id = t_filter.id
      WHERE at_filter.article_id = a.id AND LOWER(t_filter.name) = ANY($${valueIndex++})
    )`);
    values.push(topicNames);
  }

  if (startDate) {
    conditions.push(`a.publication_date >= $${valueIndex++}`);
    values.push(new Date(startDate));
  }

  if (endDate) {
    conditions.push(`a.publication_date <= $${valueIndex++}`);
    values.push(new Date(endDate));
  }

  if (searchTerm) {
    conditions.push(`(a.title ILIKE $${valueIndex} OR a.raw_content ILIKE $${valueIndex})`);
    values.push(`%${searchTerm}%`);
    valueIndex++;
  }

  // Handle comma-separated sources (case-insensitive)
  if (sources) {
    const sourceNames = sources.split(',').map(name => name.toLowerCase()); // Convert to lowercase for case-insensitive comparison
    conditions.push(`LOWER(s.name) = ANY($${valueIndex++})`);
    values.push(sourceNames);
  }


  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // The GROUP BY is needed to aggregate topics for each article.
  query += ' GROUP BY a.id ORDER BY a.publication_date DESC';

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles:', err);
     // If the articles table doesn't exist yet, return an empty array as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn('Articles table not found, returning empty array. Ensure database schema is applied.'); // Added note about applying schema
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Get a single article by ID
app.get('/api/articles/:id', async (req, res) => {
  const articleId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM articles WHERE id = $1', [articleId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching article by ID:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Trigger scraper for a specific source
app.post('/api/scrape/run/:id', async (req, res) => {
  const sourceId = req.params.id;
   try {
    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1', [sourceId]);
    const source = sourceResult.rows[0];

    if (!source) {
      return res.status(404).json({ error: 'Source not found.' });
    }

    console.log(`Triggering scrape for source: ${source.name}`);
    // Call the runScraperForSource function from scraper.js
    await runScraperForSource(sourceId);

    res.json({ message: `Scraping triggered for ${source.name}` });
  } catch (error) {
    console.error(`Error triggering scrape for source ${sourceId}:`, error);
    res.status(500).json({ error: 'Failed to trigger scrape.' });
  }
});

// Endpoint to trigger a full scraper run
app.post('/api/scrape/run', async (req, res) => {
  try {
    console.log('Triggering full scraper run');
    // Call the runScraper function from scraper.js
    await runScraper();
    res.json({ message: 'Full scraper run triggered successfully. Check backend logs for progress.' });
  } catch (error) {
    console.error('Error triggering full scraper run:', error);
    res.status(500).json({ error: 'Failed to trigger full scraper run.' });
  }
});


// Basic endpoint for source discovery (currently calls opensourceDiscoverSources)
app.get('/api/discover-sources', async (req, res) => {
  try {
    // In a real application, you might pass parameters like a starting URL
    const discovered = await discoverArticleUrls('https://example.com'); // Use opensourceDiscoverSources
    res.json(discovered);
  } catch (error) {
    console.error('Error during source discovery:', error);
    res.status(500).json({ error: 'Failed to discover sources.' });
  }
});

// Endpoint to delete all articles, topics, and article links
app.post('/api/articles/purge', async (req, res) => {
  try {
    console.log('Purging all articles, topics, and article links...');
    // Delete from article_topics first due to foreign key constraints
    await pool.query('DELETE FROM article_topics');
    console.log('Deleted all entries from article_topics.');

    // Delete all articles
    await pool.query('DELETE FROM articles');
    console.log('Deleted all entries from articles.');

    // Delete all topics (optional, depending on whether topics should persist if no articles reference them)
    // Based on the placeholder comment, we will delete topics as well.
    await pool.query('DELETE FROM topics');
    console.log('Deleted all entries from topics.');

    // Reset the primary key sequence for the articles table
    await pool.query('ALTER SEQUENCE articles_id_seq RESTART WITH 1;');
    console.log('Reset articles table sequence.');

    res.json({ message: 'All articles, topics, and article links purged successfully.' });
  } catch (err) {
    console.error('Error during purge:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// API endpoint to get database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const articlesCountResult = await pool.query('SELECT COUNT(*) FROM articles');
    const sourcesCountResult = await pool.query('SELECT COUNT(*) FROM sources');
    const articlesPerSourceResult = await pool.query(`
      SELECT
          s.name AS source_name,
          COUNT(a.id) AS article_count
      FROM
          sources s
      LEFT JOIN
          articles a ON s.id = a.source_id
      GROUP BY
          s.name
      ORDER BY
          s.name
    `);

    const totalArticles = parseInt(articlesCountResult.rows[0].count, 10);
    const totalSources = parseInt(sourcesCountResult.rows[0].count, 10);
    const articlesPerSource = articlesPerSourceResult.rows.map(row => ({
      source_name: row.source_name,
      article_count: parseInt(row.article_count, 10),
    }));

    const articlesPerYearResult = await pool.query(`
      SELECT
          EXTRACT(YEAR FROM publication_date) AS article_year,
          COUNT(id) AS article_count
      FROM
          articles
      WHERE
          publication_date IS NOT NULL
      GROUP BY
          article_year
      ORDER BY
          article_year DESC
    `);

    const articlesPerYear = articlesPerYearResult.rows.map(row => ({
      year: parseInt(row.article_year, 10),
      article_count: parseInt(row.article_count, 10),
    }));

    res.json({ totalArticles, totalSources, articlesPerSource, articlesPerYear });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Temporary function to update NewslineTCI source include_selectors
async function updateNewslineSource() {
  const sourceId = 5;
  const include_selectors = '.IZZyL';

  try {
    const result = await pool.query(
      'UPDATE sources SET include_selectors = $1 WHERE id = $2 RETURNING *',
      [include_selectors, sourceId]
    );

    if (result.rows.length > 0) {
      console.log(`NewslineTCI source (ID ${sourceId}) updated successfully on startup.`);
    } else {
      console.log(`NewslineTCI source (ID ${sourceId}) not found on startup.`);
    }
  } catch (err) {
    console.error('Error updating NewslineTCI source on startup:', err);
  }
}


// Schedule the scraper to run periodically (example: every 1 hour)
// scheduleScraper('0 * * * *'); // Uncomment and configure as needed

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log('News scraper scheduled to run.'); // This message might be misleading if scheduleScraper is commented out
});

// Removed temporary startup actions as requested.
// The scheduled scraper in scraper.js will handle periodic scraping.
// updateNewslineSource();
// runScraperForSource(5);
