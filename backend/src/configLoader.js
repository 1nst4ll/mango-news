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

module.exports = {
  loadUrlBlacklist,
  getBlacklist,
  loadAiModels,
  getAiModels,
  AI_MODEL_DEFAULTS,
};
