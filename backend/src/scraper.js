// Contains the main scraping logic, including AI integration and scheduling.
require('dotenv').config({ path: './backend/.env' }); // Load environment variables from backend/.env

const Firecrawl = require('firecrawl').default; // Import Firecrawl (attempting .default)
const cron = require('node-cron'); // Import node-cron for scheduling
const { scrapeArticle: opensourceScrapeArticle, discoverArticleUrls: opensourceDiscoverSources } = require('./opensourceScraper'); // Import open-source scraper functions
const fs = require('fs').promises; // Import Node.js file system promises API
const path = require('path'); // Import Node.js path module
const { loadUrlBlacklist, getBlacklist } = require('./configLoader'); // Import from configLoader
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { createSundayEdition, generateAIImage } = require('./sundayEditionGenerator'); // Import Sunday Edition generator and AI functions

// Import centralized AI service for optimized AI operations
const aiService = require('./services/aiService');

// Import shared database pool to prevent connection exhaustion
const { pool } = require('./db');

// Import browser pool utilities for memory monitoring
const { getBrowserStatus, closeBrowser } = require('./browserPool');

// Function to sanitize HTML content
// Fixed to properly create and close JSDOM windows to prevent memory leaks
const sanitizeHtml = (htmlString) => {
  // Create a new JSDOM window for each sanitization to prevent memory leaks
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
  
  try {
    // Use DOMPurify for initial sanitization
    let sanitizedContent = DOMPurify.sanitize(htmlString, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['figure', 'link', 'br', 'span', 'div', 'tbody', 'table', 'tr'], // Forbid tags that were previously removed or flattened
      ALLOW_TAGS: ['p', 'a', 'img'], // Explicitly allow only these tags
      ALLOW_ATTR: ['href', 'rel', 'src'], // Explicitly allow only these attributes
      KEEP_CONTENT: true // Keep content of forbidden tags
    });

    // After DOMPurify, apply the whitespace normalization and paragraph creation logic
    // Replace multiple spaces with a newline, which will then be wrapped in <p> tags
    sanitizedContent = sanitizedContent.replace(/\s{2,}/g, '\n');

    // Remove all &nbsp;
    sanitizedContent = sanitizedContent.replace(/&nbsp;/g, '');

    // Split content by newlines and wrap each non-empty line in <p> tags
    let lines = sanitizedContent.split('\n').filter(line => line.trim() !== '');
    sanitizedContent = lines.map(line => `<p>${line.trim()}</p>`).join('\n');

    // Remove multiple consecutive <p> tags (should be less necessary now but good for robustness)
    sanitizedContent = sanitizedContent.replace(/<p>\s*<p>/g, '<p>');
    sanitizedContent = sanitizedContent.replace(/<\/p>\s*<\/p>/g, '</p>');

    // Remove empty tags (e.g., <p></p>)
    // This loop will run multiple times to catch nested empty tags.
    let oldContent;
    do {
      oldContent = sanitizedContent;
      // Regex to match any empty HTML tag, including those with whitespace/newlines between opening and closing tags
      sanitizedContent = sanitizedContent.replace(/<(\w+)\s*>\s*<\/\1>/gi, '');
    } while (sanitizedContent !== oldContent);

    return sanitizedContent;
  } finally {
    // CRITICAL: Close the JSDOM window to release memory
    window.close();
  }
};

// Use topic lists and translations from centralized AI service
const topicsList = aiService.TOPICS_LIST;
const topicTranslations = aiService.TOPIC_TRANSLATIONS;

// Note: Database pool is now imported from './db' to use a single shared pool
// This prevents connection exhaustion and reduces memory overhead

// Initialize Firecrawl client with API key
const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY, // Use the environment variable
});

const getActiveSources = async () => {
  try {
    // Select all columns including the new selector settings
    const result = await pool.query('SELECT * FROM sources WHERE is_active = TRUE');
    return result.rows;
  } catch (err) {
    console.error('Error fetching active sources:', err);
    return [];
  }
};

// This function will handle scraping based on the source's scraping_method
const scrapeSource = async (source) => {
  console.log(`Scraping source: ${source.name} (${source.url}) using method: ${source.scraping_method || 'firecrawl'}`);
  let scrapedResult = null;

  try {
    if (source.scraping_method === 'opensource') {
      // Use the open-source scraper
      // Note: opensourceScrapeArticle currently scrapes a single article page,
      // we might need a different function for discovering articles from a source homepage
      // For now, let's assume discoverSources will return article URLs, and scrapeArticlePage handles the individual scrape.
      // This part needs refinement based on how opensourceDiscoverSources is implemented.
      // For the purpose of demonstrating method selection, let's assume scrapeArticlePage is called later.
      console.log(`Using open-source scraper for source: ${source.name}`);
      // The actual scraping of articles from this source's page will happen in runScraper/runScraperForSource
      // after discovering article URLs.
      return; // Exit this function as article scraping is handled elsewhere for opensource
    } else { // Default to Firecrawl
      console.log(`Using Firecrawl for source: ${source.name}`);
      // Call Firecrawl scrape tool using the SDK, passing source settings
      scrapedResult = await firecrawl.scrapeUrl(source.url, {
        formats: ['markdown'], // Request markdown content
        onlyMainContent: true, // Try to get only the main article content
        // Pass source-specific selectors to Firecrawl
        includeTags: source.include_selectors ? source.include_selectors.split(',').map(s => s.trim()) : undefined,
        excludeTags: source.exclude_selectors ? source.exclude_selectors.split(',').map(s => s.trim()) : undefined,
      });

      // Check if the scrape was successful and data is available
      if (scrapedResult && scrapedResult.success && scrapedResult.markdown) {
        console.log(`Successfully scraped: ${scrapedResult.metadata?.title || 'No Title'}`);
        // Removed call to processScrapedData as this function is for discovery, not article processing
        // await processScrapedData(source, scrapedResult.markdown, scrapedResult.metadata);
      } else {
        console.error(`Failed to scrape source: ${source.name}`, scrapedResult); // Log the full result object
      }
    }

  } catch (err) {
    console.error(`Error during scraping for source ${source.name}:`, err); // Log the full error object
  }
};

// This function generates AI summaries using the centralized AI service
// Now includes caching, retry logic, and rate limiting
const generateAISummary = async (content) => {
  try {
    const summary = await aiService.generateSummary(content);
    return summary || "Summary generation failed.";
  } catch (err) {
    console.error('Error generating summary:', err);
    return "Summary generation failed.";
  }
};

// This function assigns topics using the centralized AI service
// Now includes caching, retry logic, and rate limiting
const assignTopicsWithAI = async (source, content) => {
  try {
    return await aiService.assignTopics(content);
  } catch (err) {
    console.error('Error assigning topics:', err);
    return [];
  }
};

