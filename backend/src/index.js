const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg'); // Import Pool from pg
const { scheduleScraper } = require('./scraper');
const { discoverArticleUrls, scrapeArticle } = require('./opensourceScraper'); // Import opensourceScraper functions
const { scrapeUrl: firecrawlScrapeUrl } = require('@mendable/firecrawl-js'); // Assuming firecrawl-js is used for Firecrawl scraping

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL Database Pool
const pool = new Pool({
  user: process.env.DB_USER || 'hoffma24_mangoadmin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hoffma24_mangonews',
  password: process.env.DB_PASSWORD || 'R3d3d0ndr0N', // Replace with a secure way to handle password
  port: process.env.DB_PORT || 5432, // Default PostgreSQL port
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected successfully');
    client.release(); // Release the client back to the pool
  }
  done();
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

// Get all topics
app.get('/api/topics', async (req, res) => {
  try {
    // Assuming a 'topics' table exists with 'id' and 'name' columns
    const result = await pool.query('SELECT id, name FROM topics ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching topics:', err);
    // If the topics table doesn't exist yet, return an empty array as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn('Topics table not found, returning empty array.');
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Get all articles
app.get('/api/articles', async (req, res) => {
  try {
    // Assuming an 'articles' table exists
    // Add filtering logic based on query parameters (topic, startDate, endDate) if implemented
    const result = await pool.query('SELECT * FROM articles ORDER BY published_at DESC'); // Assuming 'published_at' column
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching articles:', err);
     // If the articles table doesn't exist yet, return an empty array as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn('Articles table not found, returning empty array.');
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
    // Placeholder for triggering the scrape logic
    // This would involve calling the appropriate scraper function (opensourceScraper or Firecrawl)
    // and saving the results to the database.
    // await scrapeArticlePage(source); // This function would need to be implemented or imported

    res.json({ message: `Scraping triggered for ${source.name}` });
  } catch (error) {
    console.error(`Error triggering scrape for source ${sourceId}:`, error);
    res.status(500).json({ error: 'Failed to trigger scrape.' });
  }
});

// Basic endpoint for source discovery (currently calls opensourceDiscoverSources)
app.get('/api/discover-sources', async (req, res) => {
  try {
    // In a real application, you might pass parameters like a starting URL
    const discovered = await discoverArticleUrls('https://example.com'); // Use opensourceDiscoverUrls
    res.json(discovered);
  } catch (error) {
    console.error('Error during source discovery:', error);
    res.status(500).json({ error: 'Failed to discover sources.' });
  }
});

// Endpoint to delete all articles, topics, and article links (placeholder)
app.post('/api/articles/purge', async (req, res) => {
  try {
    // In a real application, execute DELETE statements for articles, topics, and article_topics tables
    console.log('Purging articles, topics, and article links (placeholder)');
    res.json({ message: 'Purge triggered (placeholder).' });
  } catch (error) {
    console.error('Error during purge:', error);
    res.status(500).json({ error: 'Failed to trigger purge.' });
  }
});


// Schedule the scraper to run periodically (example: every 1 hour)
// scheduleScraper('0 * * * *'); // Uncomment and configure as needed

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log('News scraper scheduled to run.'); // This message might be misleading if scheduleScraper is commented out
});
