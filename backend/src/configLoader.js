const { pool } = require('./db');

// ============================================================================
// URL Blacklist
// ============================================================================

let _urlBlacklist = [];

async function loadUrlBlacklist() {
  try {
    const result = await pool.query('SELECT url FROM url_blacklist ORDER BY created_at');
    _urlBlacklist = result.rows.map(r => r.url);
    console.log(`Loaded ${_urlBlacklist.length} URLs from blacklist.`);
  } catch (error) {
    console.error('Error loading URL blacklist from DB:', error);
    _urlBlacklist = [];
  }
}

function getBlacklist() {
  return _urlBlacklist;
}

// ============================================================================
// AI Model Settings
// ============================================================================

const AI_MODEL_DEFAULTS = {
  SUMMARY:            'llama-3.3-70b-versatile',
  TRANSLATION:        'llama-3.3-70b-versatile',
  TOPICS:             'llama-3.1-8b-instant',
  PROMPT_OPTIMIZATION:'llama-3.3-70b-versatile',
  IMAGE:              'fal-ai/flux-2/turbo',
};

let _aiModels = { ...AI_MODEL_DEFAULTS };

async function loadAiModels() {
  try {
    const result = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN ('ai_model_summary','ai_model_translation','ai_model_topics','ai_model_prompt','ai_model_image')`
    );
    const rows = result.rows.reduce((acc, r) => { acc[r.setting_name] = r.setting_value; return acc; }, {});
    _aiModels = {
      SUMMARY:             rows.ai_model_summary     || AI_MODEL_DEFAULTS.SUMMARY,
      TRANSLATION:         rows.ai_model_translation || AI_MODEL_DEFAULTS.TRANSLATION,
      TOPICS:              rows.ai_model_topics       || AI_MODEL_DEFAULTS.TOPICS,
      PROMPT_OPTIMIZATION: rows.ai_model_prompt       || AI_MODEL_DEFAULTS.PROMPT_OPTIMIZATION,
      IMAGE:               rows.ai_model_image        || AI_MODEL_DEFAULTS.IMAGE,
    };
    console.log('[Config] AI models loaded:', JSON.stringify(_aiModels));
  } catch (error) {
    console.error('[Config] Error loading AI models from DB:', error);
    _aiModels = { ...AI_MODEL_DEFAULTS };
  }
}

function getAiModels() {
  return _aiModels;
}

// ============================================================================
// TTS Settings
// ============================================================================

const TTS_DEFAULTS = {
  provider:          'unreal-speech', // 'unreal-speech' | 'fal-gemini' | 'fal-minimax'
  us_voice:          'Charlotte',
  us_speed:          0,
  us_pitch:          1,
  us_bitrate:        '192k',
  fal_gemini_voice:  'Kore',
  fal_minimax_voice: 'Wise_Woman',
  fal_minimax_speed: 1,
};

let _ttsSettings = { ...TTS_DEFAULTS };

async function loadTtsSettings() {
  try {
    const result = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN (
         'tts_provider','tts_us_voice','tts_us_speed','tts_us_pitch','tts_us_bitrate',
         'tts_fal_gemini_voice','tts_fal_minimax_voice','tts_fal_minimax_speed'
       )`
    );
    const rows = result.rows.reduce((acc, r) => { acc[r.setting_name] = r.setting_value; return acc; }, {});
    _ttsSettings = {
      provider:          rows.tts_provider          || TTS_DEFAULTS.provider,
      us_voice:          rows.tts_us_voice           || TTS_DEFAULTS.us_voice,
      us_speed:          rows.tts_us_speed           != null ? parseFloat(rows.tts_us_speed) : TTS_DEFAULTS.us_speed,
      us_pitch:          rows.tts_us_pitch           != null ? parseFloat(rows.tts_us_pitch) : TTS_DEFAULTS.us_pitch,
      us_bitrate:        rows.tts_us_bitrate         || TTS_DEFAULTS.us_bitrate,
      fal_gemini_voice:  rows.tts_fal_gemini_voice   || TTS_DEFAULTS.fal_gemini_voice,
      fal_minimax_voice: rows.tts_fal_minimax_voice  || TTS_DEFAULTS.fal_minimax_voice,
      fal_minimax_speed: rows.tts_fal_minimax_speed  != null ? parseFloat(rows.tts_fal_minimax_speed) : TTS_DEFAULTS.fal_minimax_speed,
    };
    console.log('[Config] TTS settings loaded:', JSON.stringify(_ttsSettings));
  } catch (error) {
    console.error('[Config] Error loading TTS settings from DB:', error);
    _ttsSettings = { ...TTS_DEFAULTS };
  }
}

