/**
 * Centralized AI Service Module
 * 
 * This module consolidates all AI-related functionality:
 * - Text generation (summaries, translations)
 * - Topic assignment
 * - Image prompt optimization
 * 
 * Features:
 * - Request caching to avoid redundant API calls
 * - Parallel processing for batch operations
 * - Retry logic with exponential backoff
 * - Rate limiting
 * - Centralized error handling
 */

const Groq = require('groq-sdk');

// Initialize Groq SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Model configuration - using Groq's Llama models
  // See https://console.groq.com/docs/models for available models
  MODELS: {
    SUMMARY: process.env.AI_SUMMARY_MODEL || 'openai/gpt-oss-120b',
    TRANSLATION: process.env.AI_TRANSLATION_MODEL || 'openai/gpt-oss-120b',
    TOPICS: process.env.AI_TOPICS_MODEL || 'openai/gpt-oss-120b',
    PROMPT_OPTIMIZATION: process.env.AI_PROMPT_MODEL || 'openai/gpt-oss-120b',
  },
  // Retry configuration
  MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES) || 3,
  RETRY_DELAY_MS: parseInt(process.env.AI_RETRY_DELAY) || 1000,
  // Cache configuration (24 hours default)
  CACHE_TTL_MS: parseInt(process.env.AI_CACHE_TTL) || 86400000,
  // Rate limiting
  RATE_LIMIT_PER_MINUTE: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE) || 60,
  // Content limits
  MAX_CONTENT_LENGTH: {
    SUMMARY: 10000,
    TOPICS: 5000,
    TRANSLATION_TITLE: 500,
    TRANSLATION_SUMMARY: 2000,
    TRANSLATION_CONTENT: 30000,
  },
  // Token limits
  MAX_TOKENS: {
    SUMMARY: 300,
    TOPICS: 300,
    TRANSLATION_TITLE: 100,
    TRANSLATION_SUMMARY: 200,
    TRANSLATION_CONTENT: 8192,
  }
};

// ============================================================================
// CACHING
// ============================================================================

// Simple in-memory cache for translations and topic assignments
const cache = new Map();

/**
 * Generate a cache key from input parameters
 */
const generateCacheKey = (type, ...args) => {
  return `${type}:${args.map(a => String(a).substring(0, 100)).join(':')}`;
};

/**
 * Get item from cache if not expired
 */
const getFromCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
};

/**
 * Set item in cache with TTL
 */
const setInCache = (key, value, ttlMs = CONFIG.CACHE_TTL_MS) => {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlMs
  });
};

/**
 * Clear expired cache entries (call periodically)
 */
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expiry) {
      cache.delete(key);
    }
  }
};

// Cleanup cache every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// ============================================================================
// RATE LIMITING
// ============================================================================

let requestCount = 0;
let lastResetTime = Date.now();

/**
 * Check and update rate limit
 */
