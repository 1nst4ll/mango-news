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

module.exports = {
  loadUrlBlacklist,
  getBlacklist,
  loadAiModels,
  getAiModels,
  AI_MODEL_DEFAULTS,
  loadTtsSettings,
  getTtsSettings,
  TTS_DEFAULTS,
};