function getTtsSettings() {
  return _ttsSettings;
}

// ============================================================================
// Podcast Settings
// ============================================================================

const PODCAST_DEFAULTS = {
  format:             'monologue', // 'monologue' | 'podcast'
  host1_voice:        'Charon',
  host1_id:           'Kayo',
  host2_voice:        'Kore',
  host2_id:           'Nala',
  gemini_model:       'gemini-2.5-flash-tts',
  temperature:        1.0,
  style_instructions: 'Caribbean news podcast. Two hosts with natural, warm delivery. Kayo speaks with measured authority — smooth baritone, deliberate pacing, slight pauses before key points. Nala is brighter and animated — voice rises with excitement, quick interjections. Both speak with Caribbean English cadence. Natural conversational energy. Professional but never robotic.',
};

let _podcastSettings = { ...PODCAST_DEFAULTS };

async function loadPodcastSettings() {
  try {
    const result = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN (
         'sunday_edition_format','podcast_host1_voice','podcast_host1_id',
         'podcast_host2_voice','podcast_host2_id','podcast_gemini_model',
         'podcast_temperature','podcast_style_instructions'
       )`
    );
    const rows = result.rows.reduce((acc, r) => { acc[r.setting_name] = r.setting_value; return acc; }, {});
    _podcastSettings = {
      format:             rows.sunday_edition_format     || PODCAST_DEFAULTS.format,
      host1_voice:        rows.podcast_host1_voice       || PODCAST_DEFAULTS.host1_voice,
      host1_id:           rows.podcast_host1_id          || PODCAST_DEFAULTS.host1_id,
      host2_voice:        rows.podcast_host2_voice       || PODCAST_DEFAULTS.host2_voice,
      host2_id:           rows.podcast_host2_id          || PODCAST_DEFAULTS.host2_id,
      gemini_model:       rows.podcast_gemini_model      || PODCAST_DEFAULTS.gemini_model,
      temperature:        rows.podcast_temperature       != null ? parseFloat(rows.podcast_temperature) : PODCAST_DEFAULTS.temperature,
      style_instructions: rows.podcast_style_instructions || PODCAST_DEFAULTS.style_instructions,
    };
    console.log('[Config] Podcast settings loaded:', JSON.stringify({ ...(_podcastSettings), style_instructions: '...' }));
  } catch (error) {
    console.error('[Config] Error loading podcast settings from DB:', error);
    _podcastSettings = { ...PODCAST_DEFAULTS };
  }
}

function getPodcastSettings() {
  return _podcastSettings;
}

// ============================================================================
// Per-model Image Generation Settings
// ============================================================================

const IMAGE_SETTINGS_DEFAULTS = {
  'fal-ai/flux-2/turbo':                 { image_size: 'landscape_16_9', guidance_scale: 2.5, output_format: 'jpeg', enable_safety_checker: true },
  'fal-ai/flux-2-pro':                   { image_size: 'landscape_4_3', safety_tolerance: '2', output_format: 'jpeg' },
  'fal-ai/flux-2-flex':                  { image_size: 'landscape_4_3', guidance_scale: 3.5, num_inference_steps: 28, safety_tolerance: '2', output_format: 'jpeg' },
  'fal-ai/flux/dev':                     { image_size: 'landscape_4_3', guidance_scale: 3.5, num_inference_steps: 28, output_format: 'jpeg', enable_safety_checker: true },
  'fal-ai/flux/schnell':                 { image_size: 'landscape_4_3', num_inference_steps: 4, guidance_scale: 3.5, output_format: 'jpeg', enable_safety_checker: true },
  'fal-ai/flux-pro/v1.1':               { image_size: 'landscape_4_3', safety_tolerance: '2', output_format: 'jpeg', enhance_prompt: false },
  'fal-ai/imagen4':                      { aspect_ratio: '16:9', resolution: '1K', safety_tolerance: '4', output_format: 'png' },
  'fal-ai/nano-banana-2':               { aspect_ratio: '16:9', resolution: '1K', safety_tolerance: '4', output_format: 'png' },
  'fal-ai/gpt-image-1.5':              { image_size: '1536x1024', quality: 'high', background: 'auto', output_format: 'png' },
  'fal-ai/ideogram/v3':                 { image_size: 'landscape_16_9', style: 'REALISTIC', rendering_speed: 'BALANCED', expand_prompt: true, negative_prompt: '' },
  'fal-ai/recraft-v3':                  { image_size: 'landscape_16_9', style: 'realistic_image', enable_safety_checker: false },
  'fal-ai/recraft/v4/pro/text-to-image': { image_size: 'landscape_16_9', enable_safety_checker: true },
};

let _imageSettings = { ...IMAGE_SETTINGS_DEFAULTS };

async function loadImageSettings() {
  try {
    const result = await pool.query(
      `SELECT setting_value FROM application_settings WHERE setting_name = 'ai_image_settings'`
    );
    if (result.rows.length > 0) {
      const parsed = JSON.parse(result.rows[0].setting_value);
      // Merge: DB values override defaults, defaults fill missing models
      _imageSettings = { ...IMAGE_SETTINGS_DEFAULTS };
      for (const [model, settings] of Object.entries(parsed)) {
        _imageSettings[model] = { ...(_imageSettings[model] || {}), ...settings };
      }
    }
    console.log('[Config] Image settings loaded for', Object.keys(_imageSettings).length, 'models');
  } catch (error) {
    console.error('[Config] Error loading image settings from DB:', error);
    _imageSettings = { ...IMAGE_SETTINGS_DEFAULTS };
  }
}

function getImageSettings() {
  return _imageSettings;
}

function getImageSettingsForModel(modelId) {
  return _imageSettings[modelId] || {};
}

// ============================================================================
// AI Prompts
// ============================================================================

const PROMPT_KEYS = [
  'prompt_summary',
  'prompt_topics',
  'prompt_translation_title',
  'prompt_translation_summary',
  'prompt_translation_content',
  'prompt_translation_general',
  'prompt_image',
  'prompt_image_fallback',
  'prompt_weekly_summary',
  'prompt_weekly_podcast',
];

let _prompts = {};

async function loadPrompts() {
  try {
    const result = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings WHERE setting_name = ANY($1)`,
      [PROMPT_KEYS]
    );
    _prompts = result.rows.reduce((acc, r) => { acc[r.setting_name] = r.setting_value; return acc; }, {});
    console.log(`[Config] Loaded ${Object.keys(_prompts).length} prompts from DB`);
  } catch (error) {
    console.error('[Config] Error loading prompts from DB:', error);
    _prompts = {};
  }
}

function getPrompt(key) {
  return _prompts[key] || null;
}

function getPrompts() {
  return _prompts;
}

module.exports = {
  loadUrlBlacklist,
  getBlacklist,
  loadAiModels,
  getAiModels,
  AI_MODEL_DEFAULTS,
  loadTtsSettings,
  getTtsSettings,
  TTS_DEFAULTS,
  loadPodcastSettings,
  getPodcastSettings,
  PODCAST_DEFAULTS,
  loadImageSettings,
  getImageSettings,
  getImageSettingsForModel,
  IMAGE_SETTINGS_DEFAULTS,
  loadPrompts,
  getPrompt,
  getPrompts,
  PROMPT_KEYS,
};
