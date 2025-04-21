const { Pool } = require('pg');
const Firecrawl = require('firecrawl').default; // Import Firecrawl (attempting .default)
const cron = require('node-cron'); // Import node-cron for scheduling
const Groq = require('groq-sdk'); // Import Groq SDK

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

// This function will call the Firecrawl scrape tool
async function scrapeSource(source) {
  console.log(`Scraping source: ${source.name} (${source.url})`);
  try {
    // Call Firecrawl scrape tool using the SDK, passing source settings
    const scrapedResult = await firecrawl.scrapeUrl(source.url, {
      // Removed 'params' key based on API error
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
async function processScrapedData(source, markdownContent, metadata, enableGlobalAiSummary = undefined) { // Accept global toggle state
  console.log(`Processing scraped data for source: ${source.name}`);
  try {
    if (markdownContent) {
      console.log(`Successfully processed data for ${metadata?.title || 'No Title'}`);

      // The cleaning is now handled by Firecrawl using source-specific selectors
      const cleanedContent = markdownContent; // Use the markdown directly as it should be cleaned by Firecrawl

      // Extract data from arguments
      const title = metadata?.title || 'No Title'; // Get title from metadata
      const raw_content = cleanedContent; // Use cleanedContent
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


// Function to scrape a single article page
async function scrapeArticlePage(source, articleUrl, enableGlobalAiSummary = undefined) { // Accept global toggle state
  console.log(`Scraping individual article page: ${articleUrl}`);
  try {
    // Pass source-specific selectors to Firecrawl
    const scrapedResult = await firecrawl.scrapeUrl(articleUrl, {
      formats: ['markdown'], // Request markdown content
      onlyMainContent: true, // Try to get only the main article content
      includeTags: source.include_selectors ? source.include_selectors.split(',').map(s => s.trim()) : undefined,
      excludeTags: source.exclude_selectors ? source.exclude_selectors.split(',').map(s => s.trim()) : undefined,
    });

    if (scrapedResult && scrapedResult.success && scrapedResult.markdown) {
      console.log(`Successfully scraped article: ${scrapedResult.metadata?.title || 'No Title'}`);
      // Pass the relevant data and global toggle state to processScrapedData
      await processScrapedData(source, scrapedResult.markdown, scrapedResult.metadata, enableGlobalAiSummary);
    } else {
      console.error(`Failed to scrape article page: ${articleUrl}`, scrapedResult);
    }
  } catch (err) {
    console.error(`Error during scraping article page ${articleUrl}:`, err);
  }
}


async function runScraper(enableGlobalAiSummary = undefined) { // Accept global toggle state
  console.log('Starting news scraping process...');
  const activeSources = await getActiveSources();

  for (const source of activeSources) {
    console.log(`Discovering articles from source: ${source.name} (${source.url})`);
    try {
      // Use extract format to get a list of articles from the main page
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
                    date: {"type": "string"} // Keep date for potential use, though individual scrape will get more accurate date
                  }
                }
              }
            },
          },
          prompt: "Extract a list of recent news article links from the page, including their title and URL." // Simplified prompt
        }
      });

      // Check if the extraction was successful and articles list is available
      if (extractedData && extractedData.success && extractedData.extract && extractedData.extract.articles) {
        console.log(`Found ${extractedData.extract.articles.length} potential articles from ${source.name}.`);
        for (const article of extractedData.extract.articles) { // Iterate over the correct array
          if (article.url) {
            // Scrape each individual article page, passing the global toggle state
            await scrapeArticlePage(source, article.url, enableGlobalAiSummary);
          }
        }
      } else {
        console.error(`Failed to extract article list from source: ${source.name}`, extractedData);
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
    // Select all columns including the new selector settings
    const result = await pool.query('SELECT * FROM sources WHERE id = $1 AND is_active = TRUE', [sourceId]);
    const source = result.rows[0];

    if (source) {
      console.log(`Discovering articles from source: ${source.name} (${source.url})`);
      try {
        // Use extract format to get a list of articles from the main page
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
          console.log(`Found ${extractedData.extract.articles.length} potential articles from ${source.name}.`);
          for (const article of extractedData.extract.articles) {
            if (article.url) {
              // Scrape each individual article page (global toggle is not applicable here as it's per-source trigger)
              await scrapeArticlePage(source, article.url);
            }
          }
        } else {
          console.error(`Failed to extract article list from source: ${source.name}`, extractedData);
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
