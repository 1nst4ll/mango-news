const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { expensiveLimiter } = require('../middleware/rateLimiter');
const { runScraper, runScraperForSource, processMissingAiForSource } = require('../scraper');

// Get topics based on applied filters
router.get('/topics', async (req, res) => {
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

  if (startDate) { conditions.push(`a.publication_date >= $${valueIndex++}`); values.push(new Date(startDate)); }
  if (endDate) { conditions.push(`a.publication_date <= $${valueIndex++}`); values.push(new Date(endDate)); }
  if (searchTerm) { conditions.push(`(a.title ILIKE $${valueIndex} OR a.raw_content ILIKE $${valueIndex})`); values.push(`%${searchTerm}%`); valueIndex++; }
  if (sources) { const sourceNames = sources.split(','); conditions.push(`s.name = ANY($${valueIndex++})`); values.push(sourceNames); }

  if (conditions.length > 0) { query += ' WHERE ' + conditions.join(' AND '); }
  query += ' ORDER BY t.name ASC';

  try {
    const result = await pool.query(query, values);
    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Successfully fetched ${result.rows.length} topics`);
    res.json(result.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error fetching filtered topics:`, err);
    if (err.code === '42P01') {
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Trigger scraper for a specific source
router.post('/scrape/run/:id', authenticateToken, requireRole('admin'), expensiveLimiter, async (req, res) => {
  const sourceId = req.params.id;
  const endpoint = `/api/scrape/run/${sourceId}`;
  const { enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage } = req.body;
  try {
    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1', [sourceId]);
    const source = sourceResult.rows[0];
    if (!source) {
      return res.status(404).json({ error: 'Source not found.' });
    }
    const finalEnableGlobalAiTags = enableGlobalAiTags === true ? true : false;
    const scrapeResults = await runScraperForSource(sourceId, enableGlobalAiSummary, finalEnableGlobalAiTags, enableGlobalAiImage);
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Scrape completed. Links: ${scrapeResults.linksFound}, Added: ${scrapeResults.articlesAdded}`);
    res.json({ message: `Scraping triggered for ${source.name}`, linksFound: scrapeResults.linksFound, articlesAdded: scrapeResults.articlesAdded });
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering scrape:`, error);
    res.status(500).json({ error: 'Failed to trigger scrape.' });
  }
});

// Trigger full scraper run
router.post('/scrape/run', authenticateToken, requireRole('admin'), expensiveLimiter, async (req, res) => {
  const endpoint = '/api/scrape/run';
  const { enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage } = req.body;
  try {
    const finalEnableGlobalAiTags = enableGlobalAiTags === true ? true : false;
    await runScraper(enableGlobalAiSummary, finalEnableGlobalAiTags, enableGlobalAiImage);
    res.json({ message: 'Full scraper run triggered successfully. Check backend logs for progress.' });
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering full scraper run:`, error);
    res.status(500).json({ error: 'Failed to trigger full scraper run.' });
  }
});

// Process missing AI data for a specific source
router.post('/process-missing-ai/:sourceId', authenticateToken, requireRole('admin'), async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/process-missing-ai/${sourceId}`;
  const { featureType } = req.body;

  if (!featureType || !['summary', 'tags', 'image', 'translations'].includes(featureType)) {
    return res.status(400).json({ error: 'Invalid or missing featureType. Must be "summary", "tags", "image", or "translations".' });
  }

  try {
    const result = await processMissingAiForSource(sourceId, featureType);
    if (result.success) {
      res.json({ message: result.message, processedCount: result.processedCount, errorCount: result.errorCount });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to trigger missing AI processing.' });
  }
});

// Discover sources
router.get('/discover-sources', authenticateToken, requireRole('admin'), async (req, res) => {
  const endpoint = '/api/discover-sources';
  try {
    const { discoverArticleUrls } = require('../opensourceScraper');
    const discovered = await discoverArticleUrls('https://example.com');
    res.json(discovered);
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to discover sources.' });
  }
});

module.exports = router;