// This function generates AI translations using the centralized AI service
// Now includes caching, retry logic, and rate limiting
const generateAITranslation = async (text, targetLanguageCode, type = 'general') => {
  try {
    return await aiService.translateText(text, targetLanguageCode, type);
  } catch (err) {
    console.error(`Error translating to ${targetLanguageCode}:`, err);
    return null;
  }
};


// This function will process the scraped data and save it to the database
const processScrapedData = async (data) => { // Accept a single data object
  const { source, content, metadata, scrapeType, enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations } = data; // Destructure data object
  console.log(`processScrapedData function started. scrapeType received: ${scrapeType}`); // Added log at the beginning
  console.log(`Processing scraped data for source: ${source.name} (Scrape Type: ${scrapeType})`);
  console.log(`processScrapedData received scrapeType: ${scrapeType}, enableGlobalAiSummary: ${enableGlobalAiSummary}, enableGlobalAiTags: ${enableGlobalAiTags}, enableGlobalAiImage: ${enableGlobalAiImage}, enableGlobalAiTranslations: ${enableGlobalAiTranslations}`); // Log received values
  let collectedTopicIds = []; // Initialize array to collect topic IDs
  try {
    if (content) {
      console.log(`Successfully processed data for ${metadata?.title || 'No Title'}`);

      const title = metadata?.title || 'No Title'; // Get title from metadata
      // Apply the new sanitizeHtml function to the content
      const raw_content = sanitizeHtml(content).replace(/Share this:.*$/, '').trim(); // Use processedContent and remove sharing text
      const source_url = metadata?.url || source.url; // Use metadata URL if available, otherwise source URL
      // Attempt to extract publication date from metadata or use current date
      let publication_date = metadata?.publication_date || metadata?.published_date;
      const now = new Date();

      if (publication_date) {
        // Check for relative date formats like "x days ago", "x hours ago", etc.
        const relativeDateMatch = publication_date.match(/^(\d+)\s+(day|hour|minute)s?\s+ago$/i);

        if (relativeDateMatch) {
          const value = parseInt(relativeDateMatch[1], 10);
          const unit = relativeDateMatch[2].toLowerCase();
          let calculatedDate = new Date(now);

          if (unit === 'day') {
            calculatedDate.setDate(now.getDate() - value);
          } else if (unit === 'hour') {
            calculatedDate.setHours(now.getHours() - value);
          } else if (unit === 'minute') {
            calculatedDate.setMinutes(now.getMinutes() - value);
          }

          publication_date = calculatedDate.toISOString();
          console.log(`Parsed relative date "${relativeDateMatch[0]}" as ${publication_date} for ${source_url}`);

        } else {
          // Attempt to parse the scraped date string if not a relative date
          try {
            const parsedDate = new Date(publication_date);
            if (!isNaN(parsedDate.getTime())) {
              publication_date = parsedDate.toISOString(); // Convert to ISO 8601 format
            } else {
              console.warn(`Could not parse date string "${publication_date}" for ${source_url}. Using current date.`);
              publication_date = now.toISOString(); // Fallback to current date if parsing fails
            }
          } catch (dateParseError) {
            console.error(`Error parsing date string "${publication_date}" for ${source_url}:`, dateParseError);
            publication_date = now.toISOString(); // Fallback to current date on error
          }
        }
      } else {
        console.warn(`No publication date found for ${source_url}. Using current date.`);
        publication_date = now.toISOString(); // Fallback to current date if no date is found
      }
      // Attempt to extract author from metadata or use a default
      const author = (metadata?.author || 'Unknown Author').replace(/•/g, ''); // Get author from metadata and sanitize
      // Attempt to extract topics/keywords from metadata
      const topics = metadata?.keywords ? metadata.keywords.split(',').map(topic => topic.trim()) : []; // Get topics from metadata


      // Determine if AI features should be enabled based on scrape type and toggles
      let shouldGenerateSummary = false;
      let shouldAssignTags = false;
      let shouldGenerateImage = false;
      let shouldGenerateTranslations = false; // New flag for translations

      if (scrapeType === 'per-source') {
        shouldGenerateSummary = source.enable_ai_summary;
        shouldAssignTags = source.enable_ai_tags;
        shouldGenerateImage = source.enable_ai_image;
        shouldGenerateTranslations = source.enable_ai_translations; // Use source-specific toggle
      } else if (scrapeType === 'global' || scrapeType === 'rescrape') { // Includes scheduled scrapes and rescrape
        shouldGenerateSummary = enableGlobalAiSummary && source.enable_ai_summary;
        shouldAssignTags = enableGlobalAiTags && source.enable_ai_tags;
        shouldGenerateImage = enableGlobalAiImage && source.enable_ai_image;
        shouldGenerateTranslations = enableGlobalAiTranslations && source.enable_ai_translations; // Use global and source-specific toggle
      }

      // Generate AI summary if enabled
      let summary = null;
      if (shouldGenerateSummary) {
        console.log('AI summary generation is enabled. Generating summary using Groq...');
        summary = await generateAISummary(raw_content);
      } else {
        console.log('AI summary generation is disabled. Skipping summary generation.');
      }

      // Generate AI image if enabled and no thumbnail exists
      let aiImagePath = null;
      // Pass the generated summary to generateAIImage
      if (shouldGenerateImage && (!metadata?.thumbnail_url || metadata.thumbnail_url.trim() === '')) {
        console.log('AI image generation is enabled and no thumbnail exists. Generating image...');
        aiImagePath = await generateAIImage(title, summary || raw_content); // Use summary if available, otherwise raw_content
        console.log(`generateAIImage returned: ${aiImagePath}`); // Log return value
      } else if (!shouldGenerateImage) {
        console.log('AI image generation is disabled. Skipping image generation.');
      } else {
        console.log('Thumbnail URL already exists. Skipping AI image generation.');
      }

      // Determine the final thumbnail URL: use AI image if generated, otherwise use scraped thumbnail
      const finalThumbnailUrl = aiImagePath || metadata?.thumbnail_url || null;

      // Generate translations for title and summary if enabled
      // OPTIMIZED: Using parallel processing for all translations
      let title_es = null;
      let summary_es = null;
      let raw_content_es = null;
      let title_ht = null;
      let summary_ht = null;
      let raw_content_ht = null;

      if (shouldGenerateTranslations) {
        console.log('AI translation generation is enabled. Generating translations in parallel...');
        
        // Use parallel batch translation for better performance
        const translationItems = [
          { text: title, targetLanguageCode: 'es', type: 'title' },
          { text: summary, targetLanguageCode: 'es', type: 'summary' },
          { text: raw_content, targetLanguageCode: 'es', type: 'raw_content' },
          { text: title, targetLanguageCode: 'ht', type: 'title' },
          { text: summary, targetLanguageCode: 'ht', type: 'summary' },
          { text: raw_content, targetLanguageCode: 'ht', type: 'raw_content' },
        ];
        
        const translations = await aiService.translateBatch(translationItems);
        
        [title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht] = translations;
        console.log('Parallel translations completed.');
      } else {
        console.log('AI translation generation is disabled. Skipping translation generation.');
      }

      // Assign topics using AI if enabled
      let assignedTopics = [];
      if (shouldAssignTags) {
        console.log('AI tag assignment is enabled. Assigning topics using Groq...');
        assignedTopics = await assignTopicsWithAI(source, raw_content);
      } else {
         console.log('AI tag assignment is disabled. Skipping topic assignment.');
      }

      // Collect translated topics for the article
      let translatedTopicsEs = [];
      let translatedTopicsHt = [];

      // Process topic translations - OPTIMIZED: Use centralized translation service with caching
      for (const topicName of assignedTopics) {
        let topicResult = await pool.query('SELECT id, name_es, name_ht FROM topics WHERE name = $1', [topicName]);
        let topicId;
        
        // Get pre-translated values from centralized service (includes caching)
        let preTranslatedEs = await aiService.getTopicTranslation(topicName, 'es');
        let preTranslatedHt = await aiService.getTopicTranslation(topicName, 'ht');

        let currentTopicEs = topicResult.rows[0]?.name_es;
        let currentTopicHt = topicResult.rows[0]?.name_ht;

        if (topicResult.rows.length === 0) {
          topicResult = await pool.query('INSERT INTO topics (name, name_es, name_ht) VALUES ($1, $2, $3) RETURNING id', [topicName, preTranslatedEs, preTranslatedHt]);
          topicId = topicResult.rows[0].id;
        } else {
          topicId = topicResult.rows[0].id;
          let updatedEs = preTranslatedEs || currentTopicEs;
          let updatedHt = preTranslatedHt || currentTopicHt;

          if (currentTopicEs !== updatedEs || currentTopicHt !== updatedHt) {
            await pool.query('UPDATE topics SET name_es = $1, name_ht = $2 WHERE id = $3', [updatedEs, updatedHt, topicId]);
          }
          preTranslatedEs = updatedEs;
          preTranslatedHt = updatedHt;
        }
        if (preTranslatedEs) translatedTopicsEs.push(preTranslatedEs);
        if (preTranslatedHt) translatedTopicsHt.push(preTranslatedHt);

        collectedTopicIds.push(topicId);
      }

      const topics_es = translatedTopicsEs.join(', ');
      const topics_ht = translatedTopicsHt.join(', ');

      // Check if article with the same URL from the same source already exists
      const existingArticle = await pool.query('SELECT id FROM articles WHERE source_id = $1 AND source_url = $2', [source.id, source_url]);

      let articleId;
      if (existingArticle.rows.length > 0) {
        // Article exists, update it
        articleId = existingArticle.rows[0].id;
        console.log(`Article with URL ${source_url} from source ${source.name} already exists. Updating.`);
        await pool.query(
          `UPDATE articles SET
            title = $1,
            author = $2,
            publication_date = $3,
            raw_content = $4,
            summary = $5,
            thumbnail_url = $6,
            ai_image_path = $7,
            title_es = $8,
            summary_es = $9,
            raw_content_es = $10,
            title_ht = $11,
            summary_ht = $12,
            raw_content_ht = $13,
            topics_es = $14,
            topics_ht = $15,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $16`,
          [title, author, publication_date, raw_content, summary, finalThumbnailUrl, aiImagePath, title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht, topics_es, topics_ht, articleId]
        );
        // Remove existing topic associations and re-add them
        await pool.query('DELETE FROM article_topics WHERE article_id = $1', [articleId]);
      } else {
        // Article does not exist, insert it
        console.log(`Article with URL ${source_url} from source ${source.name} is new. Inserting.`);
        const articleResult = await pool.query(
          'INSERT INTO articles (title, source_id, source_url, author, publication_date, raw_content, summary, thumbnail_url, ai_image_path, title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht, topics_es, topics_ht) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id',
          [title, source.id, source_url, author, publication_date, raw_content, summary, finalThumbnailUrl, aiImagePath, title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht, topics_es, topics_ht]
        );
        articleId = articleResult.rows[0].id;
      }

      for (const topicId of collectedTopicIds) {
        await pool.query('INSERT INTO article_topics (article_id, topic_id) VALUES ($1, $2) ON CONFLICT (article_id, topic_id) DO NOTHING', [articleId, topicId]);
      }

      console.log(`Article "${title}" processed (ID: ${articleId}). Assigned topics: ${assignedTopics.join(', ')}. Translated topics (ES): ${topics_es}, (HT): ${topics_ht}.`);
      return true; // Indicate success
    } else {
      console.error(`Failed to process scraped data for source: ${source.name}`, content ? 'Missing content' : 'No data received');
      return false; // Indicate failure
    }
  } catch (err) {
    console.error(`Error processing scraped data for source ${source.name}:`, err);
    return false; // Indicate failure
  }
}




