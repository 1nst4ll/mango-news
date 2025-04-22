const { Pool } = require('pg');
const Firecrawl = require('firecrawl').default; // Import Firecrawl (attempting .default)
const cron = require('node-cron'); // Import node-cron for scheduling
const Groq = require('groq-sdk'); // Import Groq SDK
const { scrapeArticle: opensourceScrapeArticle, discoverSources: opensourceDiscoverSources } = require('./opensourceScraper'); // Import open-source scraper functions

// Database connection pool (using the same pool as the API)
const pool = new Pool({
  user: 'hoffma24_mangoadmin',
  host: 'localhost',
  database: 'hoffma24_mangonews',
  password: 'R3d3d0ndr0N',
  port: 5432, // Default PostgreSQL port
});

// Initialize Groq SDK (replace with your actual API key or environment variable)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // Assuming API key is in environment variable
});

// Initialize Firecrawl client with API key
const firecrawl = new Firecrawl({
  apiKey: 'fc-58bcd9ad048d45c6aad0e90ed451a089', // Use the provided API key
});

async function getActiveSources() {
  try {
    // Select all columns including the new selector settings
    const result = await pool.query('SELECT * FROM sources WHERE is_active = TRUE');
    return result.rows;
  } catch (err) {
    console.error('Error fetching active sources:', err);
    return [];
  }
}

// This function will handle scraping based on the source's scraping_method
async function scrapeSource(source) {
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
        // Pass the relevant data to processScrapedData
        await processScrapedData(source, scrapedResult.markdown, scrapedResult.metadata);
      } else {
        console.error(`Failed to scrape source: ${source.name}`, scrapedResult); // Log the full result object
      }
    }

  } catch (err) {
    console.error(`Error during scraping for source ${source.name}:`, err); // Log the full error object
  }
}

// This function generates AI summaries using the Groq API
async function generateAISummary(content) {
  console.log('Generating AI summary using Groq...');
  const maxContentLength = 10000; // Define max content length to avoid hitting token limits

  // Truncate content if it's too long
  const truncatedContent = content.length > maxContentLength
    ? content.substring(0, maxContentLength) + '...' // Add ellipsis to indicate truncation
    : content;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Summarize the following news article content concisely."
        },
        {
          role: "user",
          content: truncatedContent, // Use truncated content
        }
      ],
      model: "llama-3.3-70b-versatile", // Use the specified Llama 3.3 70B model
      temperature: 0.7, // Adjust temperature as needed
      max_tokens: 150, // Adjust max tokens for summary length
    });

    return chatCompletion.choices[0]?.message?.content || "Summary generation failed.";

  } catch (llmErr) {
    console.error('Error generating AI summary with Groq:', llmErr);
    return "Summary generation failed."; // Return a default or error message
  }
}


