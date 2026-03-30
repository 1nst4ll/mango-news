const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { reprocessTranslatedTopicsForSource } = require('../scraper');
const { handleOnboardRequest } = require('../onboardSource');

// Get all sources
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.get('/:sourceId/articles', async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/articles`;
  const ALLOWED_SORT_COLUMNS = ['id', 'title', 'publication_date', 'created_at'];
  const ALLOWED_SORT_ORDERS  = ['ASC', 'DESC'];
  const rawSortBy    = req.query.sortBy    || 'publication_date';
  const rawSortOrder = req.query.sortOrder || 'DESC';
  const sortBy    = ALLOWED_SORT_COLUMNS.includes(rawSortBy)                        ? rawSortBy    : 'publication_date';
  const sortOrder = ALLOWED_SORT_ORDERS.includes(rawSortOrder.toUpperCase())        ? rawSortOrder.toUpperCase() : 'DESC';
  const filterByAiStatus = req.query.filterByAiStatus;
  const searchTerm = req.query.search;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
  const offset = (page - 1) * limit;

  let baseQuery = `
    FROM articles a
    LEFT JOIN article_topics at ON a.id = at.article_id
    LEFT JOIN topics t ON at.topic_id = t.id
    WHERE a.source_id = $1
  `;

  const queryParams = [sourceId];
  let paramIndex = 2;

  if (searchTerm && searchTerm.trim().length > 0) {
    baseQuery += ` AND (a.title ILIKE $${paramIndex} OR a.source_url ILIKE $${paramIndex} OR CAST(a.id AS TEXT) = $${paramIndex + 1})`;
    queryParams.push(`%${searchTerm.trim()}%`, searchTerm.trim());
    paramIndex += 2;
  }

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
        a.publication_date,
        a.is_blocked
    ${baseQuery}
    GROUP BY
        a.id, a.title, a.source_url, a.thumbnail_url, a.summary, a.ai_image_path, a.topics_es, a.topics_ht, a.publication_date, a.is_blocked
    ORDER BY
        ${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  queryParams.push(parseInt(limit), offset);

  try {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetching articles for source ID: ${sourceId}, Page: ${page}, Limit: ${limit}, SortBy: ${sortBy}, SortOrder: ${sortOrder}, FilterByAiStatus: ${filterByAiStatus}`);

    const countResult = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
    const totalArticles = parseInt(countResult.rows[0].count, 10);

    const articlesResult = await pool.query(articlesQuery, queryParams);

    res.set('X-Total-Count', totalArticles.toString());
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${articlesResult.rows.length} articles (Total: ${totalArticles}) for source ID ${sourceId}`);
    res.json(articlesResult.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching articles for source ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new source
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
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
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
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
  if (scrape_after_date !== undefined) updates.scrape_after_date = scrape_after_date ? new Date(scrape_after_date) : null;

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
router.post('/:sourceId/reprocess-topics', authenticateToken, requireRole('admin'), async (req, res) => {
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
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/sources/${sourceId}`;
  try {
    const result = await pool.query('DELETE FROM sources WHERE id = $1 RETURNING *', [sourceId]);
    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - DELETE ${endpoint} - Source with ID ${sourceId} not found`);
      return res.status(404).json({ error: 'Source not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Successfully deleted source with ID ${sourceId}`);
    res.status(204).send();
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE ${endpoint} - Error deleting source with ID ${sourceId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Rescrape all articles for a specific source (SSE endpoint)
router.get('/:sourceId/rescrape-stream', authenticateToken, requireRole('admin'), async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/rescrape-stream`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - SSE connection established for rescrape of source ID: ${sourceId}`);

  const abortController = new AbortController();
  req.on('close', () => {
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Client disconnected, aborting rescrape for source ID: ${sourceId}`);
    abortController.abort();
  });

  try {
    const { rescrapeSourceArticles } = require('../scraper');
    await rescrapeSourceArticles(sourceId, res, abortController.signal);

    if (!abortController.signal.aborted) {
      console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Rescrape process completed for source ID: ${sourceId}. Closing SSE connection.`);
      res.end();
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
      console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error during rescrape SSE for source ${sourceId}:`, error);
      res.write(`data: ${JSON.stringify({ status: 'error', message: `Failed to trigger rescrape: ${error.message}` })}\n\n`);
      res.end();
    }
  }
});

// Rescrape POST endpoint (backward compatibility)
router.post('/:sourceId/rescrape', authenticateToken, requireRole('admin'), async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/sources/${sourceId}/rescrape`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering rescrape for source ID: ${sourceId}`);
    const { rescrapeSourceArticles } = require('../scraper');
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

// Source onboarding
router.post('/onboard', authenticateToken, requireRole('admin'), async (req, res) => {
  const endpoint = '/api/sources/onboard';
  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Starting source onboarding for: ${req.body.url}`);
    await handleOnboardRequest(req, res, pool);
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during onboarding:`, error);
    res.status(500).json({ error: 'Failed to onboard source.' });
  }
});

module.exports = router;
