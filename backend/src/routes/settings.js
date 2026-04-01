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

// Blacklist management + AI model settings + TTS settings + Image settings
const { loadUrlBlacklist, loadAiModels, getAiModels, AI_MODEL_DEFAULTS, loadTtsSettings, getTtsSettings, TTS_DEFAULTS, loadPodcastSettings, getPodcastSettings, PODCAST_DEFAULTS, loadImageSettings, getImageSettings, IMAGE_SETTINGS_DEFAULTS, loadPrompts, getPrompts, PROMPT_KEYS } = require('../configLoader');

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
  // FLUX
  { id: 'fal-ai/flux-2/turbo',                  label: 'FLUX.2 Turbo (fast, recommended)' },
  { id: 'fal-ai/flux-2-pro',                    label: 'FLUX.2 Pro (highest quality)' },
  { id: 'fal-ai/flux-2-flex',                   label: 'FLUX.2 Flex (text rendering)' },
  { id: 'fal-ai/flux/dev',                      label: 'FLUX.1 Dev' },
  { id: 'fal-ai/flux/schnell',                  label: 'FLUX.1 Schnell (fastest)' },
  { id: 'fal-ai/flux-pro/v1.1',                 label: 'FLUX1.1 Pro' },
  // Google
  { id: 'fal-ai/imagen4',                       label: 'Google Imagen 4' },
  { id: 'fal-ai/nano-banana-2',                 label: 'Google Nano Banana 2' },
  // OpenAI
  { id: 'fal-ai/gpt-image-1.5',                 label: 'OpenAI GPT Image 1.5' },
  // Ideogram
  { id: 'fal-ai/ideogram/v3',                   label: 'Ideogram V3 (best text in image)' },
  // Recraft
  { id: 'fal-ai/recraft-v3',                    label: 'Recraft V3 (text + vector)' },
  { id: 'fal-ai/recraft/v4/pro/text-to-image',  label: 'Recraft V4 Pro (text + composition)' },
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
// Per-model Image Generation Settings
// ============================================================================