// Function to scrape a single article page based on source method
const scrapeArticlePage = async (source, articleUrl, scrapeType, globalSummaryToggle = undefined, enableGlobalAiTags = true, enableGlobalAiImage = true, enableGlobalAiTranslations = true, scrapeAfterDate = null) => {
  console.log(`[scrapeArticlePage] Scraping individual article page: ${articleUrl} using method: ${source.scraping_method || 'firecrawl'}`);
  console.log(`[scrapeArticlePage] Received scrapeType: ${scrapeType}, globalSummaryToggle: ${globalSummaryToggle}, enableGlobalAiTags: ${enableGlobalAiTags}, enableGlobalAiImage: ${enableGlobalAiImage}, enableGlobalAiTranslations: ${enableGlobalAiTranslations}, scrapeAfterDate: ${scrapeAfterDate}`);
  let scrapedResult = null;
  let metadata = null;
  let content = null;

  // Check if the URL is in the blacklist by checking if it starts with any blacklisted entry
  const blacklist = getBlacklist();
  const isBlacklisted = blacklist.some(blacklistedUrl => articleUrl.startsWith(blacklistedUrl));
  if (isBlacklisted) {
    console.log(`URL ${articleUrl} is in the blacklist. Skipping scraping.`);
    return null; // Skip scraping if blacklisted
  }

  try {
    if (source.scraping_method === 'opensource') {
      // Use the open-source scraper
      const opensourceData = await opensourceScrapeArticle(articleUrl, {
        title: source.os_title_selector,
        content: source.os_content_selector,
        date: source.os_date_selector, // Pass the new date selector
        author: source.os_author_selector, // Pass the new author selector
        thumbnail: source.os_thumbnail_selector, // Pass the new thumbnail selector
        topics: source.os_topics_selector, // Pass the new topics selector
        include: source.include_selectors, // Pass generic include selectors
        exclude: source.exclude_selectors, // Pass generic exclude selectors
      }, scrapeAfterDate); // Pass scrapeAfterDate to opensourceScrapeArticle

      if (opensourceData) {
        content = opensourceData.content;
        metadata = {
          title: opensourceData.title,
          url: articleUrl,
          publication_date: opensourceData.publication_date, // Get publication date from opensource scraper
          author: opensourceData.author, // Get author from opensource scraper
          thumbnail_url: opensourceData.thumbnail_url, // Get thumbnail from opensource scraper
          keywords: opensourceData.topics ? opensourceData.topics.join(',') : undefined, // Convert topics array to comma-separated string
        };
        console.log(`Successfully scraped article with opensource: ${metadata?.title || 'No Title'}`);
        console.log(`scrapeArticlePage passing scrapeType to processScrapedData: ${scrapeType}`); // Added log
        return await processScrapedData({ source, content, metadata, scrapeType, enableGlobalAiSummary: globalSummaryToggle, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }); // Pass data as an object and return its result
      } else {
        console.error(`Failed to scrape article page with opensource: ${articleUrl}`);
        return false; // Indicate failure
      }

    } else { // Default to Firecrawl
      const firecrawlResult = await firecrawl.scrapeUrl(articleUrl, {
        formats: ['markdown', 'extract'], // Request both markdown and extract
        onlyMainContent: true, // Try to get only the main article content
        includeTags: source.include_selectors ? source.include_selectors.split(',').map(s => s.trim()) : undefined,
        excludeTags: source.exclude_selectors ? source.exclude_selectors.split(',').map(s => s.trim()) : undefined,
        extract: { // Add extract configuration
          schema: {
            type: "object",
            properties: {
              title: {"type": "string"},
              url: {"type": "string"},
              publication_date: {"type": "string"}, // Use publication_date to match DB schema
              author: {"type": "string"}
            }
          },
          prompt: "Extract the article title, URL, publication date, and author from the page." // Specific prompt
        }
      });

      if (firecrawlResult && firecrawlResult.success) {
        content = firecrawlResult.markdown; // Get markdown content
        metadata = firecrawlResult.extract; // Get extracted data as metadata
        console.log(`Successfully scraped article with Firecrawl: ${metadata?.title || 'No Title'}`);
        return await processScrapedData({ source, content, metadata, scrapeType, enableGlobalAiSummary: globalSummaryToggle, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }); // Pass data as an object and return its result
      } else {
        console.error(`Failed to scrape article page with Firecrawl: ${articleUrl}`, firecrawlResult);
        return false; // Indicate failure
      }
    }
  } catch (err) {
    console.error(`Error during scraping article page ${articleUrl}:`, err);
    return false; // Indicate failure
  }
};


