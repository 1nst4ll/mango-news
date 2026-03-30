const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { expensiveLimiter } = require('../middleware/rateLimiter');

// Get all articles with pagination
router.get('/', async (req, res) => {
  const endpoint = '/api/articles';
  const { topic, startDate, endDate, searchTerm, source_ids } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
  const offset = (page - 1) * limit;

  const values = [];
  const conditions = ['a.is_blocked = FALSE'];
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
    // Use trigram similarity on title (fast via GIN index) + ILIKE fallback on content
    conditions.push(`(a.title % $${valueIndex} OR a.title ILIKE $${valueIndex + 1} OR a.raw_content ILIKE $${valueIndex + 1})`);
    values.push(searchTerm, `%${searchTerm}%`);
    valueIndex += 2;
  }
  if (source_ids) {
    const sourceIdsArray = source_ids.split(',').map(id => parseInt(id, 10));
    conditions.push(`a.source_id = ANY($${valueIndex++})`);
    values.push(sourceIdsArray);
  }
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

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countQuery = `SELECT COUNT(DISTINCT a.id) FROM articles a ${whereClause}`;

  const articlesQuery = `
    WITH paged_articles AS (
      SELECT a.id
      FROM articles a
      ${whereClause}
      ORDER BY a.publication_date DESC
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    )
    SELECT
        a.*,
        ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS topics,
        ARRAY_REMOVE(ARRAY_AGG(t.name_es), NULL) AS topics_es,
        ARRAY_REMOVE(ARRAY_AGG(t.name_ht), NULL) AS topics_ht
    FROM articles a
    JOIN paged_articles pa ON a.id = pa.id
    LEFT JOIN article_topics at ON a.id = at.article_id
    LEFT JOIN topics t ON at.topic_id = t.id
    GROUP BY a.id
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
       console.warn(`[WARN] ${new Date().toISOString()} - GET ${endpoint} - Articles table not found, returning empty array.`);
       res.json([]);
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Admin search across all articles (includes blocked) — must be before /:id
router.get('/admin/search', authenticateToken, requireRole('admin'), async (req, res) => {
  const { q, limit: rawLimit } = req.query;
  const searchLimit = Math.min(50, Math.max(1, parseInt(rawLimit) || 20));
  if (!q || q.trim().length < 2) return res.json([]);

  try {
    const result = await pool.query(`
      SELECT a.id, a.title, a.source_url, a.is_blocked, a.publication_date,
             s.name AS source_name, a.source_id
      FROM articles a
      LEFT JOIN sources s ON a.source_id = s.id
      WHERE a.title ILIKE $1 OR a.source_url ILIKE $1
      ORDER BY a.publication_date DESC
      LIMIT $2
    `, [`%${q.trim()}%`, searchLimit]);

    res.json(result.rows);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET /api/articles/admin/search - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get adjacent articles (prev/next by publication date) — must be before /:id
router.get('/:id/adjacent', async (req, res) => {
  const articleId = req.params.id;
  try {
    const current = await pool.query('SELECT publication_date FROM articles WHERE id = $1', [articleId]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Article not found.' });
    const pubDate = current.rows[0].publication_date;

    const [prevResult, nextResult] = await Promise.all([
      pool.query(
        `SELECT id, title FROM articles WHERE is_blocked = FALSE AND (publication_date < $1 OR (publication_date = $1 AND id < $2)) ORDER BY publication_date DESC, id DESC LIMIT 1`,
        [pubDate, articleId]
      ),
      pool.query(
        `SELECT id, title FROM articles WHERE is_blocked = FALSE AND (publication_date > $1 OR (publication_date = $1 AND id > $2)) ORDER BY publication_date ASC, id ASC LIMIT 1`,
        [pubDate, articleId]
      ),
    ]);

    res.json({
      prev: prevResult.rows[0] || null,
      next: nextResult.rows[0] || null,
    });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET /api/articles/${articleId}/adjacent - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get a single article by ID
router.get('/:id', async (req, res) => {
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
      FROM articles a
      LEFT JOIN article_topics at ON a.id = at.article_id
      LEFT JOIN topics t ON at.topic_id = t.id
      WHERE a.id = $1
      GROUP BY a.id
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
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}`;
  try {
    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Attempting to delete article with ID: ${articleId}`);
    await pool.query('DELETE FROM article_topics WHERE article_id = $1', [articleId]);
    const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING id', [articleId]);
    if (result.rows.length === 0) {
      console.warn(`[WARN] ${new Date().toISOString()} - DELETE ${endpoint} - Article with ID ${articleId} not found`);
      return res.status(404).json({ error: 'Article not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - DELETE ${endpoint} - Successfully deleted article with ID ${articleId}.`);
    res.status(204).send();
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE ${endpoint} - Error deleting article with ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a single article by ID
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}`;
  const {
    title, source_url, author, publication_date, raw_content, summary, thumbnail_url,
    topics, category, title_es, summary_es, raw_content_es, topics_es,
    title_ht, summary_ht, raw_content_ht, topics_ht
  } = req.body;

  const updates = {};
  const updateValues = [];
  let querySet = [];
  let paramIndex = 1;

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
    await pool.query('BEGIN');

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

    if (topics_es !== undefined) {
      const topicsEsString = Array.isArray(topics_es) ? topics_es.join(',') : topics_es;
      await pool.query('UPDATE articles SET topics_es = $1 WHERE id = $2', [topicsEsString, articleId]);
    }

    if (topics_ht !== undefined) {
      const topicsHtString = Array.isArray(topics_ht) ? topics_ht.join(',') : topics_ht;
      await pool.query('UPDATE articles SET topics_ht = $1 WHERE id = $2', [topicsHtString, articleId]);
    }

    await pool.query('COMMIT');

    console.log(`[INFO] ${new Date().toISOString()} - PUT ${endpoint} - Successfully updated article with ID ${articleId}.`);
    const updatedArticleResult = await pool.query(`
      SELECT a.*, ARRAY_REMOVE(ARRAY_AGG(DISTINCT t.name), NULL) AS topics
      FROM articles a
      LEFT JOIN article_topics at ON a.id = at.article_id
      LEFT JOIN topics t ON at.topic_id = t.id
      WHERE a.id = $1
      GROUP BY a.id
    `, [articleId]);

    const updatedArticle = updatedArticleResult.rows[0];
    if (updatedArticle && updatedArticle.topics_es && typeof updatedArticle.topics_es === 'string') {
      updatedArticle.topics_es = updatedArticle.topics_es.split(',').map(t => t.trim()).filter(t => t);
    }
    if (updatedArticle && updatedArticle.topics_ht && typeof updatedArticle.topics_ht === 'string') {
      updatedArticle.topics_ht = updatedArticle.topics_ht.split(',').map(t => t.trim()).filter(t => t);
    }

    res.json(updatedArticle);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(`[ERROR] ${new Date().toISOString()} - PUT ${endpoint} - Error updating article with ID ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Toggle block status for a single article by ID