// Schema metadata for each model — drives the UI
const IMAGE_MODEL_SCHEMAS = {
  'fal-ai/flux-2/turbo': {
    label: 'FLUX.2 Turbo',
    fields: [
      { key: 'image_size',           type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'guidance_scale',       type: 'number', min: 0, max: 10, step: 0.1, label: 'Guidance Scale' },
      { key: 'output_format',        type: 'select', options: ['jpeg','png','webp'], label: 'Output Format' },
      { key: 'enable_safety_checker',type: 'boolean', label: 'Safety Checker' },
    ],
  },
  'fal-ai/flux-2-pro': {
    label: 'FLUX.2 Pro',
    fields: [
      { key: 'image_size',       type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'safety_tolerance', type: 'select', options: ['1','2','3','4','5'], label: 'Safety Tolerance (1=strict, 5=permissive)' },
      { key: 'output_format',    type: 'select', options: ['jpeg','png'], label: 'Output Format' },
    ],
  },
  'fal-ai/flux-2-flex': {
    label: 'FLUX.2 Flex',
    fields: [
      { key: 'image_size',            type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'guidance_scale',        type: 'number', min: 1.5, max: 10, step: 0.1, label: 'Guidance Scale' },
      { key: 'num_inference_steps',   type: 'number', min: 2, max: 50, step: 1, label: 'Inference Steps' },
      { key: 'safety_tolerance',      type: 'select', options: ['1','2','3','4','5'], label: 'Safety Tolerance' },
      { key: 'output_format',         type: 'select', options: ['jpeg','png'], label: 'Output Format' },
    ],
  },
  'fal-ai/flux/dev': {
    label: 'FLUX.1 Dev',
    fields: [
      { key: 'image_size',            type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'guidance_scale',        type: 'number', min: 1, max: 20, step: 0.5, label: 'Guidance Scale' },
      { key: 'num_inference_steps',   type: 'number', min: 1, max: 50, step: 1, label: 'Inference Steps' },
      { key: 'output_format',         type: 'select', options: ['jpeg','png'], label: 'Output Format' },
      { key: 'enable_safety_checker', type: 'boolean', label: 'Safety Checker' },
    ],
  },
  'fal-ai/flux/schnell': {
    label: 'FLUX.1 Schnell',
    fields: [
      { key: 'image_size',            type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'num_inference_steps',   type: 'number', min: 1, max: 50, step: 1, label: 'Inference Steps' },
      { key: 'guidance_scale',        type: 'number', min: 1, max: 20, step: 0.5, label: 'Guidance Scale' },
      { key: 'output_format',         type: 'select', options: ['jpeg','png'], label: 'Output Format' },
      { key: 'enable_safety_checker', type: 'boolean', label: 'Safety Checker' },
    ],
  },
  'fal-ai/flux-pro/v1.1': {
    label: 'FLUX Pro 1.1',
    fields: [
      { key: 'image_size',       type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'safety_tolerance', type: 'select', options: ['1','2','3','4','5','6'], label: 'Safety Tolerance' },
      { key: 'output_format',    type: 'select', options: ['jpeg','png'], label: 'Output Format' },
      { key: 'enhance_prompt',   type: 'boolean', label: 'Enhance Prompt' },
    ],
  },
  'fal-ai/imagen4': {
    label: 'Google Imagen 4',
    fields: [
      { key: 'aspect_ratio',     type: 'select', options: ['1:1','16:9','9:16','4:3','3:4'], label: 'Aspect Ratio' },
      { key: 'resolution',       type: 'select', options: ['1K','2K'], label: 'Resolution' },
      { key: 'safety_tolerance', type: 'select', options: ['1','2','3','4','5','6'], label: 'Safety Tolerance' },
      { key: 'output_format',    type: 'select', options: ['jpeg','png','webp'], label: 'Output Format' },
    ],
  },
  'fal-ai/nano-banana-2': {
    label: 'Google Nano Banana 2',
    fields: [
      { key: 'aspect_ratio',      type: 'select', options: ['auto','21:9','16:9','3:2','4:3','5:4','1:1','4:5','3:4','2:3','9:16'], label: 'Aspect Ratio' },
      { key: 'resolution',        type: 'select', options: ['0.5K','1K','2K','4K'], label: 'Resolution' },
      { key: 'safety_tolerance',  type: 'select', options: ['1','2','3','4','5','6'], label: 'Safety Tolerance' },
      { key: 'output_format',     type: 'select', options: ['jpeg','png','webp'], label: 'Output Format' },
      { key: 'thinking_level',    type: 'select', options: ['minimal','high'], label: 'Thinking Level' },
      { key: 'enable_web_search', type: 'boolean', label: 'Enable Web Search' },
    ],
  },
  'fal-ai/gpt-image-1.5': {
    label: 'OpenAI GPT Image 1.5',
    fields: [
      { key: 'image_size',    type: 'select', options: ['1024x1024','1536x1024','1024x1536'], label: 'Image Size' },
      { key: 'quality',       type: 'select', options: ['low','medium','high'], label: 'Quality' },
      { key: 'background',    type: 'select', options: ['auto','transparent','opaque'], label: 'Background' },
      { key: 'output_format', type: 'select', options: ['jpeg','png','webp'], label: 'Output Format' },
    ],
  },
  'fal-ai/ideogram/v3': {
    label: 'Ideogram V3',
    fields: [
      { key: 'image_size',      type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'style',           type: 'select', options: ['AUTO','GENERAL','REALISTIC','DESIGN'], label: 'Style' },
      { key: 'rendering_speed', type: 'select', options: ['TURBO','BALANCED','QUALITY'], label: 'Rendering Speed' },
      { key: 'negative_prompt', type: 'text', label: 'Negative Prompt' },
      { key: 'expand_prompt',   type: 'boolean', label: 'Expand Prompt' },
    ],
  },
  'fal-ai/recraft-v3': {
    label: 'Recraft V3',
    fields: [
      { key: 'image_size',           type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'style',                type: 'select', options: ['realistic_image','digital_illustration','vector_illustration','realistic_image/b_and_w','digital_illustration/pixel_art','digital_illustration/hand_drawn','digital_illustration/grain','digital_illustration/infantile_sketch','digital_illustration/2d_art_poster','digital_illustration/engraving_color','digital_illustration/logo_raster','digital_illustration/antiquarian'], label: 'Style' },
      { key: 'enable_safety_checker',type: 'boolean', label: 'Safety Checker' },
    ],
  },
  'fal-ai/recraft/v4/pro/text-to-image': {
    label: 'Recraft V4 Pro',
    fields: [
      { key: 'image_size',            type: 'select', options: ['square_hd','square','portrait_4_3','portrait_16_9','landscape_4_3','landscape_16_9'], label: 'Image Size' },
      { key: 'enable_safety_checker', type: 'boolean', label: 'Safety Checker' },
    ],
  },
};

