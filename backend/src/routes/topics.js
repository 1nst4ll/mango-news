const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// List all topics with article counts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.name, t.name_es, t.name_ht,
             COUNT(at.article_id) AS article_count
      FROM topics t
      LEFT JOIN article_topics at ON t.id = at.topic_id
      GROUP BY t.id, t.name, t.name_es, t.name_ht
      ORDER BY t.name ASC
    `);
    res.json(result.rows.map(row => ({
      ...row,
      article_count: parseInt(row.article_count, 10),
    })));
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET /api/admin/topics - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new topic
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, name_es, name_ht } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Topic name is required.' });

  try {
    const result = await pool.query(
      `INSERT INTO topics (name, name_es, name_ht) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), name_es?.trim() || null, name_ht?.trim() || null]
    );
    console.log(`[INFO] ${new Date().toISOString()} - POST /api/admin/topics - Created topic: ${name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Topic "${name}" already exists.` });
    }
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/admin/topics - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a topic
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, name_es, name_ht } = req.body;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name.trim()); }
  if (name_es !== undefined) { updates.push(`name_es = $${paramIndex++}`); values.push(name_es?.trim() || null); }
  if (name_ht !== undefined) { updates.push(`name_ht = $${paramIndex++}`); values.push(name_ht?.trim() || null); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });

  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE topics SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topic not found.' });
    console.log(`[INFO] ${new Date().toISOString()} - PUT /api/admin/topics/${id} - Updated`);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: `Topic name already exists.` });
    }
    console.error(`[ERROR] ${new Date().toISOString()} - PUT /api/admin/topics/${id} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a topic (removes article associations too via CASCADE or manual cleanup)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM article_topics WHERE topic_id = $1', [id]);
    const result = await client.query('DELETE FROM topics WHERE id = $1 RETURNING name', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Topic not found.' });
    }
    await client.query('COMMIT');
    console.log(`[INFO] ${new Date().toISOString()} - DELETE /api/admin/topics/${id} - Deleted: ${result.rows[0].name}`);
    res.json({ message: `Topic "${result.rows[0].name}" deleted.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE /api/admin/topics/${id} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// Merge topics: move all articles from source topic to target topic, then delete source
router.post('/merge', authenticateToken, requireRole('admin'), async (req, res) => {
  const { sourceId, targetId } = req.body;
  if (!sourceId || !targetId || sourceId === targetId) {
    return res.status(400).json({ error: 'Valid sourceId and targetId are required.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Move article associations, ignoring duplicates
    await client.query(`
      INSERT INTO article_topics (article_id, topic_id)
      SELECT article_id, $1 FROM article_topics WHERE topic_id = $2
      ON CONFLICT DO NOTHING
    `, [targetId, sourceId]);
    // Remove old associations
    await client.query('DELETE FROM article_topics WHERE topic_id = $1', [sourceId]);
    // Delete source topic
    const result = await client.query('DELETE FROM topics WHERE id = $1 RETURNING name', [sourceId]);
    await client.query('COMMIT');
    const sourceName = result.rows[0]?.name || sourceId;
    console.log(`[INFO] ${new Date().toISOString()} - POST /api/admin/topics/merge - Merged "${sourceName}" into topic ${targetId}`);
    res.json({ message: `Topic "${sourceName}" merged successfully.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/admin/topics/merge - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

module.exports = router;
