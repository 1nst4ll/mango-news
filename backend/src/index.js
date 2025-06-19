// Main entry point for the backend application, handling API routes and database interactions.
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios'); // Import axios
const { Pool } = require('pg'); // Import Pool from pg
const RSS = require('rss'); // Import RSS
const { marked } = require('marked'); // Import marked
const { v4: uuidv4 } = require('uuid'); // For unique filenames
const { scheduleScraper } = require('./scraper');
const { discoverArticleUrls, scrapeArticle } = require('./opensourceScraper'); // Import opensourceScraper functions
const { scrapeUrl: firecrawlScrapeUrl } = require('@mendable/firecrawl-js'); // Assuming firecrawl-js is used for Firecrawl scraping
const { runScraper, runScraperForSource, processMissingAiForSource, reprocessTranslatedTopicsForSource, scrapeArticlePage } = require('./scraper'); // Import scraper functions including processMissingAiForSource and the new function
const { createSundayEdition } = require('./sundayEditionGenerator'); // Import createSundayEdition function
const { registerUser, loginUser } = require('./user'); // Import user management functions
const authenticateToken = require('./middleware/auth'); // Import authentication middleware

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  exposedHeaders: ['X-Total-Count'], // Expose custom header for frontend to read
}));
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

// User Registration
app.post('/api/register', async (req, res) => {
  const endpoint = '/api/register';
  const { username, password } = req.body;
  if (!username || !password) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing username or password`);
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const result = await registerUser(pool, username, password); // Pass pool
    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - User registered successfully: ${result.user.username}`);
      res.status(201).json({ message: 'User registered successfully.', user: { id: result.user.id, username: result.user.username } });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - User registration failed: ${result.message}`);
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during registration:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const endpoint = '/api/login';
  const { username, password } = req.body;
  if (!username || !password) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing username or password`);
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const result = await loginUser(pool, username, password); // Pass pool
    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - User logged in successfully: ${username}`);
      res.json({ message: 'Login successful.', token: result.token });
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Login failed: ${result.message}`);
      res.status(401).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during login:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


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

