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
  // Model configuration - using Groq's Llama models exclusively
  // See https://console.groq.com/docs/models for available models
  // Using llama-3.3-70b-versatile for all tasks for consistency and quality
  MODELS: {
    SUMMARY: process.env.AI_SUMMARY_MODEL || 'llama-3.3-70b-versatile',
    TRANSLATION: process.env.AI_TRANSLATION_MODEL || 'llama-3.3-70b-versatile',
    TOPICS: process.env.AI_TOPICS_MODEL || 'llama-3.1-8b-instant',
    PROMPT_OPTIMIZATION: process.env.AI_PROMPT_MODEL || 'llama-3.3-70b-versatile',
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
    IMAGE_PROMPT_SUMMARY: 2000, // Max summary length for image prompt optimization
  },
  // Token limits
  MAX_TOKENS: {
    SUMMARY: 500,
    TOPICS: 300,
    TRANSLATION_TITLE: 150,
    TRANSLATION_SUMMARY: 500,
    TRANSLATION_CONTENT: 8192,
    IMAGE_PROMPT: 300, // Increased from 200 to ensure prompt isn't truncated
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
    console.log(`[AI Service] Using model: ${CONFIG.MODELS.SUMMARY}`);
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional news editor for Mango News, a news aggregator serving the Turks and Caicos Islands (TCI). Generate a concise, SEO-optimized summary of the provided article.

Requirements:
- Length: 80-100 words (strictly enforced)
- Focus on the 5 W's: Who, What, When, Where, Why
- Lead with the most newsworthy information
- Include 2-3 relevant keywords naturally for SEO
- Use markdown bold (**text**) to highlight 1-2 key facts, names, or figures
- Write in active voice with an engaging, professional tone
- End with a complete sentence
- Do not include URLs, links, or hashtags
- Do not use AI-typical phrases like "This article discusses..." or "In summary..."

Output: Return ONLY the summary text, no preamble or explanations.`
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

    // Debug logging to understand response structure
    console.log(`[AI Service] Response received - choices count: ${chatCompletion.choices?.length || 0}`);
    if (chatCompletion.choices?.[0]) {
      console.log(`[AI Service] Choice finish_reason: ${chatCompletion.choices[0].finish_reason}`);
      console.log(`[AI Service] Message content length: ${chatCompletion.choices[0].message?.content?.length || 0}`);
    }
    
    const summary = chatCompletion.choices[0]?.message?.content || null;
    
    if (!summary) {
      console.error('[AI Service] Empty response structure:', JSON.stringify(chatCompletion, null, 2));
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
          content: `Classify the following news article into exactly 3 topics from the provided list. Analyze the main subject, secondary themes, and overall context.

Available topics: ${TOPICS_LIST.join(', ')}

Rules:
1. Select exactly 3 topics, ordered by relevance (most relevant first)
2. Topics MUST be from the provided list (exact match required)
3. If fewer than 3 topics clearly apply, select the closest relevant alternatives
4. Consider both explicit and implicit themes in the content

Output format: Return ONLY a comma-separated list of 3 topics (e.g., "Politics, Economy, Local News"). No additional text.`
        },
        {
          role: "user",
          content: truncatedContent,
        }
      ],
      model: CONFIG.MODELS.TOPICS,
      temperature: 0.3,
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
  const languageSpecificGuideline = targetLanguageCode === 'ht'
    ? '- For Haitian Creole: Use modern Kreyòl orthography. Technical terms and English loan words commonly used in Caribbean contexts may be preserved.'
    : '- For Spanish: Use Caribbean/Latin American Spanish conventions, avoiding regional terms from Spain.';
  
  // Build system prompt based on type
  let systemPrompt = '';
  let maxContentLength = CONFIG.MAX_CONTENT_LENGTH.TRANSLATION_CONTENT;
  let maxTokens = CONFIG.MAX_TOKENS.TRANSLATION_CONTENT;
  
  if (type === 'title') {
    systemPrompt = `Translate this news headline into ${languageName} for a Caribbean audience.

Guidelines:
- Keep the translation concise and punchy, suitable for a headline
- Preserve proper nouns (names of people, places, organizations) unless they have standard translations
- Maintain the urgency and news value of the original
- Avoid literal word-for-word translation; prioritize natural ${languageName} phrasing
${languageSpecificGuideline}

Output: Return ONLY the translated headline, nothing else.`;
    maxContentLength = CONFIG.MAX_CONTENT_LENGTH.TRANSLATION_TITLE;
    maxTokens = CONFIG.MAX_TOKENS.TRANSLATION_TITLE;
  } else if (type === 'summary') {
    systemPrompt = `Translate this news summary into ${languageName} for readers in the Caribbean region.

Guidelines:
- Preserve the original meaning, tone, and length
- Maintain markdown formatting (including **bold text**)
- Keep proper nouns intact unless they have established translations
- Use natural ${languageName} phrasing rather than literal translation
- End with a complete sentence
${languageSpecificGuideline}

Output: Return ONLY the translated summary, no preamble or notes.`;
    maxContentLength = CONFIG.MAX_CONTENT_LENGTH.TRANSLATION_SUMMARY;
    maxTokens = CONFIG.MAX_TOKENS.TRANSLATION_SUMMARY;
  } else if (type === 'raw_content') {
    systemPrompt = `Translate this news article content into ${languageName} for Caribbean readers.

Guidelines:
- Maintain all original formatting: paragraphs, line breaks, and markdown
- Preserve proper nouns (names, places, organizations) unless they have standard translations
- Use natural, fluent ${languageName} rather than literal translation
- Keep the same paragraph structure as the original
- Preserve any quotes as direct translations
${languageSpecificGuideline}

Output: Return ONLY the translated content, maintaining the exact structure of the original.`;
  } else {
    systemPrompt = `Translate the following text into ${languageName} for a Caribbean audience.

Guidelines:
- Use natural ${languageName} phrasing
- Preserve proper nouns unless they have standard translations
${languageSpecificGuideline}

Output: Return ONLY the translated text, nothing else.`;
  }
  
  // Truncate if needed
  const truncatedText = text.length > maxContentLength
    ? text.substring(0, maxContentLength) + '...'
    : text;
  
  await checkRateLimit();
  
  const translation = await withRetry(async () => {
    console.log(`[AI Service] Using model for translation: ${CONFIG.MODELS.TRANSLATION}`);
    
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

    // Debug logging to understand response structure
    console.log(`[AI Service] Translation response - choices count: ${chatCompletion.choices?.length || 0}`);
    if (chatCompletion.choices?.[0]) {
      console.log(`[AI Service] Translation finish_reason: ${chatCompletion.choices[0].finish_reason}`);
      console.log(`[AI Service] Translation content length: ${chatCompletion.choices[0].message?.content?.length || 0}`);
    }

    const result = chatCompletion.choices[0]?.message?.content || null;
    
    if (!result) {
      console.error('[AI Service] Empty translation response structure:', JSON.stringify(chatCompletion, null, 2));
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
 * @param {string} instructions - Base image generation instructions (style guidelines)
 * @param {string} summary - Article summary for context - THIS IS THE PRIMARY SOURCE FOR IMAGE CONTENT
 * @returns {Promise<string>} - Optimized prompt with article-specific details
 */
const optimizeImagePrompt = async (instructions, summary) => {
  if (!summary) {
    console.log('[AI Service] No summary provided for image prompt optimization. Using generic TCI scene.');
    return 'Professional news photograph of Grace Bay Beach, Turks and Caicos Islands, turquoise Caribbean waters, white sand, tropical palm trees, sunny day, photorealistic, high resolution, 16:9 aspect ratio';
  }
  
  console.log('[AI Service] Optimizing image prompt...');
  console.log(`[AI Service] Summary length for image prompt: ${summary.length} characters`);
  
  // Truncate summary if it exceeds the max length to prevent context overflow
  // This is especially important when raw_content is passed as fallback
  let truncatedSummary = summary;
  if (summary.length > CONFIG.MAX_CONTENT_LENGTH.IMAGE_PROMPT_SUMMARY) {
    truncatedSummary = summary.substring(0, CONFIG.MAX_CONTENT_LENGTH.IMAGE_PROMPT_SUMMARY);
    // Try to end at a sentence boundary for better context
    const lastSentenceEnd = Math.max(
      truncatedSummary.lastIndexOf('.'),
      truncatedSummary.lastIndexOf('!'),
      truncatedSummary.lastIndexOf('?')
    );
    if (lastSentenceEnd > CONFIG.MAX_CONTENT_LENGTH.IMAGE_PROMPT_SUMMARY * 0.7) {
      truncatedSummary = truncatedSummary.substring(0, lastSentenceEnd + 1);
    }
    console.log(`[AI Service] Summary truncated from ${summary.length} to ${truncatedSummary.length} characters for image prompt optimization`);
  }
  
  await checkRateLimit();
  
  return withRetry(async () => {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert visual journalist creating image prompts for a Caribbean news outlet. Your task is to generate a UNIQUE, ARTICLE-SPECIFIC image prompt that visually represents the news story.

CRITICAL: Each prompt must be DIFFERENT and SPECIFIC to the article content. Generic Caribbean beach scenes are NOT acceptable unless the article is specifically about beaches/tourism.

EXTRACTION PROCESS (follow strictly):
1. IDENTIFY the article's main subject: What is this story about? (person, event, building, issue, etc.)
2. EXTRACT specific visual elements mentioned: names, places, objects, actions, numbers, dates
3. DETERMINE the appropriate scene type:
   - Government/Politics: Government buildings, officials, meetings, press conferences
   - Crime/Justice: Courthouses, police, legal proceedings (NO graphic content)
   - Business/Economy: Offices, construction, storefronts, workers, currency, markets
   - Health: Hospitals, medical staff, clinics, health facilities
   - Education: Schools, classrooms, students, graduation
   - Sports: Athletes, sports facilities, competitions, trophies
   - Environment: Natural landscapes, conservation areas, weather events
   - Community: Local gatherings, cultural events, neighborhoods
   - Infrastructure: Roads, buildings under construction, utilities
   - Tourism: Hotels, attractions, visitors (ONLY if article is about tourism)

OUTPUT FORMAT:
Generate a 50-100 word prompt structured as:
[Main subject/scene], [specific details from article], [setting/location if mentioned], [relevant people if applicable - always depict Caribbean locals with dark skin tones], [lighting and mood appropriate to the news tone], photorealistic news photography, 16:9 aspect ratio

FORBIDDEN:
- Generic "beautiful Caribbean beach" unless article is about beaches
- Text, logos, watermarks
- Specific identifiable individuals' faces
- Graphic violence or disturbing imagery
- Abstract or artistic interpretations`
        },
        {
          role: "user",
          content: `Generate an image prompt for this news article:\n\n${truncatedSummary}`
        }
      ],
      model: CONFIG.MODELS.PROMPT_OPTIMIZATION,
      temperature: 0.8, // Slightly higher for more creative variety
      max_tokens: CONFIG.MAX_TOKENS.IMAGE_PROMPT,
    });

    const optimizedPrompt = chatCompletion.choices[0]?.message?.content || null;
    
    // Log if the response might have been truncated
    if (chatCompletion.choices[0]?.finish_reason === 'length') {
      console.warn('[AI Service] Image prompt optimization may have been truncated due to max_tokens limit');
    }
    
    if (!optimizedPrompt) {
      console.warn('[AI Service] Failed to generate optimized prompt, using fallback');
      return 'Professional news photograph, Caribbean setting, Turks and Caicos Islands, photorealistic, high resolution, 16:9 aspect ratio';
    }
    
    console.log(`[AI Service] Generated optimized prompt (${optimizedPrompt.length} chars): ${optimizedPrompt.substring(0, 100)}...`);
    return optimizedPrompt;
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
          role: "system",
          content: `You are the lead editor of Mango News Sunday Edition, the premiere weekly news digest for the Turks and Caicos Islands. Compile the provided weekly articles into an engaging, professional news broadcast script.

Content Structure:
1. Opening: Start with "Welcome to this week's Sunday Edition. It is brought to you by mango.tc. Your one-stop shop for everything TCI!"
2. Lead Stories: Follow with the most impactful news of the week
3. Thematic Grouping: Group related stories together with smooth transitions
4. Closing: End with a forward-looking statement or community-focused note

Style Requirements:
- Tone: Authoritative yet warm, professional but accessible to TCI residents
- Voice: Third-person, active voice throughout
- Language: Clear, broadcast-ready English optimized for text-to-speech
- Length: 4,000-4,200 characters (critical for audio generation limits)

Formatting:
- Use paragraphs to separate distinct topics
- Use **bold** for names, key figures, and important facts
- Use bullet points sparingly, only for short lists
- Include smooth transitions between topics (e.g., "In other news...", "Meanwhile...", "Turning to...")

Constraints:
- Do NOT include: URLs, hashtags, email addresses, or call-to-action phrases
- Do NOT use phrases like "This week we saw..." or "Let's take a look at..."
- Do NOT use asterisk characters (*) outside of markdown bold syntax
- MUST end with a complete sentence
- MUST stay within the character limit for audio processing`
        },
        {
          role: "user",
          content: `Weekly Articles to summarize:\n\n${articleContents}`
        }
      ],
      model: CONFIG.MODELS.SUMMARY,
      temperature: 0.6,
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