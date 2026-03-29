const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { expensiveLimiter } = require('../middleware/rateLimiter');
const { createSundayEdition } = require('../sundayEditionGenerator');

// Generate Sunday Edition
router.post('/generate', authenticateToken, requireRole('admin'), expensiveLimiter, async (req, res) => {
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

// List Sunday Editions
router.get('/', async (req, res) => {
  const endpoint = '/api/sunday-editions';
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
  const offset = (page - 1) * limit;

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
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get single Sunday Edition
router.get('/:id', async (req, res) => {
  const editionId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM sunday_editions WHERE id = $1', [editionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sunday Edition not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET /api/sunday-editions/${editionId} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Sunday Edition
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const editionId = req.params.id;
  const { title, summary, image_url, publication_date } = req.body;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
  if (summary !== undefined) { updates.push(`summary = $${paramIndex++}`); values.push(summary); }
  if (image_url !== undefined) { updates.push(`image_url = $${paramIndex++}`); values.push(image_url); }
  if (publication_date !== undefined) { updates.push(`publication_date = $${paramIndex++}`); values.push(publication_date); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(editionId);

  try {
    const result = await pool.query(
      `UPDATE sunday_editions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sunday Edition not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - PUT /api/sunday-editions/${editionId} - Updated`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - PUT /api/sunday-editions/${editionId} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Sunday Edition
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const editionId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM sunday_editions WHERE id = $1 RETURNING id', [editionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sunday Edition not found.' });
    }
    console.log(`[INFO] ${new Date().toISOString()} - DELETE /api/sunday-editions/${editionId} - Deleted`);
    res.status(204).send();
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE /api/sunday-editions/${editionId} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Purge all Sunday Editions
router.post('/purge', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sunday_editions RETURNING id');
    console.log(`[INFO] ${new Date().toISOString()} - POST /api/sunday-editions/purge - Purged ${result.rowCount}`);
    res.json({ message: `Successfully purged ${result.rowCount} Sunday Edition(s).`, count: result.rowCount });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/sunday-editions/purge - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Regenerate image
router.post('/:id/regenerate-image', authenticateToken, requireRole('admin'), expensiveLimiter, async (req, res) => {
  const editionId = req.params.id;
  try {
    const result = await pool.query('SELECT id, title, summary FROM sunday_editions WHERE id = $1', [editionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sunday Edition not found.' });
    }
    const edition = result.rows[0];
    const imageService = require('../services/imageService');
    const imageUrl = await imageService.generateSundayEditionImage(edition.title, edition.summary);
    if (!imageUrl) {
      return res.status(500).json({ error: 'Image generation failed.' });
    }
    await pool.query('UPDATE sunday_editions SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [imageUrl, editionId]);
    res.json({ message: 'Image regenerated successfully.', image_url: imageUrl });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/sunday-editions/${editionId}/regenerate-image - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Regenerate audio narration
router.post('/:id/regenerate-audio', authenticateToken, requireRole('admin'), expensiveLimiter, async (req, res) => {
  const editionId = req.params.id;
  try {
    const result = await pool.query('SELECT id, summary FROM sunday_editions WHERE id = $1', [editionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sunday Edition not found.' });
    }
    const { generateNarration } = require('../sundayEditionGenerator');
    const taskId = await generateNarration(result.rows[0].summary);
    if (!taskId) {
      return res.status(500).json({ error: 'Audio generation failed to initiate.' });
    }
    await pool.query(
      'UPDATE sunday_editions SET narration_url = NULL, unreal_speech_task_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [taskId, editionId]
    );
    res.json({ message: 'Audio regeneration initiated. It will be available shortly via callback.', task_id: taskId });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/sunday-editions/${editionId}/regenerate-audio - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Unreal Speech callback webhook
router.post('/unreal-speech-callback', async (req, res) => {
  const endpoint = '/api/unreal-speech-callback';

  const callbackSchema = z.object({
    TaskId:     z.string().min(1),
    TaskStatus: z.enum(['completed', 'failed', 'processing', 'pending']),
  });
  const parsed = callbackSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Invalid payload:`, parsed.error.flatten());
    return res.status(400).json({ error: 'Invalid callback payload.' });
  }

  const { TaskId, TaskStatus } = parsed.data;

  const taskCheck = await pool.query('SELECT id FROM sunday_editions WHERE unreal_speech_task_id = $1', [TaskId]);
  if (taskCheck.rows.length === 0) {
    console.warn(`[WARN] ${new Date().toISOString()} - POST ${endpoint} - Unknown TaskId: ${TaskId}. Ignoring callback.`);
    return res.status(404).json({ error: 'Unknown TaskId.' });
  }

  console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Received callback for TaskId: ${TaskId}, Status: ${TaskStatus}`);

  if (TaskStatus === 'completed') {
    try {
      const UNREAL_SPEECH_API_KEY = process.env.UNREAL_SPEECH_API_KEY;
      const UNREAL_SPEECH_API_URL_TASK = `https://api.v8.unrealspeech.com/synthesisTasks/${TaskId}`;

      if (!UNREAL_SPEECH_API_KEY) {
        console.error('[ERROR] Unreal Speech API key is missing.');
        return res.status(500).json({ error: 'Unreal Speech API key is missing.' });
      }

      const taskDetailsResponse = await axios.get(UNREAL_SPEECH_API_URL_TASK, {
        headers: { 'Authorization': `Bearer ${UNREAL_SPEECH_API_KEY}`, 'Content-Type': 'application/json' }
      });

      const { SynthesisTask } = taskDetailsResponse.data;
      const OutputUri = SynthesisTask ? SynthesisTask.OutputUri : null;

      if (!OutputUri) {
        console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Task ${TaskId} completed but OutputUri not found.`);
        return res.status(500).json({ error: 'OutputUri not found in task details.' });
      }

      const { uploadToS3 } = require('../services/s3Service');

      const audioResponse = await axios.get(OutputUri, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(audioResponse.data);
      const filename = `sunday-edition-${uuidv4()}.mp3`;
      const s3Url = await uploadToS3(audioBuffer, 'sunday-editions/audio', filename, 'audio/mpeg');

      if (s3Url) {
        await pool.query(
          'UPDATE sunday_editions SET narration_url = $1, updated_at = CURRENT_TIMESTAMP WHERE unreal_speech_task_id = $2',
          [s3Url, TaskId]
        );
        console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Successfully processed narration for TaskId: ${TaskId}`);
        res.status(200).json({ message: 'Callback processed successfully.' });
      } else {
        console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Failed to upload audio to S3 for TaskId: ${TaskId}`);
        res.status(500).json({ error: 'Failed to upload audio to S3.' });
      }
    } catch (error) {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error processing callback:`, error);
      res.status(500).json({ error: 'Internal Server Error during callback processing.' });
    }
  } else if (TaskStatus === 'failed') {
    try {
      await pool.query(
        'UPDATE sunday_editions SET narration_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE unreal_speech_task_id = $1',
        [TaskId]
      );
      res.status(200).json({ message: 'Synthesis task failed, database updated.' });
    } catch (dbError) {
      console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error updating for failed task:`, dbError);
      res.status(500).json({ error: 'Failed to update database for failed synthesis task.' });
    }
  } else {
    res.status(200).json({ message: 'Callback received, no action taken.' });
  }
});

module.exports = router;