const checkRateLimit = async () => {
  const now = Date.now();
  
  // Reset counter every minute
  if (now - lastResetTime >= 60000) {
    requestCount = 0;
    lastResetTime = now;
  }
  
  // If at limit, wait until next minute
  if (requestCount >= CONFIG.RATE_LIMIT_PER_MINUTE) {
    const waitTime = 60000 - (now - lastResetTime);
    console.log(`[AI Service] Rate limit reached. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    lastResetTime = Date.now();
  }
  
  requestCount++;
};

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Execute function with retry logic and exponential backoff
 */
const withRetry = async (fn, maxRetries = CONFIG.MAX_RETRIES, delayMs = CONFIG.RETRY_DELAY_MS) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[AI Service] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        console.log(`[AI Service] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};

// ============================================================================
// PREDEFINED DATA
// ============================================================================

// List of allowed topics for classification
const TOPICS_LIST = [
  "Politics", "Economy", "Business", "Technology", "Health", "Science",
  "Environment", "Education", "Sports", "Entertainment", "Culture", "Travel",
  "Crime", "Justice", "Weather", "Community", "Infrastructure", "Tourism",
  "Real Estate", "Finance", "Agriculture", "Fishing", "History", "Arts",
  "Religion", "Opinion", "Editorial", "Local News", "Regional News", "International News",
  "Sport"
];

// Pre-translated topics for consistency
const TOPIC_TRANSLATIONS = {
  "Politics": { "es": "Política", "ht": "Politik" },
  "Economy": { "es": "Economía", "ht": "Ekonomi" },
  "Business": { "es": "Negocios", "ht": "Biznis" },
  "Technology": { "es": "Tecnología", "ht": "Teknoloji" },
  "Health": { "es": "Salud", "ht": "Sante" },
  "Science": { "es": "Ciencia", "ht": "Syans" },
  "Environment": { "es": "Medio Ambiente", "ht": "Anviwònman" },
  "Education": { "es": "Educación", "ht": "Edikasyon" },
  "Sports": { "es": "Deportes", "ht": "Espò" },
  "Entertainment": { "es": "Entretenimiento", "ht": "Divètisman" },
  "Culture": { "es": "Cultura", "ht": "Kilti" },
  "Travel": { "es": "Viajes", "ht": "Vwayaj" },
  "Crime": { "es": "Crimen", "ht": "Krim" },
  "Justice": { "es": "Justicia", "ht": "Jistis" },
  "Weather": { "es": "Clima", "ht": "Tan" },
  "Community": { "es": "Comunidad", "ht": "Kominote" },
  "Infrastructure": { "es": "Infraestructura", "ht": "Enfrastrikti" },
  "Tourism": { "es": "Turismo", "ht": "Touris" },
  "Real Estate": { "es": "Bienes Raíces", "ht": "Imobilye" },
  "Finance": { "es": "Finanzas", "ht": "Finans" },
  "Agriculture": { "es": "Agricultura", "ht": "Agrikilti" },
  "Fishing": { "es": "Pesca", "ht": "Lapèch" },
  "History": { "es": "Historia", "ht": "Istwa" },
  "Arts": { "es": "Artes", "ht": "Atizay" },
  "Religion": { "es": "Religión", "ht": "Relijyon" },
  "Opinion": { "es": "Opinión", "ht": "Opinyon" },
  "Editorial": { "es": "Editorial", "ht": "Editoryal" },
  "Local News": { "es": "Noticias Locales", "ht": "Nouvèl Lokal" },
  "Regional News": { "es": "Noticias Regionales", "ht": "Nouvèl Rejyonal" },
  "International News": { "es": "Noticias Internacionales", "ht": "Nouvèl Entènasyonal" },
  "Sport": { "es": "Deporte", "ht": "Espò" }
};

// ============================================================================
// CORE AI FUNCTIONS
// ============================================================================

/**
 * Generate AI summary for article content
 * @param {string} content - Article content to summarize
 * @returns {Promise<string>} - Generated summary
 */
const generateSummary = async (content) => {
  if (!content) {
    return null;
  }
  
  console.log('[AI Service] Generating summary...');
  
  // Truncate content if too long
  const truncatedContent = content.length > CONFIG.MAX_CONTENT_LENGTH.SUMMARY
    ? content.substring(0, CONFIG.MAX_CONTENT_LENGTH.SUMMARY) + '...'
    : content;
  
  await checkRateLimit();
  
  return withRetry(async () => {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Summarize the following news article content concisely, focusing on key information and incorporating relevant keywords for SEO. Make the summary engaging to encourage clicks. Use markdown bold syntax (**text**) for key information. Ensure the summary is a maximum of 80 words and ends on a complete sentence. Do not include any links or URLs in the summary. Return only the summary text, without any introductory phrases or conversational filler."
        },
        {
          role: "user",
          content: truncatedContent,
        }
      ],
      model: CONFIG.MODELS.SUMMARY,
      temperature: 0.5,
      max_tokens: CONFIG.MAX_TOKENS.SUMMARY,
    });

    const summary = chatCompletion.choices[0]?.message?.content || null;
    
    if (!summary) {
      throw new Error('Empty response from AI');
    }
    
    console.log('[AI Service] Summary generated successfully');
    return summary;
  });
};

/**
 * Assign topics to an article using AI
 * @param {string} content - Article content to classify
 * @returns {Promise<string[]>} - Array of 3 assigned topics
 */