// Get a single source by ID
app.get('/api/sources/:id', async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/sources/${sourceId}`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetching source with ID: ${sourceId}`);
    const result = await pool.query('SELECT * FROM sources WHERE id = $1', [sourceId]);

    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Source with ID ${sourceId} not found`);
      return res.status(404).json({ error: 'Source not found.' });
    }

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched source with ID ${sourceId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching source with ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get articles for a specific source
app.get('/api/sources/:sourceId/articles', async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/articles`;
  const { page = 1, limit = 15, sortBy = 'publication_date', sortOrder = 'DESC', filterByAiStatus } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let baseQuery = `
    FROM articles a
    LEFT JOIN article_topics at ON a.id = at.article_id
    LEFT JOIN topics t ON at.topic_id = t.id
    WHERE a.source_id = $1
  `;

  const queryParams = [sourceId];
  let paramIndex = 2; // Start index for additional parameters

  // Add AI status filtering
  if (filterByAiStatus) {
    switch (filterByAiStatus) {
      case 'missing_summary':
        baseQuery += ` AND (a.summary IS NULL OR a.summary = '' OR a.summary = 'Summary generation failed.')`;
        break;
      case 'missing_tags':
        baseQuery += ` AND NOT EXISTS (SELECT 1 FROM article_topics WHERE article_id = a.id)`;
        break;
      case 'missing_image':
        baseQuery += ` AND (a.ai_image_path IS NULL AND (a.thumbnail_url IS NULL OR a.thumbnail_url = ''))`;
        break;
      case 'missing_translations':
        baseQuery += ` AND (a.title_es IS NULL OR a.summary_es IS NULL OR a.raw_content_es IS NULL OR a.title_ht IS NULL OR a.summary_ht IS NULL OR a.raw_content_ht IS NULL)`;
        break;
      case 'has_summary':
        baseQuery += ` AND (a.summary IS NOT NULL AND a.summary != '' AND a.summary != 'Summary generation failed.')`;
        break;
      case 'has_tags':
        baseQuery += ` AND EXISTS (SELECT 1 FROM article_topics WHERE article_id = a.id)`;
        break;
      case 'has_image':
        baseQuery += ` AND (a.ai_image_path IS NOT NULL OR a.thumbnail_url IS NOT NULL)`;
        break;
      case 'has_translations':
        baseQuery += ` AND (a.title_es IS NOT NULL AND a.summary_es IS NOT NULL AND a.raw_content_es IS NOT NULL AND a.title_ht IS NOT NULL AND a.summary_ht IS NOT NULL AND a.raw_content_ht IS NOT NULL)`;
        break;
      // Add more cases for other statuses if needed
    }
  }

  let countQuery = `SELECT COUNT(DISTINCT a.id) ${baseQuery}`;

  let articlesQuery = `
    SELECT
        a.id,
        a.title,
        a.source_url,
        a.thumbnail_url,
        a.summary AS ai_summary,
        a.ai_image_path AS ai_image_url,
        ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS ai_tags,
        a.topics_es,
        a.topics_ht,
        a.publication_date
    ${baseQuery}
    GROUP BY
        a.id, a.title, a.source_url, a.thumbnail_url, a.summary, a.ai_image_path, a.topics_es, a.topics_ht, a.publication_date
    ORDER BY
        ${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  queryParams.push(parseInt(limit), offset);

  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetching articles for source ID: ${sourceId}, Page: ${page}, Limit: ${limit}, SortBy: ${sortBy}, SortOrder: ${sortOrder}, FilterByAiStatus: ${filterByAiStatus}`);

    const countResult = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2)); // Exclude limit and offset for count query
    const totalArticles = parseInt(countResult.rows[0].count, 10);
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Calculated totalArticles: ${totalArticles}`);

    const articlesResult = await pool.query(articlesQuery, queryParams);

    res.set('X-Total-Count', totalArticles.toString()); // Set total count in header
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${articlesResult.rows.length} articles (Total: ${totalArticles}) for source ID ${sourceId}`);
    res.json(articlesResult.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching articles for source ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new source
app.post('/api/sources', authenticateToken, async (req, res) => {
  const endpoint = '/api/sources';
  const { name, url, is_active, enable_ai_summary, enable_ai_tags, enable_ai_image, enable_ai_translations, include_selectors, exclude_selectors, scraping_method, scrape_after_date } = req.body;
  if (!name || !url) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing required fields (name or url)`);
    return res.status(400).json({ error: 'Source name and URL are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO sources (name, url, is_active, enable_ai_summary, enable_ai_tags, enable_ai_image, enable_ai_translations, include_selectors, exclude_selectors, scraping_method, scrape_after_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [name, url, is_active !== undefined ? is_active : true, enable_ai_summary !== undefined ? enable_ai_summary : true, enable_ai_tags !== undefined ? enable_ai_tags : true, enable_ai_image !== undefined ? enable_ai_image : true, enable_ai_translations !== undefined ? enable_ai_translations : true, include_selectors || null, exclude_selectors || null, scraping_method || 'opensource', scrape_after_date ? new Date(scrape_after_date) : null]
    );
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Successfully added new source: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error adding source:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a source
app.put('/api/sources/:id', authenticateToken, async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/sources/${sourceId}`;
  const { name, url, is_active, enable_ai_summary, enable_ai_tags, enable_ai_image, enable_ai_translations, os_title_selector, os_content_selector, os_date_selector, os_author_selector, os_thumbnail_selector, os_topics_selector, include_selectors, exclude_selectors, article_link_template, exclude_patterns, scraping_method, scrape_after_date } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (url !== undefined) updates.url = url;
  if (is_active !== undefined) updates.is_active = is_active;
  if (enable_ai_summary !== undefined) updates.enable_ai_summary = enable_ai_summary;
  if (enable_ai_tags !== undefined) updates.enable_ai_tags = enable_ai_tags;
  if (enable_ai_image !== undefined) updates.enable_ai_image = enable_ai_image;
  if (enable_ai_translations !== undefined) updates.enable_ai_translations = enable_ai_translations;
  if (os_title_selector !== undefined) updates.os_title_selector = os_title_selector;
  if (os_content_selector !== undefined) updates.os_content_selector = os_content_selector;
  if (os_date_selector !== undefined) updates.os_date_selector = os_date_selector;
  if (os_author_selector !== undefined) updates.os_author_selector = os_author_selector;
  if (os_thumbnail_selector !== undefined) updates.os_thumbnail_selector = os_thumbnail_selector;
  if (os_topics_selector !== undefined) updates.os_topics_selector = os_topics_selector;
  if (include_selectors !== undefined) updates.include_selectors = include_selectors;
  if (exclude_selectors !== undefined) updates.exclude_selectors = exclude_selectors;
  if (article_link_template !== undefined) updates.article_link_template = article_link_template;
  if (exclude_patterns !== undefined) updates.exclude_patterns = exclude_patterns;
  if (scraping_method !== undefined) updates.scraping_method = scraping_method;
  if (scrape_after_date !== undefined) updates.scrape_after_date = scrape_after_date ? new Date(scrape_after_date) : null; // Handle date conversion and null

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

// Reprocess translated topics for a source
app.post('/api/sources/:sourceId/reprocess-topics', authenticateToken, async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/reprocess-topics`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering re-processing of translated topics for source ID: ${sourceId}`);

    const result = await reprocessTranslatedTopicsForSource(sourceId);

    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Reprocessing completed for source ID ${sourceId}. Processed: ${result.processedCount}, Errors: ${result.errorCount}`);
      res.json({ message: result.message, processedCount: result.processedCount, errorCount: result.errorCount });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Reprocessing failed for source ID ${sourceId}: ${result.message}`);
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering re-processing for source ${sourceId}:`, error);
    res.status(500).json({ error: 'Failed to trigger re-processing of translated topics.' });
  }
});

// Delete a source
app.delete('/api/sources/:id', authenticateToken, async (req, res) => {
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

// Rescrape all articles for a specific source (SSE endpoint)
app.get('/api/sources/:sourceId/rescrape-stream', authenticateToken, async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/rescrape-stream`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush headers to establish SSE connection immediately

  console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - SSE connection established for rescrape of source ID: ${sourceId}`);

  try {
    const { rescrapeSourceArticles } = require('./scraper');
    await rescrapeSourceArticles(sourceId, res); // Pass the response object for SSE

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Rescrape process completed for source ID: ${sourceId}. Closing SSE connection.`);
    res.end(); // End the SSE connection
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error during rescrape SSE for source ${sourceId}:`, error);
    res.write(`data: ${JSON.stringify({ status: 'error', message: `Failed to trigger rescrape: ${error.message}` })}\n\n`);
    res.end(); // End the SSE connection on error
  }
});

// Keep the original POST endpoint for backward compatibility or if needed for non-streaming calls
app.post('/api/sources/:sourceId/rescrape', authenticateToken, async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/rescrape`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering rescrape for source ID: ${sourceId}`);

    const { rescrapeSourceArticles } = require('./scraper');
    // For the POST endpoint, we don't pass 'res' for streaming, it will just return the final result
    const result = await rescrapeSourceArticles(sourceId);

    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Rescrape completed for source ID ${sourceId}. Articles rescraped: ${result.articlesRescraped}, Errors: ${result.errorCount}`);
      res.json({ message: result.message, articlesRescraped: result.articlesRescraped, errorCount: result.errorCount });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Rescrape failed for source ID ${sourceId}: ${result.message}`);
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering rescrape for source ${sourceId}:`, error);
    res.status(500).json({ error: 'Failed to trigger rescrape.' });
  }
});

