const express = require('express');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const aiService = require('../services/aiService');

// Database statistics router — mounted at /api/stats
const statsRouter = express.Router();

statsRouter.get('/', authenticateToken, async (req, res) => {
  const endpoint = '/api/stats';
  try {
    const articlesCountResult = await pool.query('SELECT COUNT(*) FROM articles');
    const sourcesCountResult = await pool.query('SELECT COUNT(*) FROM sources');
    const articlesPerSourceResult = await pool.query(`
      SELECT s.name AS source_name, COUNT(a.id) AS article_count
      FROM sources s LEFT JOIN articles a ON s.id = a.source_id
      GROUP BY s.name ORDER BY s.name
    `);

    const totalArticles = parseInt(articlesCountResult.rows[0].count, 10);
    const totalSources = parseInt(sourcesCountResult.rows[0].count, 10);
    const articlesPerSource = articlesPerSourceResult.rows.map(row => ({
      source_name: row.source_name,
      article_count: parseInt(row.article_count, 10),
    }));

    const articlesPerYearResult = await pool.query(`
      SELECT EXTRACT(YEAR FROM publication_date) AS article_year, COUNT(id) AS article_count
      FROM articles WHERE publication_date IS NOT NULL
      GROUP BY article_year ORDER BY article_year DESC
    `);
    const articlesPerYear = articlesPerYearResult.rows.map(row => ({
      year: parseInt(row.article_year, 10),
      article_count: parseInt(row.article_count, 10),
    }));

    const sundayEditionStatsResult = await pool.query(`
      SELECT COUNT(*) AS total, COUNT(narration_url) AS with_audio, COUNT(image_url) AS with_image,
             MIN(publication_date) AS oldest, MAX(publication_date) AS newest
      FROM sunday_editions
    `);
    const seRow = sundayEditionStatsResult.rows[0];
    const sundayEditionStats = {
      total: parseInt(seRow.total, 10),
      withAudio: parseInt(seRow.with_audio, 10),
      withImage: parseInt(seRow.with_image, 10),
      oldest: seRow.oldest,
      newest: seRow.newest,
    };

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Total: ${totalArticles} articles, ${totalSources} sources, ${sundayEditionStats.total} editions`);
    res.json({ totalArticles, totalSources, articlesPerSource, articlesPerYear, sundayEditionStats });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// AI Service router — mounted at /api/ai-service
const aiServiceRouter = express.Router();

aiServiceRouter.get('/stats', authenticateToken, async (req, res) => {
  try {
    const cacheStats = aiService.getCacheStats();
    const rateLimitStatus = aiService.getRateLimitStatus();
    res.json({
      cache: { size: cacheStats.size, sampleKeys: cacheStats.entries },
      rateLimit: { currentCount: rateLimitStatus.requestCount, limit: rateLimitStatus.limit, resetInMs: rateLimitStatus.resetIn },
      config: {
        models: aiService.CONFIG.MODELS,
        maxRetries: aiService.CONFIG.MAX_RETRIES,
        cacheTtlMs: aiService.CONFIG.CACHE_TTL_MS,
        rateLimitPerMinute: aiService.CONFIG.RATE_LIMIT_PER_MINUTE,
      }
    });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET /api/ai-service/stats - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

aiServiceRouter.post('/clear-cache', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    aiService.clearCache();
    console.log(`[INFO] ${new Date().toISOString()} - POST /api/ai-service/clear-cache - Cache cleared`);
    res.json({ message: 'AI service cache cleared successfully.' });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/ai-service/clear-cache - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { statsRouter, aiServiceRouter };