const assignTopics = async (content) => {
  if (!content) {
    return [];
  }
  
  console.log('[AI Service] Assigning topics...');
  
  // Truncate content if too long
  const truncatedContent = content.length > CONFIG.MAX_CONTENT_LENGTH.TOPICS
    ? content.substring(0, CONFIG.MAX_CONTENT_LENGTH.TOPICS) + '...'
    : content;
  
  await checkRateLimit();
  
  return withRetry(async () => {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Analyze the following news article content and identify the 3 most relevant topics from the provided list. Return only a comma-separated list of exactly 3 topics. The topics must be from this list: ${TOPICS_LIST.join(', ')}. Do not include any other text.`
        },
        {
          role: "user",
          content: truncatedContent,
        }
      ],
      model: CONFIG.MODELS.TOPICS,
      temperature: 0.5,
      max_tokens: CONFIG.MAX_TOKENS.TOPICS,
    });

    const assignedTopicsString = chatCompletion.choices[0]?.message?.content || "";
    const assignedTopics = assignedTopicsString
      .split(',')
      .map(topic => topic.trim())
      .filter(topic => TOPICS_LIST.includes(topic))
      .slice(0, 3);

    console.log(`[AI Service] Topics assigned: ${assignedTopics.join(', ')}`);
    return assignedTopics;
  });
};

/**
 * Translate text to target language
 * @param {string} text - Text to translate
 * @param {string} targetLanguageCode - 'es' for Spanish, 'ht' for Haitian Creole
 * @param {string} type - 'title', 'summary', 'raw_content', or 'general'
 * @returns {Promise<string|null>} - Translated text
 */
const translateText = async (text, targetLanguageCode, type = 'general') => {
  if (!text) {
    return null;
  }
  
  // Check cache first
  const cacheKey = generateCacheKey('translation', targetLanguageCode, type, text);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`[AI Service] Translation cache hit for ${type} (${targetLanguageCode})`);
    return cached;
  }
  
  console.log(`[AI Service] Translating ${type} to ${targetLanguageCode}...`);
  
  const languageName = targetLanguageCode === 'es' ? 'Spanish' : 'Haitian Creole';
  
  // Build system prompt based on type
  let systemPrompt = '';
  let maxContentLength = CONFIG.MAX_CONTENT_LENGTH.TRANSLATION_CONTENT;
  let maxTokens = CONFIG.MAX_TOKENS.TRANSLATION_CONTENT;
  
  if (type === 'title') {
    systemPrompt = `Translate the following news article title into ${languageName}. The translation must be concise, direct, and suitable as a headline. Return only the translated title, without any introductory phrases, conversational filler, or additional explanations.`;
    maxContentLength = CONFIG.MAX_CONTENT_LENGTH.TRANSLATION_TITLE;
    maxTokens = CONFIG.MAX_TOKENS.TRANSLATION_TITLE;
  } else if (type === 'summary') {
    systemPrompt = `Translate the following news article summary into ${languageName}. The translation must be a concise summary, not an expanded list of points or a full article. Make the summary engaging to encourage clicks. Use markdown bold syntax (**text**) for key information. Ensure the summary is a maximum of 80 words and ends on a complete sentence. Return only the translated summary, without any introductory phrases, conversational filler, or additional explanations.`;
    maxContentLength = CONFIG.MAX_CONTENT_LENGTH.TRANSLATION_SUMMARY;
    maxTokens = CONFIG.MAX_TOKENS.TRANSLATION_SUMMARY;
  } else if (type === 'raw_content') {
    systemPrompt = `Translate the following news article content into ${languageName}. Maintain the original formatting, including paragraphs and markdown. Ensure the translation is accurate and complete. Return only the translated content, without any introductory phrases, conversational filler, or additional explanations.`;
  } else {
    systemPrompt = `Translate the following text into ${languageName}. Return only the translated text, without any introductory phrases or conversational filler.`;
  }
  
  // Truncate if needed
  const truncatedText = text.length > maxContentLength
    ? text.substring(0, maxContentLength) + '...'
    : text;
  
  await checkRateLimit();
  
  const translation = await withRetry(async () => {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: truncatedText,
        }
      ],
      model: CONFIG.MODELS.TRANSLATION,
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const result = chatCompletion.choices[0]?.message?.content || null;
    
    if (!result) {
      throw new Error('Empty translation response');
    }
    
    return result;
  });
  
  // Cache the result
  setInCache(cacheKey, translation);
  
  console.log(`[AI Service] Translation completed for ${type} (${targetLanguageCode})`);
  return translation;
};

/**
 * Translate multiple texts in parallel
 * @param {Array<{text: string, targetLanguageCode: string, type: string}>} items - Items to translate
 * @returns {Promise<Array<string|null>>} - Array of translations
 */
const translateBatch = async (items) => {
  console.log(`[AI Service] Batch translating ${items.length} items...`);
  
  const results = await Promise.all(
    items.map(item => translateText(item.text, item.targetLanguageCode, item.type))
  );
  
  console.log(`[AI Service] Batch translation complete`);
  return results;
};

/**
 * Get topic translation (from predefined map or generate)
 * @param {string} topicName - English topic name
 * @param {string} targetLanguageCode - 'es' or 'ht'
 * @returns {Promise<string|null>} - Translated topic name
 */
const getTopicTranslation = async (topicName, targetLanguageCode) => {
  // Check predefined translations first
  if (TOPIC_TRANSLATIONS[topicName]?.[targetLanguageCode]) {
    return TOPIC_TRANSLATIONS[topicName][targetLanguageCode];
  }
  
  // Fall back to AI translation
  return translateText(topicName, targetLanguageCode, 'general');
};

/**
 * Optimize image prompt using AI
 * @param {string} instructions - Base image generation instructions
 * @param {string} summary - Article summary for context
 * @returns {Promise<string>} - Optimized prompt
 */
const optimizeImagePrompt = async (instructions, summary) => {
  if (!summary) {
    return instructions;
  }
  
  console.log('[AI Service] Optimizing image prompt...');
  
  await checkRateLimit();
  
  return withRetry(async () => {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Combine the following image generation instructions with the provided article summary to create a single, optimized prompt for an image generation AI. The optimized prompt should be concise, descriptive, and adhere to the instructions while incorporating key elements from the summary. Extract up to 5 most relevant keywords from the summary to include in the prompt. Return only the optimized prompt string, no other text.`
        },
        {
          role: "user",
          content: `Instructions: ${instructions}\nSummary: ${summary}`
        }
      ],
      model: CONFIG.MODELS.PROMPT_OPTIMIZATION,
      temperature: 0.7,
      max_tokens: 200,
    });

    return chatCompletion.choices[0]?.message?.content || instructions;
  });
};