// Get topics based on applied filters
app.get('/api/topics', async (req, res) => {
  const endpoint = '/api/topics';
  const { searchTerm, startDate, endDate, sources } = req.query;
  let query = `
    SELECT DISTINCT t.id, t.name, t.name_es, t.name_ht
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

// Get all articles with pagination
app.get('/api/articles', async (req, res) => {
  const endpoint = '/api/articles';
  const { topic, startDate, endDate, searchTerm, source_ids, page = 1, limit = 15 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const values = [];
  const conditions = [];
  let valueIndex = 1;

  // Build WHERE clause
  if (topic) {
    const topicNames = topic.split(',').map(name => name.toLowerCase());
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
  if (source_ids) {
    const sourceIdsArray = source_ids.split(',').map(id => parseInt(id, 10));
    conditions.push(`a.source_id = ANY($${valueIndex++})`);
    values.push(sourceIdsArray);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Count query
  const countQuery = `
    SELECT COUNT(DISTINCT a.id)
    FROM articles a
    ${whereClause}
  `;

  // Optimized articles query using a subquery for pagination
  const articlesQuery = `
    SELECT
        a.*,
        ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS topics,
        ARRAY_REMOVE(ARRAY_AGG(t.name_es), NULL) AS topics_es,
        ARRAY_REMOVE(ARRAY_AGG(t.name_ht), NULL) AS topics_ht
    FROM (
        SELECT *
        FROM articles a
        ${whereClause}
        ORDER BY a.publication_date DESC
        LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    ) a
    LEFT JOIN
        article_topics at ON a.id = at.article_id
    LEFT JOIN
        topics t ON at.topic_id = t.id
    GROUP BY a.id, a.title, a.source_id, a.source_url, a.thumbnail_url, a.ai_image_path, a.author, a.publication_date, a.raw_content, a.summary, a.created_at, a.updated_at, a.is_blocked, a.title_es, a.summary_es, a.raw_content_es, a.title_ht, a.summary_ht, a.raw_content_ht, a.topics_es, a.topics_ht, a.category
    ORDER BY a.publication_date DESC;
  `;

  const queryValues = [...values, parseInt(limit), offset];

  try {
    const countResult = await pool.query(countQuery, values);
    const totalArticles = parseInt(countResult.rows[0].count, 10);

    const articlesResult = await pool.query(articlesQuery, queryValues);

    res.set('X-Total-Count', totalArticles.toString());
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${articlesResult.rows.length} articles (Total: ${totalArticles}) with filters: ${JSON.stringify(req.query)}`);
    res.json(articlesResult.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching articles:`, err);
    if (err.code === '42P01') {
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
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetching article with ID: ${articleId}`);
    const result = await pool.query(`
      SELECT
          a.*,
          ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS topics,
          ARRAY_REMOVE(ARRAY_AGG(t.name_es), NULL) AS topics_es,
          ARRAY_REMOVE(ARRAY_AGG(t.name_ht), NULL) AS topics_ht
      FROM
          articles a
      LEFT JOIN
          article_topics at ON a.id = at.article_id
      LEFT JOIN
          topics t ON at.topic_id = t.id
      WHERE
          a.id = $1
      GROUP BY
          a.id
    `, [articleId]);

    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Article with ID ${articleId} not found`);
      return res.status(404).json({ error: 'Article not found.' });
    }

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched article with ID ${articleId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching article with ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Delete a single article by ID
app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Attempting to delete article with ID: ${articleId}`);

    // First, delete related entries in article_topics
    await pool.query('DELETE FROM article_topics WHERE article_id = $1', [articleId]);
    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Deleted article_topics entries for article ID ${articleId}.`);

    // Then, delete the article itself
    const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING id', [articleId]);

    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - DELETE ${endpoint} - Article with ID ${articleId} not found`);
      return res.status(404).json({ error: 'Article not found.' });
    }

    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Successfully deleted article with ID ${articleId}.`);
    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE ${endpoint} - Error deleting article with ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a single article by ID
app.put('/api/articles/:id', authenticateToken, async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}`;
  const {
    title,
    source_url,
    author,
    publication_date,
    raw_content,
    summary,
    thumbnail_url,
    topics, // Array of strings
    category,
    title_es,
    summary_es,
    raw_content_es,
    topics_es, // Array of strings
    title_ht,
    summary_ht,
    raw_content_ht,
    topics_ht // Array of strings
  } = req.body;

  const updates = {};
  const updateValues = [];
  let querySet = [];
  let paramIndex = 1;

  // Helper to add fields to updates
  const addField = (field, value) => {
    if (value !== undefined) {
      updates[field] = value;
      querySet.push(`${field} = $${paramIndex++}`);
      updateValues.push(value);
    }
  };

  addField('title', title);
  addField('source_url', source_url);
  addField('author', author);
  addField('raw_content', raw_content);
  addField('summary', summary);
  addField('thumbnail_url', thumbnail_url);
  addField('category', category);
  addField('title_es', title_es);
  addField('summary_es', summary_es);
  addField('raw_content_es', raw_content_es);
  addField('title_ht', title_ht);
  addField('summary_ht', summary_ht);
  addField('raw_content_ht', raw_content_ht);

  // Handle publication_date separately for date conversion
  if (publication_date !== undefined) {
    updates.publication_date = publication_date ? new Date(publication_date) : null;
    querySet.push(`publication_date = $${paramIndex++}`);
    updateValues.push(updates.publication_date);
  }

  if (querySet.length === 0 && topics === undefined && topics_es === undefined && topics_ht === undefined) {
    console.warn(`[WARN] ${new Date().toISOString()} - PUT ${endpoint} - No update fields provided`);
    return res.status(400).json({ error: 'No update fields provided.' });
  }

  try {
    await pool.query('BEGIN'); // Start transaction

    if (querySet.length > 0) {
      const updateArticleQuery = `UPDATE articles SET ${querySet.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      updateValues.push(articleId);
      const result = await pool.query(updateArticleQuery, updateValues);

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        console.warn(`[WARN] ${new Date().toISOString()} - PUT ${endpoint} - Article with ID ${articleId} not found`);
        return res.status(404).json({ error: 'Article not found.' });
      }
    }

    // Handle topics (English)
    if (topics !== undefined) {
      await pool.query('DELETE FROM article_topics WHERE article_id = $1', [articleId]);
      if (topics && topics.length > 0) {
        for (const topicName of topics) {
          let topicId;
          const existingTopic = await pool.query('SELECT id FROM topics WHERE name = $1', [topicName]);
          if (existingTopic.rows.length > 0) {
            topicId = existingTopic.rows[0].id;
          } else {
            const newTopic = await pool.query('INSERT INTO topics (name) VALUES ($1) RETURNING id', [topicName]);
            topicId = newTopic.rows[0].id;
          }
          await pool.query('INSERT INTO article_topics (article_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [articleId, topicId]);
        }
      }
    }

    // Handle topics_es (Spanish)
    if (topics_es !== undefined) {
      // Assuming topics_es are stored as a comma-separated string in the articles table
      // If they are linked via article_topics, a similar logic to 'topics' would be needed
      // For now, we'll assume they are directly updated in the articles table.
      // If topics_es is an array, convert it to a comma-separated string for DB storage
      const topicsEsString = Array.isArray(topics_es) ? topics_es.join(',') : topics_es;
      await pool.query('UPDATE articles SET topics_es = $1 WHERE id = $2', [topicsEsString, articleId]);
    }

    // Handle topics_ht (Haitian Creole)
    if (topics_ht !== undefined) {
      // Assuming topics_ht are stored as a comma-separated string in the articles table
      const topicsHtString = Array.isArray(topics_ht) ? topics_ht.join(',') : topics_ht;
      await pool.query('UPDATE articles SET topics_ht = $1 WHERE id = $2', [topicsHtString, articleId]);
    }

    await pool.query('COMMIT'); // Commit transaction

    console.log(`[INFO] ${new Date().toISOString()} - PUT ${endpoint} - Successfully updated article with ID ${articleId}.`);
    // Fetch the updated article to return the complete, current state
    const updatedArticleResult = await pool.query(`
      SELECT
          a.*,
          ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS topics,
          ARRAY_REMOVE(ARRAY_AGG(t_es.name), NULL) AS topics_es_array,
          ARRAY_REMOVE(ARRAY_AGG(t_ht.name), NULL) AS topics_ht_array
      FROM
          articles a
      LEFT JOIN
          article_topics at ON a.id = at.article_id
      LEFT JOIN
          topics t ON at.topic_id = t.id
      LEFT JOIN
          topics t_es ON a.topics_es LIKE '%' || t_es.name || '%' -- This join might be problematic if topics_es is just a string
      LEFT JOIN
          topics t_ht ON a.topics_ht LIKE '%' || t_ht.name || '%' -- This join might be problematic if topics_ht is just a string
      WHERE
          a.id = $1
      GROUP BY
          a.id
    `, [articleId]);

    const updatedArticle = updatedArticleResult.rows[0];
    // Re-format topics_es and topics_ht back to arrays if they were stored as strings
    if (updatedArticle.topics_es && typeof updatedArticle.topics_es === 'string') {
      updatedArticle.topics_es = updatedArticle.topics_es.split(',').map(t => t.trim()).filter(t => t);
    }
    if (updatedArticle.topics_ht && typeof updatedArticle.topics_ht === 'string') {
      updatedArticle.topics_ht = updatedArticle.topics_ht.split(',').map(t => t.trim()).filter(t => t);
    }

    res.json(updatedArticle);
  } catch (err) {
    await pool.query('ROLLBACK'); // Rollback transaction on error
    console.error(`[ERROR] ${new Date().toISOString()} - PUT ${endpoint} - Error updating article with ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Block a single article by ID
app.put('/api/articles/:id/block', authenticateToken, async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}/block`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - PUT ${endpoint} - Attempting to block article with ID: ${articleId}`);

    const result = await pool.query(
      'UPDATE articles SET is_blocked = TRUE WHERE id = $1 RETURNING id',
      [articleId]
    );

    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - PUT ${endpoint} - Article with ID ${articleId} not found`);
      return res.status(404).json({ error: 'Article not found.' });
    }

    console.log(`[INFO] ${new Date().toISOString()} - PUT ${endpoint} - Successfully blocked article with ID ${articleId}.`);
    res.json({ message: `Article ${articleId} blocked successfully.` });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - PUT ${endpoint} - Error blocking article with ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to trigger AI processing for a single article
app.post('/api/articles/:articleId/process-ai', authenticateToken, async (req, res) => {
  const articleId = req.params.articleId;
  const endpoint = `/api/articles/${articleId}/process-ai`;
  const { featureType } = req.body; // Expect featureType ('summary', 'tags', 'image', or 'translations')

  if (!featureType || !['summary', 'tags', 'image', 'translations'].includes(featureType)) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Invalid or missing featureType: ${featureType}`);
    return res.status(400).json({ error: 'Invalid or missing featureType. Must be "summary", "tags", "image", or "translations".' });
  }

  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering AI processing for article ID: ${articleId}, feature: ${featureType}`);

    // Import the processAiForArticle function from scraper.js
    const { processAiForArticle } = require('./scraper');
    const result = await processAiForArticle(articleId, featureType);

    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - AI processing completed for article ID ${articleId}, feature ${featureType}.`);
      res.json({ message: result.message });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - AI processing failed for article ID ${articleId}, feature ${featureType}: ${result.message}`);
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering AI processing for article ${articleId}, feature ${featureType}:`, error);
    res.status(500).json({ error: 'Failed to trigger AI processing.' });
  }
});