const runScraper = async (enableGlobalAiSummary = true, enableGlobalAiTags = true, enableGlobalAiImage = true, enableGlobalAiTranslations = true) => { // Accept global toggle states including image and translations
  console.log('Starting news scraping process...');
  await loadUrlBlacklist(); // Ensure blacklist is loaded before scraping
  const activeSources = await getActiveSources();

  let articlesAdded = 0; // Declare and initialize articlesAdded
  let linksFound = 0;     // Declare and initialize linksFound

  for (const source of activeSources) {
    console.log(`Discovering articles from source: ${source.name} (${source.url}) using method: ${source.scraping_method || 'firecrawl'}`);
    let articleUrls = [];

    try {
      if (source.scraping_method === 'opensource') {
        // Use open-source discovery (scheduled scrape limit)
        console.log(`Using open-source discovery for source: ${source.name}`);
        const discovered = await opensourceDiscoverSources(source.url, source.article_link_template, source.exclude_patterns);
        articleUrls = discovered;
        console.log(`Discovered ${articleUrls.length} potential article URLs with opensource:`, articleUrls);

         } else { // Default to Firecrawl
        console.log(`Using Firecrawl discovery for source: ${source.name}`);
        const extractedData = await firecrawl.scrapeUrl(source.url, {
          formats: ['extract'],
          extract: {
            schema: {
              type: "object",
              properties: {
                articles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: {"type": "string"},
                      url: {"type": "string"},
                      date: {"type": "string"}
                    }
                  }
                }
              }
            },
            prompt: "Extract a list of recent news article links from the page, including their title and URL."
          }
        });

        if (extractedData && extractedData.success && extractedData.extract && extractedData.extract.articles) {
          articleUrls = extractedData.extract.articles.map(article => article.url).filter(url => url); // Extract URLs and filter out nulls
          console.log(`Discovered ${articleUrls.length} potential article URLs with Firecrawl.`);
        } else {
          console.error(`Failed to extract article list from source with Firecrawl: ${source.name}`, extractedData);
        }
      }

      // Fetch existing article URLs for this source
      const existingArticlesResult = await pool.query('SELECT source_url FROM articles WHERE source_id = $1', [source.id]);
      const existingUrls = new Set(existingArticlesResult.rows.map(row => row.source_url));

      // Filter out URLs that already exist in the database
      const newArticleUrls = articleUrls.filter(url => !existingUrls.has(url));

      console.log(`Found ${articleUrls.length} potential article links, ${newArticleUrls.length} are new.`);
      linksFound = articleUrls.length; // Keep total links found for feedback

      // Scrape each new article URL
      for (const articleUrl of newArticleUrls) {
        const processed = await scrapeArticlePage(source, articleUrl, 'global', true, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations); // Pass scrape type and explicitly true for global summary toggle
        if (processed) {
          articlesAdded++;
        }
      }

    } catch (err) {
      console.error(`Error discovering articles for source ${source.name}:`, err);
    }
  }

  console.log('[scraper] News scraping process finished.');
};

// ============================================================================
// CRON JOB LOCKING - Prevents overlapping executions that cause memory spikes
// ============================================================================
let isMainScraperRunning = false;
let isMissingAiJobRunning = false;
let isSundayEditionRunning = false;

// Schedule the scraper to run periodically (e.g., every hour)
cron.schedule('0 * * * *', async () => {
  if (isMainScraperRunning) {
    console.log('[CRON] Main scraper job is already running. Skipping this execution.');
    return;
  }
  
  isMainScraperRunning = true;
  console.log('[CRON] Starting scheduled scraping job...');
  
  try {
    await runScraper();
  } catch (error) {
    console.error('[CRON] Error in scheduled scraping job:', error);
  } finally {
    isMainScraperRunning = false;
    console.log('[CRON] Scheduled scraping job completed.');
    logMemoryUsage();
  }
});

console.log('[scraper] News scraper scheduled to run hourly.');