// This function will process the scraped data and save it to the database
async function processScrapedData(source, content, metadata, enableGlobalAiSummary = undefined) { // Accept global toggle state
  console.log(`Processing scraped data for source: ${source.name}`);
  try {
    if (content) {
      console.log(`Successfully processed data for ${metadata?.title || 'No Title'}`);

      let processedContent = content;

      // Add a text cleaning step to remove lines containing only "Search"
      const lines = processedContent.split('\n');
      const linesWithoutSearch = lines.filter(line => line.trim() !== 'Search');
      processedContent = linesWithoutSearch.join('\n');

      // Extract data from arguments (assuming metadata structure is similar for both scrapers)
      const title = metadata?.title || 'No Title'; // Get title from metadata
      const raw_content = processedContent; // Use processedContent
      const source_url = metadata?.url || source.url; // Use metadata URL if available, otherwise source URL
      // Attempt to extract publication date from metadata or use current date
      const publication_date = metadata?.publication_date || metadata?.published_date || new Date().toISOString(); // Get date from metadata
      // Attempt to extract topics/keywords from metadata
      const topics = metadata?.keywords ? metadata.keywords.split(',').map(topic => topic.trim()) : []; // Get topics from metadata


      // Check if article with the same URL from the same source already exists
      const existingArticle = await pool.query('SELECT id FROM articles WHERE source_id = $1 AND source_url = $2', [source.id, source_url]);

      if (existingArticle.rows.length > 0) {
        console.log(`Article with URL ${source_url} from source ${source.name} already exists. Skipping.`);
        return; // Skip saving if article already exists
      }

      // Generate AI summary only if enabled for the source or globally
      let summary = null; // Initialize summary as null
      const shouldGenerateSummary = enableGlobalAiSummary !== undefined ? enableGlobalAiSummary : source.enable_ai_summary;

      if (shouldGenerateSummary) {
        summary = await generateAISummary(raw_content);
      }

      // Save article to database
      const articleResult = await pool.query(
        'INSERT INTO articles (title, source_id, source_url, publication_date, raw_content, summary) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [title, source.id, source_url, publication_date, raw_content, summary]
      );
      const articleId = articleResult.rows[0].id;

      // Save topics and link to article
      for (const topicName of topics) {
        let topicResult = await pool.query('SELECT id FROM topics WHERE name = $1', [topicName]);
        let topicId;
        if (topicResult.rows.length === 0) {
          // Topic doesn't exist, create it
          topicResult = await pool.query('INSERT INTO topics (name) VALUES ($1) RETURNING id', [topicName]);
          topicId = topicResult.rows[0].id;
        } else {
          topicId = topicResult.rows[0].id;
        }

        // Link article and topic
        await pool.query('INSERT INTO article_topics (article_id, topic_id) VALUES ($1, $2) ON CONFLICT (article_id, topic_id) DO NOTHING', [articleId, topicId]);
      }

      console.log(`Article "${title}" saved to database with ID: ${articleId}.`);

    } else {
      console.error(`Failed to process scraped data for source: ${source.name}`, scrapedData ? 'Missing content' : 'No data received');
    }
  } catch (err) {
    console.error(`Error processing scraped data for source ${source.name}:`, err);
  }
}


// Function to scrape a single article page based on source method
async function scrapeArticlePage(source, articleUrl, enableGlobalAiSummary = undefined) { // Accept global toggle state
  console.log(`Scraping individual article page: ${articleUrl} using method: ${source.scraping_method || 'firecrawl'}`);
  let scrapedResult = null;
  let metadata = null;
  let content = null;

  try {
    if (source.scraping_method === 'opensource') {
      // Use the open-source scraper
      const opensourceData = await opensourceScrapeArticle(articleUrl, {
        title: source.include_selectors?.split(',').map(s => s.trim())[0] || 'h1', // Basic example, needs refinement
        content: source.include_selectors?.split(',').map(s => s.trim())[1] || 'article', // Basic example, needs refinement
        // Add other selectors as needed
      });

      if (opensourceData) {
        content = opensourceData.content;
        metadata = {
          title: opensourceData.title,
          url: articleUrl,
          // Add other metadata fields if extracted by opensourceScrapeArticle
        };
        console.log(`Successfully scraped article with opensource: ${metadata?.title || 'No Title'}`);
        await processScrapedData(source, content, metadata, enableGlobalAiSummary);
      } else {
        console.error(`Failed to scrape article page with opensource: ${articleUrl}`);
      }

    } else { // Default to Firecrawl
      const firecrawlResult = await firecrawl.scrapeUrl(articleUrl, {
        formats: ['markdown'], // Request markdown content
        onlyMainContent: true, // Try to get only the main article content
        includeTags: source.include_selectors ? source.include_selectors.split(',').map(s => s.trim()) : undefined,
        excludeTags: source.exclude_selectors ? source.exclude_selectors.split(',').map(s => s.trim()) : undefined,
      });

      if (firecrawlResult && firecrawlResult.success && firecrawlResult.markdown) {
        content = firecrawlResult.markdown;
        metadata = firecrawlResult.metadata;
        console.log(`Successfully scraped article with Firecrawl: ${metadata?.title || 'No Title'}`);
        await processScrapedData(source, content, metadata, enableGlobalAiSummary);
      } else {
        console.error(`Failed to scrape article page with Firecrawl: ${articleUrl}`, firecrawlResult);
      }
    }
  } catch (err) {
    console.error(`Error during scraping article page ${articleUrl}:`, err);
  }
}