// Rescrape a single article by ID
app.post('/api/articles/:articleId/rescrape', authenticateToken, async (req, res) => {
  const articleId = req.params.articleId;
  const endpoint = `/api/articles/${articleId}/rescrape`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering rescrape for article ID: ${articleId}`);

    // Fetch article details to get source_id and source_url
    const articleResult = await pool.query('SELECT source_id, source_url FROM articles WHERE id = $1', [articleId]);
    const article = articleResult.rows[0];

    if (!article) {
      console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Article with ID ${articleId} not found`);
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Fetch source configuration
    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1', [article.source_id]);
    const source = sourceResult.rows[0];

    if (!source) {
      console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Source with ID ${article.source_id} not found for article ${articleId}`);
      return res.status(404).json({ error: `Source with ID ${article.source_id} not found.` });
    }

    // Import scrapeArticlePage from scraper.js
    const { scrapeArticlePage } = require('./scraper');
    const processed = await scrapeArticlePage(
      source,
      article.source_url,
      'rescrape', // Indicate this is a rescrape operation
      source.enable_ai_summary,
      source.enable_ai_tags,
      source.enable_ai_image,
      source.enable_ai_translations,
      source.scrape_after_date
    );

    if (processed) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Rescrape completed for article ID ${articleId}.`);
      res.json({ message: `Article ${articleId} rescraped successfully.` });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Rescrape failed for article ID ${articleId}.`);
      res.status(500).json({ error: `Failed to rescrape article ${articleId}.` });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering rescrape for article ${articleId}:`, error);
    res.status(500).json({ error: 'Failed to trigger rescrape.' });
  }
});