// Schedule Sunday Edition generation (every Sunday at 00:00)
cron.schedule('0 0 * * 0', async () => {
  if (isSundayEditionRunning) {
    console.log('[CRON] Sunday Edition job is already running. Skipping this execution.');
    return;
  }
  
  isSundayEditionRunning = true;
  console.log('[CRON] Running scheduled Sunday Edition generation job...');
  
  try {
    // Fetch the Sunday Edition schedule from application_settings
    const settingsResult = await pool.query(
      `SELECT setting_value FROM application_settings WHERE setting_name = 'sunday_edition_frequency'`
    );
    const sundayEditionFrequency = settingsResult.rows[0]?.setting_value || '0 0 * * 0';
    console.log(`[CRON] Sunday Edition scheduled frequency: ${sundayEditionFrequency}`);
    await createSundayEdition();
  } catch (error) {
    console.error('[CRON] Error in Sunday Edition generation job:', error);
  } finally {
    isSundayEditionRunning = false;
    console.log('[CRON] Sunday Edition job completed.');
    logMemoryUsage();
  }
});

console.log('[scraper] Sunday Edition generation scheduled to run.');

// Schedule processing of missing AI data every 20 minutes
cron.schedule('*/20 * * * *', async () => {
  if (isMissingAiJobRunning) {
    console.log('[CRON] Missing AI data job is already running. Skipping this execution.');
    return;
  }
  
  isMissingAiJobRunning = true;
  console.log('[CRON] Running scheduled missing AI data processing job...');
  
  try {
    const activeSources = await getActiveSources();

    // Fetch scheduler settings from the database
    const settingsResult = await pool.query(
      `SELECT setting_name, setting_value FROM application_settings
       WHERE setting_name IN ('enable_scheduled_missing_summary', 'enable_scheduled_missing_tags', 'enable_scheduled_missing_image', 'enable_scheduled_missing_translations')`
    );

    const settings = settingsResult.rows.reduce((acc, row) => {
      acc[row.setting_name] = row.setting_value;
      return acc;
    }, {});

    const enableScheduledMissingSummary = settings.enable_scheduled_missing_summary !== undefined ? settings.enable_scheduled_missing_summary === 'true' : true;
    const enableScheduledMissingTags = settings.enable_scheduled_missing_tags !== undefined ? settings.enable_scheduled_missing_tags === 'true' : true;
    const enableScheduledMissingImage = settings.enable_scheduled_missing_image !== undefined ? settings.enable_scheduled_missing_image === 'true' : true;
    const enableScheduledMissingTranslations = settings.enable_scheduled_missing_translations !== undefined ? settings.enable_scheduled_missing_translations === 'true' : true;


    for (const source of activeSources) {
      console.log(`[CRON] Processing missing AI data for source: ${source.name} (ID: ${source.id})`);
      // Process missing summaries
      if (enableScheduledMissingSummary) {
        await processMissingAiForSource(source.id, 'summary');
      } else {
        console.log(`[CRON] Scheduled missing summary processing disabled for source ${source.name}.`);
      }

      // Process missing tags
      if (enableScheduledMissingTags) {
        await processMissingAiForSource(source.id, 'tags');
      } else {
        console.log(`[CRON] Scheduled missing tags processing disabled for source ${source.name}.`);
      }

      // Process missing images
      if (enableScheduledMissingImage) {
        await processMissingAiForSource(source.id, 'image');
      } else {
        console.log(`[CRON] Scheduled missing image processing disabled for source ${source.name}.`);
      }

      // Process missing translations
      if (enableScheduledMissingTranslations) {
        await processMissingAiForSource(source.id, 'translations');
      } else {
        console.log(`[CRON] Scheduled missing translations processing disabled for source ${source.name}.`);
      }
    }
  } catch (error) {
    console.error('[CRON] Error in missing AI data processing job:', error);
  } finally {
    isMissingAiJobRunning = false;
    console.log('[CRON] Finished scheduled missing AI data processing job.');
    logMemoryUsage();
  }
});

console.log('[scraper] Missing AI data processing scheduled to run every 20 minutes.');

// ============================================================================
// MEMORY MONITORING - Helps diagnose memory issues
// ============================================================================
const logMemoryUsage = () => {
  const used = process.memoryUsage();
  const browserStatus = getBrowserStatus();
  console.log(`[MEMORY] RSS: ${Math.round(used.rss / 1024 / 1024)}MB, Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)}MB, Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)}MB, External: ${Math.round(used.external / 1024 / 1024)}MB`);
  console.log(`[BROWSER] Connected: ${browserStatus.isConnected}, PID: ${browserStatus.pid || 'N/A'}`);
};

// Log memory usage every 5 minutes when not in active jobs
setInterval(() => {
  if (!isMainScraperRunning && !isMissingAiJobRunning && !isSundayEditionRunning) {
    logMemoryUsage();
  }
}, 5 * 60 * 1000);

// Export job status for monitoring
const getJobStatus = () => ({
  isMainScraperRunning,
  isMissingAiJobRunning,
  isSundayEditionRunning,
});


