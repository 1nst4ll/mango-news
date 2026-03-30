const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get scheduler settings
router.get('/scheduler', authenticateToken, async (req, res) => {
  const endpoint = '/api/settings/scheduler';
  try {
    const settingsResult = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN ('main_scraper_frequency', 'missing_ai_frequency', 'enable_scheduled_missing_summary', 'enable_scheduled_missing_tags', 'enable_scheduled_missing_image', 'enable_scheduled_missing_translations', 'sunday_edition_frequency', 'main_scraper_enabled', 'missing_ai_enabled', 'sunday_edition_enabled', 'enable_manual_ai_summary', 'enable_manual_ai_tags', 'enable_manual_ai_image', 'enable_manual_ai_translations')`
    );

    const settings = settingsResult.rows.reduce((acc, row) => {
      acc[row.setting_name] = row.setting_value;
      return acc;
    }, {});

    const responseSettings = {
      main_scraper_frequency: settings.main_scraper_frequency || '0 * * * *',
      missing_ai_frequency: settings.missing_ai_frequency || '*/20 * * * *',
      enable_scheduled_missing_summary: settings.enable_scheduled_missing_summary !== undefined ? settings.enable_scheduled_missing_summary === 'true' : true,
      enable_scheduled_missing_tags: settings.enable_scheduled_missing_tags !== undefined ? settings.enable_scheduled_missing_tags === 'true' : true,
      enable_scheduled_missing_image: settings.enable_scheduled_missing_image !== undefined ? settings.enable_scheduled_missing_image === 'true' : true,
      enable_scheduled_missing_translations: settings.enable_scheduled_missing_translations !== undefined ? settings.enable_scheduled_missing_translations === 'true' : true,
      sunday_edition_frequency: settings.sunday_edition_frequency || '0 0 * * 0',
      main_scraper_enabled: settings.main_scraper_enabled !== undefined ? settings.main_scraper_enabled === 'true' : true,
      missing_ai_enabled: settings.missing_ai_enabled !== undefined ? settings.missing_ai_enabled === 'true' : true,
      sunday_edition_enabled: settings.sunday_edition_enabled !== undefined ? settings.sunday_edition_enabled === 'true' : true,
      enable_manual_ai_summary: settings.enable_manual_ai_summary !== undefined ? settings.enable_manual_ai_summary === 'true' : true,
      enable_manual_ai_tags: settings.enable_manual_ai_tags !== undefined ? settings.enable_manual_ai_tags === 'true' : true,
      enable_manual_ai_image: settings.enable_manual_ai_image !== undefined ? settings.enable_manual_ai_image === 'true' : true,
      enable_manual_ai_translations: settings.enable_manual_ai_translations !== undefined ? settings.enable_manual_ai_translations === 'true' : true,
    };

    console.log(`[INFO] ${new Date().toISOString()} - GET ${endpoint} - Fetched settings`);
    res.json(responseSettings);
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET ${endpoint} - Error:`, err);
    if (err.code === '42P01') {
       res.json({
         main_scraper_frequency: '0 * * * *',
         missing_ai_frequency: '*/20 * * * *',
         enable_scheduled_missing_summary: true,
         enable_scheduled_missing_tags: true,
         enable_scheduled_missing_image: true,
         enable_scheduled_missing_translations: true,
         sunday_edition_frequency: '0 0 * * 0',
         main_scraper_enabled: true,
         missing_ai_enabled: true,
         sunday_edition_enabled: true,
         enable_manual_ai_summary: true,
         enable_manual_ai_tags: true,
         enable_manual_ai_image: true,
         enable_manual_ai_translations: true,
       });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// Save scheduler settings
router.post('/scheduler', authenticateToken, requireRole('admin'), async (req, res) => {
  const endpoint = '/api/settings/scheduler';
  const { main_scraper_frequency, missing_ai_frequency, enable_scheduled_missing_summary, enable_scheduled_missing_tags, enable_scheduled_missing_image, enable_scheduled_missing_translations, sunday_edition_frequency, main_scraper_enabled, missing_ai_enabled, sunday_edition_enabled } = req.body;

  if (main_scraper_frequency === undefined || missing_ai_frequency === undefined || enable_scheduled_missing_summary === undefined || enable_scheduled_missing_tags === undefined || enable_scheduled_missing_image === undefined || enable_scheduled_missing_translations === undefined || sunday_edition_frequency === undefined) {
     return res.status(400).json({ error: 'Missing required scheduler settings.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upsert = (name, value) => client.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [name, value]
    );

    await upsert('main_scraper_frequency', main_scraper_frequency);
    await upsert('missing_ai_frequency', missing_ai_frequency);
    await upsert('enable_scheduled_missing_summary', String(enable_scheduled_missing_summary));
    await upsert('enable_scheduled_missing_tags', String(enable_scheduled_missing_tags));
    await upsert('enable_scheduled_missing_image', String(enable_scheduled_missing_image));
    await upsert('enable_scheduled_missing_translations', String(enable_scheduled_missing_translations));
    await upsert('sunday_edition_frequency', sunday_edition_frequency);
    if (main_scraper_enabled !== undefined) await upsert('main_scraper_enabled', String(main_scraper_enabled));
    if (missing_ai_enabled !== undefined) await upsert('missing_ai_enabled', String(missing_ai_enabled));
    if (sunday_edition_enabled !== undefined) await upsert('sunday_edition_enabled', String(sunday_edition_enabled));
    if (req.body.enable_manual_ai_summary !== undefined) await upsert('enable_manual_ai_summary', String(req.body.enable_manual_ai_summary));
    if (req.body.enable_manual_ai_tags !== undefined) await upsert('enable_manual_ai_tags', String(req.body.enable_manual_ai_tags));
    if (req.body.enable_manual_ai_image !== undefined) await upsert('enable_manual_ai_image', String(req.body.enable_manual_ai_image));
    if (req.body.enable_manual_ai_translations !== undefined) await upsert('enable_manual_ai_translations', String(req.body.enable_manual_ai_translations));

    await client.query('COMMIT');

    console.log(`[INFO] ${new Date().toISOString()} - POST ${endpoint} - Settings saved`);
    res.json({ message: 'Scheduler settings saved successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[ERROR] ${new Date().toISOString()} - POST ${endpoint} - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// Get emergency banner settings (public — no auth required)
router.get('/emergency', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN ('emergency_banner_enabled', 'emergency_banner_text')`
    );
    const settings = result.rows.reduce((acc, row) => {
      acc[row.setting_name] = row.setting_value;
      return acc;
    }, {});
    res.json({
      enabled: settings.emergency_banner_enabled === 'true',
      text: settings.emergency_banner_text || '',
    });
  } catch (err) {
    // If table doesn't exist, return disabled
    res.json({ enabled: false, text: '' });
  }
});

// Update emergency banner settings (admin only)
router.put('/emergency', authenticateToken, requireRole('admin'), async (req, res) => {
  const { enabled, text } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upsert = (name, value) => client.query(
      `INSERT INTO application_settings (setting_name, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [name, value]
    );
    if (enabled !== undefined) await upsert('emergency_banner_enabled', String(enabled));
    if (text !== undefined) await upsert('emergency_banner_text', text);
    await client.query('COMMIT');
    console.log(`[INFO] ${new Date().toISOString()} - PUT /api/settings/emergency - Updated`);
    res.json({ message: 'Emergency banner settings updated.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[ERROR] ${new Date().toISOString()} - PUT /api/settings/emergency - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// Blacklist management + AI model settings
const { loadUrlBlacklist, loadAiModels, getAiModels, AI_MODEL_DEFAULTS } = require('../configLoader');

// ============================================================================
// AI Model Settings
// ============================================================================

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',             label: 'Llama 3.3 70B (versatile)' },
  { id: 'llama-3.1-8b-instant',                label: 'Llama 3.1 8B (instant)' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (preview)' },
  { id: 'qwen/qwen3-32b',                      label: 'Qwen3 32B (preview)' },
  { id: 'openai/gpt-oss-120b',                 label: 'GPT OSS 120B' },
  { id: 'openai/gpt-oss-20b',                  label: 'GPT OSS 20B' },
  { id: 'groq/compound',                       label: 'Groq Compound' },
  { id: 'groq/compound-mini',                  label: 'Groq Compound Mini' },
];

const FAL_IMAGE_MODELS = [
  { id: 'fal-ai/flux-2/turbo',   label: 'FLUX.2 Turbo (fast, recommended)' },
  { id: 'fal-ai/flux-2-pro',     label: 'FLUX.2 Pro (highest quality)' },
  { id: 'fal-ai/flux-2-flex',    label: 'FLUX.2 Flex' },
  { id: 'fal-ai/flux/dev',       label: 'FLUX.1 Dev' },
  { id: 'fal-ai/flux/schnell',   label: 'FLUX.1 Schnell (fastest)' },
  { id: 'fal-ai/flux-pro/v1.1',  label: 'FLUX1.1 Pro' },
];

router.get('/ai-models', authenticateToken, async (req, res) => {
  try {
    res.json({
      current: getAiModels(),
      defaults: AI_MODEL_DEFAULTS,
      options: { groq: GROQ_MODELS, image: FAL_IMAGE_MODELS },
    });
  } catch (err) {
    console.error(`[ERROR] GET /api/settings/ai-models:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/ai-models', authenticateToken, requireRole('admin'), async (req, res) => {
  const { summary, translation, topics, prompt, image } = req.body;
  const allowed = {
    ai_model_summary:     summary,
    ai_model_translation: translation,
    ai_model_topics:      topics,
    ai_model_prompt:      prompt,
    ai_model_image:       image,
  };
  try {
    for (const [key, value] of Object.entries(allowed)) {
      if (value !== undefined) {
        await pool.query(
          `INSERT INTO application_settings (setting_name, setting_value) VALUES ($1, $2)
           ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [key, value]
        );
      }
    }
    await loadAiModels();
    res.json({ message: 'AI model settings updated.', current: getAiModels() });
  } catch (err) {
    console.error(`[ERROR] PUT /api/settings/ai-models:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================

router.get('/blacklist', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT url FROM url_blacklist ORDER BY created_at');
    res.json(result.rows.map(r => r.url));
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - GET /api/settings/blacklist - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/blacklist', authenticateToken, requireRole('admin'), async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required.' });
  try {
    await pool.query('INSERT INTO url_blacklist (url) VALUES ($1)', [url.trim()]);
    await loadUrlBlacklist();
    const count = (await pool.query('SELECT COUNT(*) FROM url_blacklist')).rows[0].count;
    res.json({ message: 'URL added to blacklist.', count: parseInt(count) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'URL already blacklisted.' });
    console.error(`[ERROR] ${new Date().toISOString()} - POST /api/settings/blacklist - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/blacklist', authenticateToken, requireRole('admin'), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required.' });
  try {
    const result = await pool.query('DELETE FROM url_blacklist WHERE url = $1', [url]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'URL not found in blacklist.' });
    await loadUrlBlacklist();
    const count = (await pool.query('SELECT COUNT(*) FROM url_blacklist')).rows[0].count;
    res.json({ message: 'URL removed from blacklist.', count: parseInt(count) });
  } catch (err) {
    console.error(`[ERROR] ${new Date().toISOString()} - DELETE /api/settings/blacklist - Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