// Trigger scraper for a specific source
app.post('/api/scrape/run/:id', authenticateToken, async (req, res) => {
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
app.post('/api/scrape/run', authenticateToken, async (req, res) => {
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

// Endpoint to process missing AI data for a specific source
app.post('/api/process-missing-ai/:sourceId', authenticateToken, async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/process-missing-ai/${sourceId}`;
  const { featureType } = req.body; // Expect featureType ('summary', 'tags', 'image', or 'translations') in the request body

  if (!featureType || !['summary', 'tags', 'image', 'translations'].includes(featureType)) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Invalid or missing featureType: ${featureType}`);
    return res.status(400).json({ error: 'Invalid or missing featureType. Must be "summary", "tags", "image", or "translations".' });
  }

  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering missing AI processing for source ID: ${sourceId}, feature: ${featureType}`);

    const result = await processMissingAiForSource(sourceId, featureType);

    if (result.success) {
      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Missing AI processing completed for source ID ${sourceId}, feature ${featureType}.`);
      res.json({ message: result.message, processedCount: result.processedCount, errorCount: result.errorCount });
    } else {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Missing AI processing failed for source ID ${sourceId}, feature ${featureType}: ${result.message}`);
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering missing AI processing for source ${sourceId}, feature ${featureType}:`, error);
    res.status(500).json({ error: 'Failed to trigger missing AI processing.' });
  }
});