// Function to process AI data for a single article
const processAiForArticle = async (articleId, featureType) => { // featureType can be 'summary', 'tags', or 'image'
  console.log(`Starting AI processing for article ID: ${articleId}, feature: ${featureType}`);

  if (!featureType || !['summary', 'tags', 'image', 'translations'].includes(featureType)) {
    console.error(`Invalid featureType: ${featureType}`);
    return { success: false, message: 'Invalid featureType. Must be "summary", "tags", "image", or "translations".' };
  }

  try {
    // 1. Fetch the article
    const articleResult = await pool.query('SELECT id, title, raw_content, summary, thumbnail_url, source_id, title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht FROM articles WHERE id = $1', [articleId]);
    const article = articleResult.rows[0];

    if (!article) {
      console.error(`Article with ID ${articleId} not found.`);
      return { success: false, message: `Article with ID ${articleId} not found.` };
    }

    // 2. Fetch source configuration to check if AI is enabled for this source
    // For translations, we don't have a specific source toggle, so we'll assume it's always enabled if requested.
    // However, if you want to add a toggle for translations, you'd fetch it here.
    const sourceResult = await pool.query('SELECT enable_ai_summary, enable_ai_tags, enable_ai_image FROM sources WHERE id = $1', [article.source_id]);
    const source = sourceResult.rows[0];

    if (!source) {
       console.error(`Source with ID ${article.source_id} not found for article ${articleId}.`);
       return { success: false, message: `Source with ID ${article.source_id} not found.` };
    }

    let processed = false;
    let message = '';

    if (featureType === 'summary' && source.enable_ai_summary) {
      console.log(`Processing summary for article ID: ${article.id}`);
      const summary = await generateAISummary(article.raw_content);
      if (summary && summary !== "Summary generation failed.") {
        await pool.query('UPDATE articles SET summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [summary, article.id]);
        processed = true;
        message = 'Summary generated and saved successfully.';
      } else {
        message = 'Summary generation failed.';
      }
    } else if (featureType === 'tags' && source.enable_ai_tags) {
      console.log(`Processing tags for article ID: ${article.id}`);
      const assignedTopics = await assignTopicsWithAI(source, article.raw_content); // Pass the full source object
      if (assignedTopics && assignedTopics.length > 0) {
        // First, remove existing topics for this article to avoid duplicates
        await pool.query('DELETE FROM article_topics WHERE article_id = $1', [article.id]);

        // Collect translated topics for the article
        let translatedTopicsEs = [];
        let translatedTopicsHt = [];

        // Save assigned topics and link to article
            // OPTIMIZED: Use centralized AI service for topic translation with caching
            for (const topicName of assignedTopics) {
              let topicResult = await pool.query('SELECT id, name_es, name_ht FROM topics WHERE name = $1', [topicName]);
              let topicId;
              
              // Get translations using centralized service (includes caching)
              let preTranslatedEs = await aiService.getTopicTranslation(topicName, 'es');
              let preTranslatedHt = await aiService.getTopicTranslation(topicName, 'ht');

              let currentTopicEs = topicResult.rows[0]?.name_es;
              let currentTopicHt = topicResult.rows[0]?.name_ht;

              if (topicResult.rows.length === 0) {
                topicResult = await pool.query('INSERT INTO topics (name, name_es, name_ht) VALUES ($1, $2, $3) RETURNING id', [topicName, preTranslatedEs, preTranslatedHt]);
                topicId = topicResult.rows[0].id;
              } else {
                topicId = topicResult.rows[0].id;
                let updatedEs = preTranslatedEs || currentTopicEs;
                let updatedHt = preTranslatedHt || currentTopicHt;

                if (currentTopicEs !== updatedEs || currentTopicHt !== updatedHt) {
                  await pool.query('UPDATE topics SET name_es = $1, name_ht = $2 WHERE id = $3', [updatedEs, updatedHt, topicId]);
                }
                preTranslatedEs = updatedEs;
                preTranslatedHt = updatedHt;
              }
              if (preTranslatedEs) translatedTopicsEs.push(preTranslatedEs);
              if (preTranslatedHt) translatedTopicsHt.push(preTranslatedHt);

              await pool.query('INSERT INTO article_topics (article_id, topic_id) VALUES ($1, $2) ON CONFLICT (article_id, topic_id) DO NOTHING', [article.id, topicId]);
            }

        // Convert translated topic arrays to comma-separated strings
        const topics_es = translatedTopicsEs.join(', ');
        const topics_ht = translatedTopicsHt.join(', ');

        // Update the article with the new translated topics
        await pool.query('UPDATE articles SET topics_es = $1, topics_ht = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [topics_es, topics_ht, article.id]);

        processed = true;
        message = `Tags assigned successfully: ${assignedTopics.join(', ')}. Translated topics (ES): ${topics_es}, (HT): ${topics_ht}.`;
      } else {
        message = 'No tags assigned or tag assignment failed.';
      }
    } else if (featureType === 'image' && source.enable_ai_image) {
      console.log(`Processing image for article ID: ${article.id}`);
      let articleSummary = article.summary;

      // If summary is missing, generate it first for better image prompt
      if (!articleSummary || articleSummary.trim() === '' || articleSummary === 'Summary generation failed.') {
         console.log(`Summary missing for article ID ${article.id}. Generating summary before image.`);
         articleSummary = await generateAISummary(article.raw_content);
         // Optionally update the database with the newly generated summary here if needed
         if (articleSummary && articleSummary !== "Summary generation failed.") {
             await pool.query('UPDATE articles SET summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [articleSummary, article.id]);
         } else {
             console.warn(`Failed to generate summary for article ID ${article.id}. Cannot generate image based on summary.`);
             return { success: false, message: 'Failed to generate summary for image prompt.' };
         }
      }

      const aiImagePath = await generateAIImage(article.title, articleSummary || article.raw_content); // Use generated summary or raw content
      if (aiImagePath) {
        // Update both ai_image_path and potentially thumbnail_url if it was also null
        await pool.query('UPDATE articles SET ai_image_path = $1, thumbnail_url = COALESCE(thumbnail_url, $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2', [aiImagePath, article.id]);
        processed = true;
        message = `AI image generated and saved successfully: ${aiImagePath}.`;
      } else {
        message = 'AI image generation failed.';
      }
    } else if (featureType === 'translations') {
      console.log(`Processing translations for article ID: ${article.id}`);
      
      // OPTIMIZED: Use parallel translation batch for all missing translations
      const translationItems = [];
      const translationMeta = []; // Track which field each translation belongs to
      
      // Check which translations are missing and queue them
      if (!article.title_es && article.title) {
        translationItems.push({ text: article.title, targetLanguageCode: 'es', type: 'title' });
        translationMeta.push('title_es');
      }
      if (!article.title_ht && article.title) {
        translationItems.push({ text: article.title, targetLanguageCode: 'ht', type: 'title' });
        translationMeta.push('title_ht');
      }
      if (!article.summary_es && article.summary) {
        translationItems.push({ text: article.summary, targetLanguageCode: 'es', type: 'summary' });
        translationMeta.push('summary_es');
      }
      if (!article.summary_ht && article.summary) {
        translationItems.push({ text: article.summary, targetLanguageCode: 'ht', type: 'summary' });
        translationMeta.push('summary_ht');
      }
      if (!article.raw_content_es && article.raw_content) {
        translationItems.push({ text: article.raw_content, targetLanguageCode: 'es', type: 'raw_content' });
        translationMeta.push('raw_content_es');
      }
      if (!article.raw_content_ht && article.raw_content) {
        translationItems.push({ text: article.raw_content, targetLanguageCode: 'ht', type: 'raw_content' });
        translationMeta.push('raw_content_ht');
      }
      
      if (translationItems.length > 0) {
        console.log(`Generating ${translationItems.length} missing translations in parallel...`);
        const translations = await aiService.translateBatch(translationItems);
        
        // Build update query dynamically
        let updatedFields = [];
        let queryParams = [];
        let paramIndex = 1;
        
        translations.forEach((translation, index) => {
          if (translation) {
            updatedFields.push(`${translationMeta[index]} = $${paramIndex++}`);
            queryParams.push(translation);
          }
        });
        
        if (updatedFields.length > 0) {
          queryParams.push(article.id);
          await pool.query(`UPDATE articles SET ${updatedFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`, queryParams);
          processed = true;
          message = `Generated ${updatedFields.length} translations successfully.`;
        } else {
          message = 'Translation generation returned no results.';
        }
      } else {
        console.log(`No missing translations found for article ID ${article.id}.`);
        message = 'No missing translations found.';
      }
    } else {
      message = `AI feature '${featureType}' is disabled for source ${source.name} or feature type is invalid. No processing needed.`;
    }

    return { success: processed, message: message };

  } catch (err) {
    console.error(`Error during AI processing for article ID ${articleId}, feature ${featureType}:`, err);
    return { success: false, message: `Error processing article ${articleId}: ${err.message}` };
  }
};


// Optional: Run the scraper immediately when the script starts
// runScraper();

// Function to reprocess and update translated topics for all articles of a specific source
const reprocessTranslatedTopicsForSource = async (sourceId) => {
  console.log(`Starting re-processing of translated topics for source ID: ${sourceId}`);
  let processedCount = 0;
  let errorCount = 0;

  try {
    // Fetch all articles for the given source
    const articlesResult = await pool.query(`
      SELECT
          a.id,
          ARRAY_REMOVE(ARRAY_AGG(t.name), NULL) AS english_topics
      FROM
          articles a
      LEFT JOIN
          article_topics at ON a.id = at.article_id
      LEFT JOIN
          topics t ON at.topic_id = t.id
      WHERE
          a.source_id = $1
      GROUP BY
          a.id
    `, [sourceId]);

    const articlesToProcess = articlesResult.rows;

    console.log(`Found ${articlesToProcess.length} articles for source ID ${sourceId} to reprocess translated topics.`);

    for (const article of articlesToProcess) {
      try {
        // OPTIMIZED: Use centralized AI service for topic translation with caching
        if (article.english_topics && article.english_topics.length > 0) {
          let translatedTopicsEs = [];
          let translatedTopicsHt = [];

          for (const topicName of article.english_topics) {
            const topicResult = await pool.query('SELECT id, name_es, name_ht FROM topics WHERE name = $1', [topicName]);
            let topicId;
            let currentTopicEs = topicResult.rows[0]?.name_es;
            let currentTopicHt = topicResult.rows[0]?.name_ht;
            
            // Use centralized service for translations (includes caching)
            let preTranslatedEs = await aiService.getTopicTranslation(topicName, 'es');
            let preTranslatedHt = await aiService.getTopicTranslation(topicName, 'ht');

            if (topicResult.rows.length === 0) {
              const newTopicResult = await pool.query('INSERT INTO topics (name, name_es, name_ht) VALUES ($1, $2, $3) RETURNING id', [topicName, preTranslatedEs, preTranslatedHt]);
              topicId = newTopicResult.rows[0].id;
            } else {
              topicId = topicResult.rows[0].id;
              let updatedEs = preTranslatedEs || currentTopicEs;
              let updatedHt = preTranslatedHt || currentTopicHt;

              if (currentTopicEs !== updatedEs || currentTopicHt !== updatedHt) {
                await pool.query('UPDATE topics SET name_es = $1, name_ht = $2 WHERE id = $3', [updatedEs, updatedHt, topicId]);
              }
              preTranslatedEs = updatedEs;
              preTranslatedHt = updatedHt;
            }
            if (preTranslatedEs) translatedTopicsEs.push(preTranslatedEs);
            if (preTranslatedHt) translatedTopicsHt.push(preTranslatedHt);
          }

          const topics_es = translatedTopicsEs.join(', ');
          const topics_ht = translatedTopicsHt.join(', ');

          await pool.query('UPDATE articles SET topics_es = $1, topics_ht = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [topics_es, topics_ht, article.id]);
          processedCount++;
        } else {
          console.log(`Article ${article.id} has no English topics assigned. Skipping re-processing translated topics.`);
        }
      } catch (articleErr) {
        console.error(`Error re-processing translated topics for article ID ${article.id}:`, articleErr);
        errorCount++;
      }
    }

    const message = `Finished re-processing translated topics for source ID ${sourceId}. Processed: ${processedCount}, Errors: ${errorCount}.`;
    console.log(message);
    return { success: true, message: message, processedCount, errorCount };

  } catch (err) {
    console.error(`Error during re-processing translated topics for source ID ${sourceId}:`, err);
    return { success: false, message: `Error re-processing source ${sourceId}: ${err.message}` };
  }
};

// Function to run the scraper for a specific source
const runScraperForSource = async (sourceId, enableAiSummary, enableAiTags, enableAiImage, enableAiTranslations) => {
  console.log(`Starting scraper for single source ID: ${sourceId}`);
  await loadUrlBlacklist(); // Ensure blacklist is loaded

  try {
    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1 AND is_active = TRUE', [sourceId]);
    const source = sourceResult.rows[0];

    if (!source) {
      console.log(`Source with ID ${sourceId} not found or not active.`);
      return { success: false, message: `Source with ID ${sourceId} not found or not active.` };
    }

    console.log(`Discovering articles from source: ${source.name} (${source.url}) using method: ${source.scraping_method || 'firecrawl'}`);
    let articleUrls = [];

    if (source.scraping_method === 'opensource') {
      // Use open-source discovery (no limit for single source run)
      console.log(`Using open-source discovery for source: ${source.name}`);
      const discovered = await opensourceDiscoverSources(source.url, source.article_link_template, source.exclude_patterns);
      articleUrls = discovered;
      console.log(`Discovered ${articleUrls.length} potential article URLs with opensource:`, articleUrls);

    } else { // Default to Firecrawl
      console.log(`Using Firecrawl discovery for source: ${source.name}`);
      const extractedData = await firecrawl.scrapeUrl(source.url, {
        formats: ['extract'],
        extract: {
          schema: {
            type: "object",
            properties: {
              articles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {"type": "string"},
                    url: {"type": "string"},
                    date: {"type": "string"}
                  }
                }
              }
            }
          },
          prompt: "Extract a list of recent news article links from the page, including their title and URL."
        }
      });

      if (extractedData && extractedData.success && extractedData.extract && extractedData.extract.articles) {
        articleUrls = extractedData.extract.articles.map(article => article.url).filter(url => url); // Extract URLs and filter out nulls
        console.log(`Discovered ${articleUrls.length} potential article URLs with Firecrawl.`);
      } else {
        console.error(`Failed to extract article list from source with Firecrawl: ${source.name}`, extractedData);
      }
    }

    // Fetch existing article URLs for this source
    const existingArticlesResult = await pool.query('SELECT source_url FROM articles WHERE source_id = $1', [source.id]);
    const existingUrls = new Set(existingArticlesResult.rows.map(row => row.source_url));

    // Filter out URLs that already exist in the database
    const newArticleUrls = articleUrls.filter(url => !existingUrls.has(url));

    console.log(`Found ${articleUrls.length} potential article links, ${newArticleUrls.length} are new.`);
    let articlesAdded = 0;

    // Scrape each new article URL
    for (const articleUrl of newArticleUrls) {
      const processed = await scrapeArticlePage(source, articleUrl, 'per-source', enableAiSummary, enableAiTags, enableAiImage, enableAiTranslations, source.scrape_after_date); // Pass scrape type and individual AI toggles
      if (processed) {
        articlesAdded++;
      }
    }

    const message = `Scraping for source ${source.name} finished. Discovered ${articleUrls.length} links, added ${articlesAdded} new articles.`;
    console.log(message);
    return { success: true, message: message, articlesAdded, linksFound: articleUrls.length };

  } catch (err) {
    console.error(`Error running scraper for source ID ${sourceId}:`, err);
    return { success: false, message: `Error running scraper for source ID ${sourceId}: ${err.message}` };
  }
};

// Function to process missing AI data for a specific source
const processMissingAiForSource = async (sourceId, featureType) => {
  console.log(`Starting processing of missing AI data for source ID: ${sourceId}, feature: ${featureType}`);
  let processedCount = 0;
  let errorCount = 0;

  try {
    const sourceResult = await pool.query('SELECT enable_ai_summary, enable_ai_tags, enable_ai_image, enable_ai_translations FROM sources WHERE id = $1', [sourceId]);
    const source = sourceResult.rows[0];

    if (!source) {
      console.error(`Source with ID ${sourceId} not found.`);
      return { success: false, message: `Source with ID ${sourceId} not found.` };
    }

    let articlesToProcessQuery = `
      SELECT id, title, raw_content, summary, thumbnail_url, source_id, title_es, summary_es, raw_content_es, title_ht, summary_ht, raw_content_ht
      FROM articles
      WHERE source_id = $1
    `;
    let queryParams = [sourceId];

    if (featureType === 'summary' && source.enable_ai_summary) {
      articlesToProcessQuery += ` AND (summary IS NULL OR summary = '' OR summary = 'Summary generation failed.')`;
    } else if (featureType === 'tags' && source.enable_ai_tags) {
      // Select articles that don't have any associated topics
      articlesToProcessQuery += ` AND NOT EXISTS (SELECT 1 FROM article_topics WHERE article_id = articles.id)`;
    } else if (featureType === 'image' && source.enable_ai_image) {
      articlesToProcessQuery += ` AND (ai_image_path IS NULL OR ai_image_path = '') AND (thumbnail_url IS NULL OR thumbnail_url = '')`;
    } else if (featureType === 'translations' && source.enable_ai_translations) {
      articlesToProcessQuery += ` AND (title_es IS NULL OR summary_es IS NULL OR raw_content_es IS NULL OR title_ht IS NULL OR summary_ht IS NULL OR raw_content_ht IS NULL)`;
    } else {
      console.log(`AI feature '${featureType}' is disabled for source ${source.name} or feature type is invalid. Skipping processing.`);
      return { success: true, message: `AI feature '${featureType}' is disabled for source ${source.name} or feature type is invalid.`, processedCount: 0, errorCount: 0 };
    }

    const articlesResult = await pool.query(articlesToProcessQuery, queryParams);
    const articles = articlesResult.rows;

    console.log(`Found ${articles.length} articles with missing ${featureType} for source ID ${sourceId}.`);

    for (const article of articles) {
      try {
        const result = await processAiForArticle(article.id, featureType);
        if (result.success) {
          processedCount++;
        } else {
          errorCount++;
          console.error(`Failed to process ${featureType} for article ID ${article.id}: ${result.message}`);
        }
      } catch (articleErr) {
        console.error(`Error processing ${featureType} for article ID ${article.id}:`, articleErr);
        errorCount++;
      }
    }

    const message = `Finished processing missing ${featureType} for source ID ${sourceId}. Processed: ${processedCount}, Errors: ${errorCount}.`;
    console.log(message);
    return { success: true, message: message, processedCount, errorCount };

  } catch (err) {
    console.error(`Error during processing missing AI data for source ID ${sourceId}, feature ${featureType}:`, err);
    return { success: false, message: `Error processing missing AI data for source ID ${sourceId}: ${err.message}` };
  }
};

// Function to re-scrape all articles for a specific source
const rescrapeSourceArticles = async (sourceId) => {
  console.log(`[rescrapeSourceArticles] Starting re-scraping of all articles for source ID: ${sourceId}`);
  let articlesRescraped = 0;
  let errorCount = 0;
  let totalArticles = 0;

  try {
    const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1 AND is_active = TRUE', [sourceId]);
    const source = sourceResult.rows[0];

    if (!source) {
      const message = `Source with ID ${sourceId} not found or not active.`;
      console.log(`[rescrapeSourceArticles] ${message}`);
      return { success: false, message: message };
    }

    // Fetch all articles associated with this source
    const articlesToRescrapeResult = await pool.query('SELECT id, title, source_url FROM articles WHERE source_id = $1', [sourceId]);
    const articlesToRescrape = articlesToRescrapeResult.rows;
    totalArticles = articlesToRescrape.length;

    console.log(`[rescrapeSourceArticles] Found ${totalArticles} articles for source ID ${sourceId} to re-scrape.`);

    for (const article of articlesToRescrape) {
      try {
        console.log(`[rescrapeSourceArticles] Re-scraping article: "${article.title}" (ID: ${article.id}) from URL: ${article.source_url}`);
        const processed = await scrapeArticlePage(
          source,
          article.source_url,
          'rescrape', // Use 'rescrape' type to ensure update logic is triggered
          source.enable_ai_summary,
          source.enable_ai_tags,
          source.enable_ai_image,
          source.enable_ai_translations,
          source.scrape_after_date
        );
        if (processed) {
          articlesRescraped++;
          const message = `Successfully re-scraped article: "${article.title}" (ID: ${article.id}).`;
          console.log(`[rescrapeSourceArticles] ${message}`);
        } else {
          errorCount++;
          const message = `Failed to re-scrape article: "${article.title}" (ID: ${article.id}).`;
          console.error(`[rescrapeSourceArticles] ${message}`);
        }
      } catch (articleErr) {
        errorCount++;
        const message = `Error re-scraping article ID ${article.id} from URL ${article.source_url}: ${articleErr.message}`;
        console.error(`[rescrapeSourceArticles] ${message}`, articleErr);
      }
    }

    const finalMessage = `Finished re-scraping for source ID ${sourceId}. Articles re-scraped: ${articlesRescraped}, Errors: ${errorCount}.`;
    console.log(`[rescrapeSourceArticles] ${finalMessage}`);
    return { success: true, message: finalMessage, articlesRescraped, errorCount };

  } catch (err) {
    const errorMessage = `Error during re-scraping for source ID ${sourceId}: ${err.message}`;
    console.error(`[rescrapeSourceArticles] ${errorMessage}`, err);
    return { success: false, message: errorMessage };
  }
};

// Export the runScraper function if you want to trigger it manually or from another script
module.exports = {
  runScraper,
  runScraperForSource, // Export the new function
  processMissingAiForSource, // Export the new function for processing missing AI data
  reprocessTranslatedTopicsForSource, // Export the new function for re-processing translated topics
  processAiForArticle, // Export the function to process AI data for a single article
  rescrapeSourceArticles, // Export the new rescrape function
  scrapeArticlePage, // Export scrapeArticlePage
};