router.get('/image-settings', authenticateToken, async (req, res) => {
  try {
    res.json({
      current: getImageSettings(),
      defaults: IMAGE_SETTINGS_DEFAULTS,
      schemas: IMAGE_MODEL_SCHEMAS,
    });
  } catch (err) {
    console.error(`[ERROR] GET /api/settings/image-settings:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/image-settings', authenticateToken, requireRole('admin'), async (req, res) => {
  // req.body: { modelId: string, settings: object }
  const { modelId, settings } = req.body;
  if (!modelId || typeof settings !== 'object') {
    return res.status(400).json({ error: 'modelId and settings are required.' });
  }
  try {
    const current = getImageSettings();
    const updated = { ...current, [modelId]: { ...(current[modelId] || {}), ...settings } };
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value) VALUES ('ai_image_settings', $1)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [JSON.stringify(updated)]
    );
    await loadImageSettings();
    res.json({ message: 'Image settings updated.', current: getImageSettings()[modelId] });
  } catch (err) {
    console.error(`[ERROR] PUT /api/settings/image-settings:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// AI Prompts
// ============================================================================

const PROMPT_META = {
  prompt_summary:              { label: 'Article Summary',          description: 'Generates the 80-100 word article summary. No template variables.' },
  prompt_topics:               { label: 'Topic Classification',     description: 'Classifies article into topics. Use {{topics_list}} for the available topics.' },
  prompt_translation_title:    { label: 'Translation — Headline',   description: 'Translates article headlines. Use {{language_name}} and {{language_guideline}}.' },
  prompt_translation_summary:  { label: 'Translation — Summary',    description: 'Translates article summaries. Use {{language_name}} and {{language_guideline}}.' },
  prompt_translation_content:  { label: 'Translation — Article Body', description: 'Translates full article content. Use {{language_name}} and {{language_guideline}}.' },
  prompt_translation_general:  { label: 'Translation — General',    description: 'Fallback translation prompt. Use {{language_name}} and {{language_guideline}}.' },
  prompt_image:                { label: 'Image Prompt Optimiser',   description: 'Creates a fal.ai image prompt from the article summary. No template variables.' },
  prompt_image_fallback:       { label: 'Image Prompt Fallback',    description: 'Used when no article summary is available. Plain text prompt, no variables.' },
  prompt_weekly_summary:       { label: 'Sunday Edition Script',    description: 'Generates the weekly broadcast script (monologue mode). No template variables.' },
  prompt_weekly_podcast:       { label: 'Podcast Script',           description: 'Generates the two-host conversational podcast script. Speaker IDs must match podcast settings.' },
};

router.get('/prompts', authenticateToken, async (req, res) => {
  try {
    res.json({ prompts: getPrompts(), meta: PROMPT_META });
  } catch (err) {
    console.error(`[ERROR] GET /api/settings/prompts:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/prompts/:key', authenticateToken, requireRole('admin'), async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (!PROMPT_KEYS.includes(key)) return res.status(400).json({ error: 'Unknown prompt key.' });
  if (typeof value !== 'string' || !value.trim()) return res.status(400).json({ error: 'value is required.' });
  try {
    await pool.query(
      `INSERT INTO application_settings (setting_name, setting_value) VALUES ($1, $2)
       ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
      [key, value]
    );
    await loadPrompts();
    res.json({ message: 'Prompt updated.', key });
  } catch (err) {
    console.error(`[ERROR] PUT /api/settings/prompts/${key}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/prompts/:key/reset', authenticateToken, requireRole('admin'), async (req, res) => {
  // Resets to the seeded default by re-running the seed value — client should store defaults locally
  // For simplicity, this endpoint is a no-op placeholder; actual reset is done via PUT with the default value
  res.status(501).json({ error: 'Use PUT /api/settings/prompts/:key with the default value to reset.' });
});

// ============================================================================
// TTS Settings
// ============================================================================

const UNREAL_SPEECH_VOICES = [
  { id: 'Charlotte', label: 'Charlotte (Female)' },
  { id: 'Dan',       label: 'Dan (Young Male)' },
  { id: 'Will',      label: 'Will (Mature Male)' },
  { id: 'Scarlett',  label: 'Scarlett (Young Female)' },
  { id: 'Liv',       label: 'Liv (Young Female)' },
  { id: 'Amy',       label: 'Amy (Mature Female)' },
];

const UNREAL_SPEECH_BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k'];

const FAL_GEMINI_VOICES = [
  'Aoede','Charon','Fenrir','Kore','Puck',
  'Achernar','Achird','Algenib','Algieba','Alnilam',
  'Autonoe','Callirrhoe','Despina','Enceladus','Erinome',
  'Gacrux','Iapetus','Laomedeia','Leda','Orus',
  'Pulcherrima','Rasalgethi','Sadachbia','Sadaltager','Schedar',
  'Sulafat','Umbriel','Vindemiatrix','Zephyr','Zubenelgenubi',
].map(v => ({ id: v, label: v }));

const FAL_MINIMAX_VOICES = [
  { id: 'Wise_Woman',       label: 'Wise Woman' },
  { id: 'Friendly_Person',  label: 'Friendly Person' },
  { id: 'Inspirational_girl', label: 'Inspirational Girl' },
  { id: 'Deep_Voice_Man',   label: 'Deep Voice Man' },
  { id: 'Calm_Woman',       label: 'Calm Woman' },
  { id: 'Casual_Guy',       label: 'Casual Guy' },
  { id: 'Lively_Girl',      label: 'Lively Girl' },
  { id: 'Patient_Man',      label: 'Patient Man' },
  { id: 'Young_Knight',     label: 'Young Knight' },
  { id: 'Determined_Man',   label: 'Determined Man' },
  { id: 'Lovely_Girl',      label: 'Lovely Girl' },
  { id: 'Decent_Boy',       label: 'Decent Boy' },
  { id: 'Imposing_Manner',  label: 'Imposing Manner' },
  { id: 'Elegant_Man',      label: 'Elegant Man' },
  { id: 'Abbess',           label: 'Abbess' },
  { id: 'Sweet_Girl_2',     label: 'Sweet Girl' },
  { id: 'Exuberant_Girl',   label: 'Exuberant Girl' },
];

router.get('/tts', authenticateToken, async (req, res) => {
  try {
    res.json({
      current: getTtsSettings(),
      defaults: TTS_DEFAULTS,
      options: {
        providers: [
          { id: 'unreal-speech', label: 'UnrealSpeech (async, webhook)' },
          { id: 'fal-gemini',    label: 'fal.ai — Gemini TTS (sync)' },
          { id: 'fal-minimax',   label: 'fal.ai — MiniMax Speech-02 HD (sync)' },
        ],
        us_voices:   UNREAL_SPEECH_VOICES,
        us_bitrates: UNREAL_SPEECH_BITRATES,
        fal_gemini_voices:  FAL_GEMINI_VOICES,
        fal_minimax_voices: FAL_MINIMAX_VOICES,
      },
    });
  } catch (err) {
    console.error(`[ERROR] GET /api/settings/tts:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/tts', authenticateToken, requireRole('admin'), async (req, res) => {
  const { provider, us_voice, us_speed, us_pitch, us_bitrate, fal_gemini_voice, fal_minimax_voice, fal_minimax_speed } = req.body;
  const updates = {
    tts_provider:          provider,
    tts_us_voice:          us_voice,
    tts_us_speed:          us_speed != null ? String(us_speed) : undefined,
    tts_us_pitch:          us_pitch != null ? String(us_pitch) : undefined,
    tts_us_bitrate:        us_bitrate,
    tts_fal_gemini_voice:  fal_gemini_voice,
    tts_fal_minimax_voice: fal_minimax_voice,
    tts_fal_minimax_speed: fal_minimax_speed != null ? String(fal_minimax_speed) : undefined,
  };
  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await pool.query(
          `INSERT INTO application_settings (setting_name, setting_value) VALUES ($1, $2)
           ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [key, value]
        );
      }
    }
    await loadTtsSettings();
    res.json({ message: 'TTS settings updated.', current: getTtsSettings() });
  } catch (err) {
    console.error(`[ERROR] PUT /api/settings/tts:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// Podcast Settings
// ============================================================================

const PODCAST_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-tts', label: 'Gemini 2.5 Flash TTS ($0.50/1M input)' },
  { id: 'gemini-2.5-pro-tts',   label: 'Gemini 2.5 Pro TTS ($1.00/1M input)' },
];

router.get('/podcast', authenticateToken, async (req, res) => {
  try {
    res.json({
      current: getPodcastSettings(),
      defaults: PODCAST_DEFAULTS,
      options: {
        formats: [
          { id: 'monologue', label: 'Single narrator (classic Sunday Edition)' },
          { id: 'podcast',   label: 'Two-host podcast (The Mango Rundown)' },
        ],
        gemini_voices: FAL_GEMINI_VOICES,
        gemini_models: PODCAST_GEMINI_MODELS,
      },
    });
  } catch (err) {
    console.error(`[ERROR] GET /api/settings/podcast:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/podcast', authenticateToken, requireRole('admin'), async (req, res) => {
  const { format, host1_voice, host1_id, host2_voice, host2_id, gemini_model, temperature, style_instructions } = req.body;
  const updates = {
    sunday_edition_format:      format,
    podcast_host1_voice:        host1_voice,
    podcast_host1_id:           host1_id,
    podcast_host2_voice:        host2_voice,
    podcast_host2_id:           host2_id,
    podcast_gemini_model:       gemini_model,
    podcast_temperature:        temperature != null ? String(temperature) : undefined,
    podcast_style_instructions: style_instructions,
  };
  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await pool.query(
          `INSERT INTO application_settings (setting_name, setting_value) VALUES ($1, $2)
           ON CONFLICT (setting_name) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [key, value]
        );
      }
    }
    await loadPodcastSettings();
    res.json({ message: 'Podcast settings updated.', current: getPodcastSettings() });
  } catch (err) {
    console.error(`[ERROR] PUT /api/settings/podcast:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============================================================================
// URL Blacklist
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
