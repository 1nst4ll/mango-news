require('dotenv').config(); // Load environment variables from .env file

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

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  let logMessage = `[INFO] ${timestamp} - ${method} ${url} from ${ip}`;

  // Log request body for POST and PUT requests
  if (['POST', 'PUT'].includes(method) && Object.keys(req.body).length > 0) {
    logMessage += ` - Body: ${JSON.stringify(req.body)}`;
  }

  console.log(logMessage);
  next();
});

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
    console.error(`[ERROR] ${new Date().toISOString()} - Database connection failed:`, err);
  } else {
    console.log(`[INFO] ${new Date().toISOString()} - Database connected successfully`);
  }
  done(); // This also releases the client
});


// API Endpoints

// Get all sources
app.get('/api/sources', async (req, res) => {
  const endpoint = '/api/sources';
  try {
    const result = await pool.query('SELECT * FROM sources ORDER BY id ASC');
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${result.rows.length} sources`);
    res.json(result.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching sources:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new source
app.post('/api/sources', async (req, res) => {
  const endpoint = '/api/sources';
  const { name, url, is_active, enable_ai_summary, enable_ai_tags, include_selectors, exclude_selectors, scraping_method } = req.body;
  if (!name || !url) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing required fields (name or url)`);
    return res.status(400).json({ error: 'Source name and URL are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO sources (name, url, is_active, enable_ai_summary, enable_ai_tags, include_selectors, exclude_selectors, scraping_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, url, is_active !== undefined ? is_active : true, enable_ai_summary !== undefined ? enable_ai_summary : true, enable_ai_tags !== undefined ? enable_ai_tags : true, include_selectors || null, exclude_selectors || null, scraping_method || 'opensource']
    );
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Successfully added new source: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error adding source:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a source
app.put('/api/sources/:id', async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/sources/${sourceId}`;
  const updates = req.body;

  if (updates.enable_ai_tags !== undefined) {
    updates.enable_ai_tags = updates.enable_ai_tags;
  }
  const fields = Object.keys(updates).map((field, index) => `"${field}" = $${index + 2}`).join(', ');
  const values = Object.values(updates);

  if (!fields) {
    console.warn(`[WARN] ${new Date().toISOString()} - PUT ${endpoint} - No update fields provided`);
    return res.status(400).json({ error: 'No update fields provided.' });
  }

  try {
    const result = await pool.query(
      `UPDATE sources SET ${fields} WHERE id = $1 RETURNING *`,
      [sourceId, ...values]
    );

    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - PUT ${endpoint} - Source with ID ${sourceId} not found`);
      return res.status(404).json({ error: 'Source not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - PUT ${endpoint} - Successfully updated source with ID ${sourceId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - PUT ${endpoint} - Error updating source with ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a source
app.delete('/api/sources/:id', async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/sources/${sourceId}`;
  try {
    const result = await pool.query('DELETE FROM sources WHERE id = $1 RETURNING *', [sourceId]);

    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - DELETE ${endpoint} - Source with ID ${sourceId} not found`);
      return res.status(404).json({ error: 'Source not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Successfully deleted source with ID ${sourceId}`);
    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE ${endpoint} - Error deleting source with ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get topics based on applied filters
app.get('/api/topics', async (req, res) => {
  const endpoint = '/api/topics';
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
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${result.rows.length} topics with filters: ${JSON.stringify(req.query)}`);
    res.json(result.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching filtered topics:`, err);
     // If tables don't exist yet, return an empty array as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Topics, article_topics, or articles table not found, returning empty array. Ensure database schema is applied.`);
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Get all articles
app.get('/api/articles', async (req, res) => {
  const endpoint = '/api/articles';
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
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${result.rows.length} articles with filters: ${JSON.stringify(req.query)}`);
    res.json(result.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching articles:`, err);
     // If the articles table doesn't exist yet, return an empty array as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Articles table not found, returning empty array. Ensure database schema is applied.`);
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Get a single article by ID
app.get('/api/articles/:id', async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}`;
  try {
    const result = await pool.query('SELECT * FROM articles WHERE id = $1', [articleId]);
    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Article with ID ${articleId} not found`);
      return res.status(404).json({ error: 'Article not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched article with ID ${articleId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching article by ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Trigger scraper for a specific source
app.post('/api/scrape/run/:id', async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/scrape/run/${sourceId}`;
  const { enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage } = req.body; // Include enableGlobalAiImage
  try {
    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1', [sourceId]);
    const source = sourceResult.rows[0];

    if (!source) {
      console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Source with ID ${sourceId} not found`);
      return res.status(404).json({ error: 'Source not found.' });
    }

    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering scrape for source: ${source.name} (ID: ${sourceId})`);
    const finalEnableGlobalAiTags = enableGlobalAiTags === true ? true : false;
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Global AI Summary enabled: ${enableGlobalAiSummary}, Global AI Tagging enabled: ${finalEnableGlobalAiTags}`);

    const scrapeResults = await runScraperForSource(
      sourceId,
      enableGlobalAiSummary, // Pass enableGlobalAiSummary
      finalEnableGlobalAiTags,
      enableGlobalAiImage // Pass enableGlobalAiImage
    );

    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Scrape for ${source.name} (ID: ${sourceId}) completed. Links found: ${scrapeResults.linksFound}, Articles added: ${scrapeResults.articlesAdded}`);
    res.json({
      message: `Scraping triggered for ${source.name}`,
      linksFound: scrapeResults.linksFound,
      articlesAdded: scrapeResults.articlesAdded,
    });
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering scrape for source ${sourceId}:`, error);
    res.status(500).json({ error: 'Failed to trigger scrape.' });
  }
});

// Endpoint to trigger a full scraper run
app.post('/api/scrape/run', async (req, res) => {
  const endpoint = '/api/scrape/run';
  const { enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage } = req.body; // Include enableGlobalAiImage
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering full scraper run`);
    const finalEnableGlobalAiTags = enableGlobalAiTags === true ? true : false;
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Global AI Summary enabled: ${enableGlobalAiSummary}, Global AI Tagging enabled: ${finalEnableGlobalAiTags}, Global AI Image enabled: ${enableGlobalAiImage}`); // Log enableGlobalAiImage

    await runScraper(enableGlobalAiSummary, finalEnableGlobalAiTags, enableGlobalAiImage); // Pass enableGlobalAiImage
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Full scraper run triggered successfully.`);
    res.json({ message: 'Full scraper run triggered successfully. Check backend logs for progress.' });
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering full scraper run:`, error);
    res.status(500).json({ error: 'Failed to trigger full scraper run.' });
  }
});


// Basic endpoint for source discovery (currently calls opensourceDiscoverSources)
app.get('/api/discover-sources', async (req, res) => {
  const endpoint = '/api/discover-sources';
  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Triggering source discovery`);
    const discovered = await discoverArticleUrls('https://example.com'); // Use opensourceDiscoverSources
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Source discovery completed. Discovered: ${JSON.stringify(discovered)}`);
    res.json(discovered);
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error during source discovery:`, error);
    res.status(500).json({ error: 'Failed to discover sources.' });
  }
});

// Endpoint to delete all articles, topics, and article links
app.post('/api/articles/purge', async (req, res) => {
  const endpoint = '/api/articles/purge';
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Purging all articles, topics, and article links...`);
    await pool.query('DELETE FROM article_topics');
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Deleted all entries from article_topics.`);

    await pool.query('DELETE FROM articles');
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Deleted all entries from articles.`);

    await pool.query('DELETE FROM topics');
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Deleted all entries from topics.`);

    await pool.query('ALTER SEQUENCE articles_id_seq RESTART WITH 1;');
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Reset articles table sequence.`);

    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - All articles, topics, and article links purged successfully.`);
    res.json({ message: 'All articles, topics, and article links purged successfully.' });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during purge:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to delete all articles for a specific source
app.post('/api/articles/purge/:sourceId', async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/articles/purge/${sourceId}`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Purging articles for source ID: ${sourceId}...`);

    const sourceCheck = await pool.query('SELECT id FROM sources WHERE id = $1', [sourceId]);
    if (sourceCheck.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Source with ID ${sourceId} not found`);
      return res.status(404).json({ error: 'Source not found.' });
    }

    await pool.query('DELETE FROM article_topics WHERE article_id IN (SELECT id FROM articles WHERE source_id = $1)', [sourceId]);
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Deleted article_topics entries for source ID ${sourceId}.`);

    const deleteResult = await pool.query('DELETE FROM articles WHERE source_id = $1 RETURNING id', [sourceId]);
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Deleted ${deleteResult.rows.length} articles for source ID ${sourceId}.`);

    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - All articles for source ID ${sourceId} purged successfully.`);
    res.json({ message: `All articles for source ID ${sourceId} purged successfully.`, articlesDeleted: deleteResult.rows.length });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during purge for source ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// API endpoint to get database statistics
app.get('/api/stats', async (req, res) => {
  const endpoint = '/api/stats';
  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetching database statistics...`);
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

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched database statistics. Total Articles: ${totalArticles}, Total Sources: ${totalSources}`);
    res.json({ totalArticles, totalSources, articlesPerSource, articlesPerYear });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching stats:`, err);
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
      console.log(`[INFO] ${new Date().toISOString()} - NewslineTCI source (ID ${sourceId}) updated successfully on startup.`);
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - NewslineTCI source (ID ${sourceId}) not found on startup.`);
    }
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - Error updating NewslineTCI source on startup:`, err);
  }
}


// Schedule the scraper to run periodically (example: every 1 hour)
// scheduleScraper('0 * * * *'); // Uncomment and configure as needed

app.listen(port, () => {
  console.log(`[INFO] ${new Date().toISOString()} - Backend server listening on port ${port}`);
  console.log(`[INFO] ${new Date().toISOString()} - News scraper scheduled to run.`); // This message might be misleading if scheduleScraper is commented out
});

// Removed temporary startup actions as requested.
// The scheduled scraper in scraper.js will handle periodic scraping.
// updateNewslineSource();
// runScraperForSource(5);