router.put('/:id/block', authenticateToken, requireRole('admin'), async (req, res) => {
  const articleId = req.params.id;
  const endpoint = `/api/articles/${articleId}/block`;
  const { blocked } = req.body;
  const newBlockedState = blocked !== undefined ? blocked : true;
  try {
    const result = await pool.query('UPDATE articles SET is_blocked = $2 WHERE id = $1 RETURNING id, is_blocked', [articleId, newBlockedState]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - PUT ${endpoint} - Article ${articleId} is_blocked set to ${newBlockedState}.`);
    res.json({ message: `Article ${articleId} ${newBlockedState ? 'blocked' : 'unblocked'} successfully.`, is_blocked: result.rows[0].is_blocked });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - PUT ${endpoint} - Error updating block status for article ${articleId}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Process AI for a single article
router.post('/:articleId/process-ai', authenticateToken, requireRole('admin'), expensiveLimiter, async (req, res) => {
  const articleId = req.params.articleId;
  const endpoint = `/api/articles/${articleId}/process-ai`;
  const { featureType } = req.body;

  if (!featureType || !['summary', 'tags', 'image', 'translations'].includes(featureType)) {
    return res.status(400).json({ error: 'Invalid or missing featureType. Must be "summary", "tags", "image", or "translations".' });
  }

  try {
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Triggering AI processing for article ID: ${articleId}, feature: ${featureType}`);
    const { processAiForArticle } = require('../scraper');
    const result = await processAiForArticle(articleId, featureType);
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering AI processing:`, error);
    res.status(500).json({ error: 'Failed to trigger AI processing.' });
  }
});

// Rescrape a single article by ID
router.post('/:articleId/rescrape', authenticateToken, requireRole('admin'), async (req, res) => {
  const articleId = req.params.articleId;
  const endpoint = `/api/articles/${articleId}/rescrape`;
  try {
    const articleResult = await pool.query('SELECT source_id, source_url FROM articles WHERE id = $1', [articleId]);
    const article = articleResult.rows[0];
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1', [article.source_id]);
    const source = sourceResult.rows[0];
    if (!source) {
      return res.status(404).json({ error: `Source with ID ${article.source_id} not found.` });
    }

    const { scrapeArticlePage } = require('../scraper');
    const processed = await scrapeArticlePage(
      source, article.source_url, 'rescrape',
      source.enable_ai_summary, source.enable_ai_tags,
      source.enable_ai_image, source.enable_ai_translations,
      source.scrape_after_date
    );

    if (processed) {
      res.json({ message: `Article ${articleId} rescraped successfully.` });
    } else {
      res.status(500).json({ error: `Failed to rescrape article ${articleId}.` });
    }
  } catch (error) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error triggering rescrape:`, error);
    res.status(500).json({ error: 'Failed to trigger rescrape.' });
  }
});

// Purge all articles
router.post('/purge', authenticateToken, requireRole('admin'), async (req, res) => {
  const endpoint = '/api/articles/purge';
  try {
    await pool.query('DELETE FROM article_topics');
    await pool.query('DELETE FROM articles');
    await pool.query('DELETE FROM topics');
    await pool.query('ALTER SEQUENCE articles_id_seq RESTART WITH 1;');
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - All articles, topics, and article links purged successfully.`);
    res.json({ message: 'All articles, topics, and article links purged successfully.' });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during purge:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Purge articles for a specific source
router.post('/purge/:sourceId', authenticateToken, requireRole('admin'), async (req, res) => {
  const sourceId = req.params.sourceId;
  const endpoint = `/api/articles/purge/${sourceId}`;
  try {
    const sourceCheck = await pool.query('SELECT id FROM sources WHERE id = $1', [sourceId]);
    if (sourceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found.' });
    }
    await pool.query('DELETE FROM article_topics WHERE article_id IN (SELECT id FROM articles WHERE source_id = $1)', [sourceId]);
    const deleteResult = await pool.query('DELETE FROM articles WHERE source_id = $1 RETURNING id', [sourceId]);
    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Deleted ${deleteResult.rows.length} articles for source ID ${sourceId}.`);
    res.json({ message: `All articles for source ID ${sourceId} purged successfully.`, articlesDeleted: deleteResult.rows.length });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error during purge:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