/**
 * Generate Sunday Edition summary from weekly articles
 * @param {Array<{title: string, summary: string}>} articles - Array of article objects
 * @returns {Promise<string>} - Weekly summary
 */
const generateWeeklySummary = async (articles) => {
  console.log('[AI Service] Generating weekly summary...');
  
  const maxInputLength = 80000;
  const maxArticlesToSummarize = 30;
  
  // Build article content string
  let articleContents = '';
  let articlesProcessed = 0;
  
  for (const article of articles) {
    if (articlesProcessed >= maxArticlesToSummarize) {
      break;
    }
    
    if (article.summary && article.summary.length > 50) {
      const contentToAdd = `Title: ${article.title}\nSummary: ${article.summary}\n\n`;
      
      if ((articleContents + contentToAdd).length > maxInputLength) {
        break;
      }
      
      articleContents += contentToAdd;
      articlesProcessed++;
    }
  }
  
  if (articleContents.length === 0) {
    console.warn('[AI Service] No sufficient article content for weekly summary');
    return "No sufficient article content.";
  }
  
  await checkRateLimit();
  
  return withRetry(async () => {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `
            You are a BBC news anchor. Your task is to summarize the following news articles from the past week into a cohesive, engaging, and informative news report.
            The summary must be exactly 4250 characters long, or as close as possible to this maximum, and finish with a complete sentence. It is absolutely critical that the summary is comprehensive, highly detailed, and fully utilizes the entire 4250-character limit to provide an exhaustive report. Elaborate extensively on each important and interesting development, providing as much context and depth as possible, ensuring the output reaches the specified length.
            Maintain a professional, objective, and authoritative tone, similar to a BBC news anchor.
            Format the summary using Markdown for readability. Use paragraphs for distinct ideas, bullet points for lists, and bold text for emphasis on key phrases or names. Ensure clear sentence and paragraph breaks.
            Do not include any introductory phrases like "Here's a summary of the week's news" or conversational filler.
            Just provide the news report. Start with: "Welcome to this week's Sunday Edition. It is brought to you by mango.tc. Your one-stop shop for everything TCI!"

            Weekly Articles (summaries or truncated content):
            ${articleContents}
          `
        }
      ],
      model: CONFIG.MODELS.SUMMARY,
      temperature: 0.7,
      max_tokens: 1200,
    });

    return chatCompletion.choices[0]?.message?.content || "Summary generation failed.";
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current cache statistics
 */
const getCacheStats = () => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()).slice(0, 10), // First 10 keys for debugging
  };
};

/**
 * Clear all cached items
 */
const clearCache = () => {
  cache.clear();
  console.log('[AI Service] Cache cleared');
};

/**
 * Get rate limit status
 */
const getRateLimitStatus = () => {
  return {
    requestCount,
    limit: CONFIG.RATE_LIMIT_PER_MINUTE,
    resetIn: Math.max(0, 60000 - (Date.now() - lastResetTime)),
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core AI functions
  generateSummary,
  assignTopics,
  translateText,
  translateBatch,
  getTopicTranslation,
  optimizeImagePrompt,
  generateWeeklySummary,
  
  // Data exports
  TOPICS_LIST,
  TOPIC_TRANSLATIONS,
  
  // Utility functions
  getCacheStats,
  clearCache,
  getRateLimitStatus,
  
  // Configuration (read-only)
  CONFIG,
};