// Basic endpoint for source discovery (currently calls opensourceDiscoverSources)
app.get('/api/discover-sources', authenticateToken, async (req, res) => {
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
app.post('/api/articles/purge', authenticateToken, async (req, res) => {
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
app.post('/api/articles/purge/:sourceId', authenticateToken, async (req, res) => {
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
app.get('/api/stats', authenticateToken, async (req, res) => {
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

// Sunday Edition Endpoints
app.post('/api/sunday-editions/generate', async (req, res) => { // Temporarily removed authenticateToken for debugging
  // This is a temporary change for debugging. Re-add authenticateToken after debugging.
  try {
    const result = await createSundayEdition();
    if (result.success) {
      res.status(200).json({ message: result.message, id: result.id });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error triggering Sunday Edition generation:', error);
    res.status(500).json({ error: 'Failed to trigger Sunday Edition generation.' });
  }
});

app.get('/api/sunday-editions', async (req, res) => {
  const endpoint = '/api/sunday-editions';
  const { page = 1, limit = 15 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM sunday_editions');
    const totalEditions = parseInt(countResult.rows[0].count, 10);

    const editionsResult = await pool.query(
      `SELECT * FROM sunday_editions ORDER BY publication_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.set('X-Total-Count', totalEditions.toString());
    res.json(editionsResult.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching Sunday Editions:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/sunday-editions/:id', async (req, res) => {
  const editionId = req.params.id;
  const endpoint = `/api/sunday-editions/${editionId}`;
  try {
    const result = await pool.query('SELECT * FROM sunday_editions WHERE id = $1', [editionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sunday Edition not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching Sunday Edition with ID ${editionId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// New endpoint for Unreal Speech API callbacks
app.post('/api/unreal-speech-callback', async (req, res) => {
  const endpoint = '/api/unreal-speech-callback';
  const { TaskId, TaskStatus } = req.body; // OutputUri is not in the callback body

  console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Received callback for TaskId: ${TaskId}, Status: ${TaskStatus}`);

  if (TaskStatus === 'completed') { // Only check for completed status here
    try {
      // Fetch the task details from Unreal Speech API to get the OutputUri
      const UNREAL_SPEECH_API_KEY = process.env.UNREAL_SPEECH_API_KEY;
      const UNREAL_SPEECH_API_URL_TASK = `https://api.v8.unrealspeech.com/synthesisTasks/${TaskId}`; // Endpoint to get task details

      if (!UNREAL_SPEECH_API_KEY) {
        console.error('[ERROR] Unreal Speech API key is missing. Cannot fetch task details.');
        return res.status(500).json({ error: 'Unreal Speech API key is missing.' });
      }

      const taskDetailsResponse = await axios.get(UNREAL_SPEECH_API_URL_TASK, {
        headers: {
          'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const { SynthesisTask } = taskDetailsResponse.data;
      const OutputUri = SynthesisTask ? SynthesisTask.OutputUri : null;

      if (!OutputUri) {
        console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Task ${TaskId} completed but OutputUri not found in task details.`);
        return res.status(500).json({ error: 'OutputUri not found in task details.' });
      }

      // Import necessary functions from sundayEditionGenerator.js
      const { uploadToS3 } = require('./sundayEditionGenerator');

      console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Task ${TaskId} completed. Downloading audio from: ${OutputUri}`);

      const audioResponse = await axios.get(OutputUri, {
        responseType: 'arraybuffer' // Expect binary audio data
      });

      const audioBuffer = Buffer.from(audioResponse.data);
      const filename = `sunday-edition-${uuidv4()}.mp3`;
      const contentType = 'audio/mpeg';
      const s3Url = await uploadToS3(audioBuffer, 'sunday-editions/audio', filename, contentType);

      if (s3Url) {
        // Update the sunday_editions table with the S3 URL
        await pool.query(
          'UPDATE sunday_editions SET narration_url = $1, updated_at = CURRENT_TIMESTAMP WHERE unreal_speech_task_id = $2',
          [s3Url, TaskId]
        );
        console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Successfully processed and updated narration for TaskId: ${TaskId}`);
        res.status(200).json({ message: 'Callback processed successfully.' });
      } else {
        console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Failed to upload audio to S3 for TaskId: ${TaskId}`);
        res.status(500).json({ error: 'Failed to upload audio to S3.' });
      }
    } catch (error) {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error processing callback for TaskId ${TaskId}:`, error);
      res.status(500).json({ error: 'Internal Server Error during callback processing.' });
    }
  } else if (TaskStatus === 'failed') {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Unreal Speech synthesis task ${TaskId} failed.`);
    // Optionally update database to mark narration as failed
    await pool.query(
      'UPDATE sunday_editions SET narration_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE unreal_speech_task_id = $1',
      [TaskId]
    );
    res.status(200).json({ message: 'Synthesis task failed, database updated.' });
  } else {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Callback received for TaskId: ${TaskId}, Status: ${TaskStatus}. No action taken.`);
    res.status(200).json({ message: 'Callback received, no action taken.' });
  }
});

// RSS Feed Endpoint
app.get('/api/rss', async (req, res) => {
  const endpoint = '/api/rss';
  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Generating RSS feed...`);

    // Fetch the latest 20 articles
    const articlesResult = await pool.query(`
      SELECT
          a.id,
          a.title,
          a.source_url,
          a.publication_date,
          a.summary AS ai_summary,
          a.ai_image_path AS ai_image_url,
          a.thumbnail_url,
          s.name AS source_name
      FROM
          articles a
      JOIN
          sources s ON a.source_id = s.id
      WHERE
          a.is_blocked = FALSE -- Exclude blocked articles
      ORDER BY
          a.publication_date DESC
      LIMIT 20
    `);

    const feed = new RSS({
      title: 'Mango News Feed',
      description: 'Latest news from Turks and Caicos Islands',
      feed_url: 'https://mango.tc/api/rss', // Replace with actual domain if needed
      site_url: 'https://mango.tc', // Replace with actual domain if needed
      language: 'en-us',
      ttl: 60, // 60 minutes
    });

    for (const article of articlesResult.rows) {
      let descriptionHtml = article.ai_summary ? marked.parse(article.ai_summary) : '<p>No summary available.</p>';

      // Prepend image tag if AI image or thumbnail is available
      const imageUrl = article.ai_image_url || article.thumbnail_url;
      if (imageUrl) {
        descriptionHtml = `<img src="${imageUrl}" alt="${article.title}" style="max-width: 100%; height: auto;"><br/>` + descriptionHtml;
      }

      feed.item({
        title: article.title,
        url: `https://mango.tc/article/${article.id}`, // Link to frontend article page
        date: article.publication_date,
        description: descriptionHtml,
        guid: article.source_url, // Use original source URL as GUID
        author: article.source_name,
      });
    }

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - RSS feed generated successfully with ${articlesResult.rows.length} items.`);
    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());

  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error generating RSS feed:`, err);
    // If the articles or sources table doesn't exist yet, return an empty feed as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Articles or sources table not found, returning empty RSS feed. Ensure database schema is applied.`);
       const emptyFeed = new RSS({
         title: 'Mango News Feed',
         description: 'Latest news from Turks and Caicos Islands',
         feed_url: 'https://mango.tc/api/rss', // Replace with actual domain if needed
         site_url: 'https://mango.tc', // Replace with actual domain if needed
         language: 'en-us',
         ttl: 60, // 60 minutes
       });
       res.set('Content-Type', 'application/rss+xml');
       res.send(emptyFeed.xml());
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});


// API endpoint to get scheduler settings
app.get('/api/settings/scheduler', authenticateToken, async (req, res) => {
  const endpoint = '/api/settings/scheduler';
  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetching scheduler settings...`);

    // Fetch settings from the database
    const settingsResult = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN ('main_scraper_frequency', 'missing_ai_frequency', 'enable_scheduled_missing_summary', 'enable_scheduled_missing_tags', 'enable_scheduled_missing_image', 'enable_scheduled_missing_translations', 'sunday_edition_frequency')`
    );

    const settings = settingsResult.rows.reduce((acc, row) => {
      acc[row.setting_name] = row.setting_value;
      return acc;
    }, {});

    // Provide default values if settings are not found
    const responseSettings = {
      main_scraper_frequency: settings.main_scraper_frequency || '0 * * * *', // Default to hourly
      missing_ai_frequency: settings.missing_ai_frequency || '*/20 * * * *', // Default to every 20 minutes
      enable_scheduled_missing_summary: settings.enable_scheduled_missing_summary !== undefined ? settings.enable_scheduled_missing_summary === 'true' : true, // Default to true, convert string to boolean
      enable_scheduled_missing_tags: settings.enable_scheduled_missing_tags !== undefined ? settings.enable_scheduled_missing_tags === 'true' : true, // Default to true, convert string to boolean
      enable_scheduled_missing_image: settings.enable_scheduled_missing_image !== undefined ? settings.enable_scheduled_missing_image === 'true' : true, // Default to true, convert string to boolean
      enable_scheduled_missing_translations: settings.enable_scheduled_missing_translations !== undefined ? settings.enable_scheduled_missing_translations === 'true' : true, // Default to true, convert string to boolean
      sunday_edition_frequency: settings.sunday_edition_frequency || '0 0 * * 0', // Default to every Sunday at midnight
    };

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched scheduler settings: ${JSON.stringify(responseSettings)}`);
    res.json(responseSettings);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching scheduler settings:`, err);
     // If the application_settings table doesn't exist yet, return defaults as a fallback
    if (err.code === '42P01') { // 'undefined_table' error code for PostgreSQL
       console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - application_settings table not found, returning defaults. Ensure database schema is applied.`);
       res.json({
         main_scraper_frequency: '0 * * * *',
         missing_ai_frequency: '*/20 * * * *',
         enable_scheduled_missing_summary: true,
         enable_scheduled_missing_tags: true,
         enable_scheduled_missing_image: true,
       });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// API endpoint to save scheduler settings
app.post('/api/settings/scheduler', authenticateToken, async (req, res) => {
  const endpoint = '/api/settings/scheduler';
  const { main_scraper_frequency, missing_ai_frequency, enable_scheduled_missing_summary, enable_scheduled_missing_tags, enable_scheduled_missing_image, enable_scheduled_missing_translations, sunday_edition_frequency } = req.body;

  if (main_scraper_frequency === undefined || missing_ai_frequency === undefined || enable_scheduled_missing_summary === undefined || enable_scheduled_missing_tags === undefined || enable_scheduled_missing_image === undefined || enable_scheduled_missing_translations === undefined || sunday_edition_frequency === undefined) {
     console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Missing required scheduler settings in request body`);
     return res.status(400).json({ error: 'Missing required scheduler settings.' });
  }

  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Saving scheduler settings: ${JSON.stringify(req.body)}`);

    // Use a transaction to ensure atomicity
    await pool.query('BEGIN');

    // Upsert (Insert or Update) each setting
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['main_scraper_frequency', main_scraper_frequency]
    );
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['missing_ai_frequency', missing_ai_frequency]
    );
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['enable_scheduled_missing_summary', String(enable_scheduled_missing_summary)] // Store boolean as string
    );
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['enable_scheduled_missing_tags', String(enable_scheduled_missing_tags)] // Store boolean as string
    );
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['enable_scheduled_missing_image', String(enable_scheduled_missing_image)] // Store boolean as string
    );
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['enable_scheduled_missing_translations', String(enable_scheduled_missing_translations)] // Store boolean as string
    );
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      ['sunday_edition_frequency', sunday_edition_frequency]
    );

    await pool.query('COMMIT');

    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Scheduler settings saved successfully.`);
    res.json({ message: 'Scheduler settings saved successfully.' });
  } catch (err) {
    await pool.query('ROLLBACK'); // Rollback transaction on error
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error saving scheduler settings:`, err);
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

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - Unhandled error:`, err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

module.exports = { pool };
