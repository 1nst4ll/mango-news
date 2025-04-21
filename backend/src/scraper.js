const { Pool } = require('pg');
const Firecrawl = require('firecrawl').default; // Import Firecrawl (attempting .default)
const cron = require('node-cron'); // Import node-cron for scheduling
const Groq = require('groq-sdk'); // Import Groq SDK

let pool;
let groq;
let firecrawl;

// This function will process the scraped data and save it to the database
async function processScrapedData(source, markdownContent, metadata) { // Updated function signature
  console.log(`Processing scraped data for source: ${source.name}`);
  try {
    if (markdownContent) {
      console.log(`Successfully processed data for ${metadata?.title || 'No Title'}`);

      // Clean up unwanted content from the markdown
      let cleanedContent = markdownContent;

      // Remove unwanted lines at the beginning
      const lines = cleanedContent.split('\n');
      const cleanedLines = lines.filter(line =>
        !line.trim().startsWith('top of page') &&
        !line.trim().startsWith('Skip to Main Content') &&
        !line.trim().startsWith('Search')
      );
      cleanedContent = cleanedLines.join('\n');

      // Remove content from "Back to Top" to the end, and the "bottom of page" line
      const backToTopRegex = /### \[Back to Top\][\s\S]*/;
      cleanedContent = cleanedContent.replace(backToTopRegex, '').trim();

      // Remove the "bottom of page" line if it still exists
      cleanedContent = cleanedContent.replace(/bottom of page\s*$/, '').trim();

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

      // Generate AI summary
      const summary = await generateAISummary(raw_content);

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
async function scrapeArticlePage(source, articleUrl) {
  console.log(`Scraping individual article page: ${articleUrl}`);
  try {
    const scrapedResult = await firecrawl.scrapeUrl(articleUrl, {
      formats: ['markdown'], // Request markdown content
      onlyMainContent: true // Try to get only the main article content
    });

    if (scrapedResult && scrapedResult.success && scrapedResult.markdown) {
      console.log(`Successfully scraped article: ${scrapedResult.metadata?.title || 'No Title'}`);
      // Pass the relevant data to processScrapedData
      await processScrapedData(source, scrapedResult.markdown, scrapedResult.metadata);
    } else {
      console.error(`Failed to scrape article page: ${articleUrl}`, scrapedResult);
    }
  } catch (err) {
    console.error(`Error during scraping article page ${articleUrl}:`, err);
  }
}


async function getActiveSources() {
  try {
    const result = await pool.query('SELECT * FROM sources WHERE is_active = TRUE');
    return result.rows;
  } catch (err) {
    console.error('Error fetching active sources:', err);
    return [];
  }
}

async function runScraper() {
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
            // Scrape each individual article page
            await scrapeArticlePage(source, article.url);
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

// Function to run the scraper for a specific source ID
async function runScraperForSource(sourceId) {
  console.log(`Starting news scraping process for source ID: ${sourceId}`);
  try {
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

if (!module.parent) {
  // This block runs only when the script is executed directly

  // Database connection pool (using the same pool as the API)
  pool = new Pool({
    user: 'hoffma24_mangoadmin',
    host: 'localhost',
    database: 'hoffma24_mangonews',
    password: 'R3d3d0ndr0N',
    port: 5432, // Default PostgreSQL port
  });

  // Initialize Groq SDK (replace with your actual API key or environment variable)
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY // Assuming API key is in environment variable
  });

  // Initialize Firecrawl client with API key
  firecrawl = new Firecrawl({
    apiKey: 'fc-58bcd9ad048d45c6aad0e90ed451a089', // Use the provided API key
  });

  // Schedule the scraper to run periodically (e.g., every hour)
  // TODO: Adjust the cron schedule as needed
  cron.schedule('0 * * * *', () => {
    console.log('Running scheduled scraping job...');
    runScraper();
  });

  console.log('News scraper scheduled to run.');
}
