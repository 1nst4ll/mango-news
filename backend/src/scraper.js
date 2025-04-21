const { Pool } = require('pg');
const { FirecrawlApp } = require('firecrawl'); // Import FirecrawlApp
const cron = require('node-cron'); // Import node-cron for scheduling

// Database connection pool (using the same pool as the API)
const pool = new Pool({
  user: 'hoffma24_mangoadmin',
  host: 'localhost',
  database: 'hoffma24_mangonews',
  password: 'R3d3d0ndr0N',
  port: 8081, // Changed port to 8081
});

// Initialize FirecrawlApp with API key
const firecrawl = new FirecrawlApp({
  apiKey: 'fc-58bcd9ad048d45c6aad0e90ed451a089', // Use the provided API key
});

async function getActiveSources() {
  try {
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
    // Call Firecrawl scrape tool using the SDK
    const scrapedResult = await firecrawl.scrapeUrl(source.url, {
      params: {
        formats: ['markdown'], // Request markdown content
        onlyMainContent: true // Try to get only the main article content
      }
    });

    if (scrapedResult && scrapedResult.data) {
      console.log(`Successfully scraped: ${scrapedResult.data.title || 'No Title'}`);
      await processScrapedData(source, scrapedResult.data);
    } else {
      console.error(`Failed to scrape source: ${source.name}`, scrapedResult ? scrapedResult.error : 'No result');
    }

  } catch (err) {
    console.error(`Error during scraping for source ${source.name}:`, err);
  }
}

// This function generates AI summaries using the Groq API
async function generateAISummary(content) {
  console.log('Generating AI summary using Groq...');
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Summarize the following news article content concisely."
        },
        {
          role: "user",
          content: content,
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
async function processScrapedData(source, scrapedData) {
  console.log(`Processing scraped data for source: ${source.name}`);
  try {
    if (scrapedData && scrapedData.content) {
      console.log(`Successfully scraped: ${scrapedData.title || 'No Title'}`);

      // Extract data from scrapedResult.data and metadata
      const title = scrapedData.title || scrapedData.metadata?.title || 'No Title';
      const raw_content = scrapedData.content;
      const source_url = scrapedData.url || source.url; // Use scraped URL if available, otherwise source URL
      // Attempt to extract publication date from metadata or use current date
      const publication_date = scrapedData.metadata?.publication_date || scrapedData.metadata?.published_date || new Date().toISOString();
      // Attempt to extract topics/keywords from metadata
      const topics = scrapedData.metadata?.keywords ? scrapedData.metadata.keywords.split(',').map(topic => topic.trim()) : [];


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


async function runScraper() {
  console.log('Starting news scraping process...');
  const activeSources = await getActiveSources();

  for (const source of activeSources) {
    await scrapeSource(source);
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

// Optional: Run the scraper immediately when the script starts
// runScraper();

// Export the runScraper function if you want to trigger it manually or from another script
module.exports = {
  runScraper,
};