async function runScraper(enableGlobalAiSummary = undefined) { // Accept global toggle state
  console.log('Starting news scraping process...');
  const activeSources = await getActiveSources();

  for (const source of activeSources) {
    console.log(`Discovering articles from source: ${source.name} (${source.url}) using method: ${source.scraping_method || 'firecrawl'}`);
    let articleUrls = [];

    try {
      if (source.scraping_method === 'opensource') {
        // Use open-source discovery (basic example)
        console.log(`Using open-source discovery for source: ${source.name}`);
        const discovered = await opensourceDiscoverSources(source.url);
        // opensourceDiscoverSources currently returns source objects, not article URLs.
        // This needs to be adjusted in opensourceScraper.js or here.
        // For now, let's assume it returns a list of potential article URLs.
        // This part requires a proper implementation of opensourceDiscoverSources to return article links.
        // As a placeholder, let's assume it returns an array of strings (URLs).
        // TODO: Implement proper article URL discovery in opensourceDiscoverSources
        articleUrls = discovered.map(item => item.url); // Assuming it returns objects with a url field
        console.log(`Discovered ${articleUrls.length} potential article URLs with opensource.`);

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

      // Scrape each discovered article URL
      for (const articleUrl of articleUrls) {
        await scrapeArticlePage(source, articleUrl, enableGlobalAiSummary);
      }

    } catch (err) {
      console.error(`Error discovering articles for source ${source.name}:`, err);
    }
  }

  console.log('News scraping process finished.');
}

// Schedule the scraper to run periodically (e.g., every hour)
// TODO: Adjust the cron schedule as needed
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled scraping job...');
  runScraper();
});

console.log('News scraper scheduled to run.');

// Function to run the scraper for a specific source ID
async function runScraperForSource(sourceId) {
  console.log(`Starting news scraping process for source ID: ${sourceId}`);
  try {
    // Select all columns including the new selector settings and scraping_method
    const result = await pool.query('SELECT * FROM sources WHERE id = $1 AND is_active = TRUE', [sourceId]);
    const source = result.rows[0];

    if (source) {
      console.log(`Discovering articles from source: ${source.name} (${source.url}) using method: ${source.scraping_method || 'firecrawl'}`);
      let articleUrls = [];

      try {
        if (source.scraping_method === 'opensource') {
           // Use open-source discovery (basic example)
          console.log(`Using open-source discovery for source: ${source.name}`);
          const discovered = await opensourceDiscoverSources(source.url);
          // TODO: Implement proper article URL discovery in opensourceDiscoverSources
          articleUrls = discovered.map(item => item.url); // Assuming it returns objects with a url field
          console.log(`Discovered ${articleUrls.length} potential article URLs with opensource.`);

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
            articleUrls = extractedData.extract.articles.map(article => article.url).filter(url => url);
            console.log(`Discovered ${articleUrls.length} potential article URLs with Firecrawl.`);
          } else {
            console.error(`Failed to extract article list from source with Firecrawl: ${source.name}`, extractedData);
          }
        }

        // Scrape each discovered article URL
        for (const articleUrl of articleUrls) {
          // Global toggle is not applicable here as it's per-source trigger,
          // but we pass the source's own enable_ai_summary setting
          await scrapeArticlePage(source, articleUrl, source.enable_ai_summary);
        }

      } catch (err) {
        console.error(`Error discovering articles for source ${source.name}:`, err);
      }
    } else {
      console.log(`Source with ID ${sourceId} not found or is not active.`);
    }
  } catch (err) {
    console.error(`Error fetching source with ID ${sourceId}:`, err);
  }

  console.log(`News scraping process finished for source ID: ${sourceId}.`);
}


// Optional: Run the scraper immediately when the script starts
// runScraper();

// Export the runScraper function if you want to trigger it manually or from another script
module.exports = {
  runScraper,
  runScraperForSource, // Export the new function
};
