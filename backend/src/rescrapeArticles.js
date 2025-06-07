require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');
const { rescrapeSourceArticles, scrapeArticlePage } = require('./scraper');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: process.env.DB_PORT
});

const main = async () => {
  const args = process.argv.slice(2); // Get arguments after 'node script.js'

  if (args.length === 0) {
    console.log('Usage: node rescrapeArticles.js [-a <articleId> | -s <sourceId> | --all]');
    process.exit(0);
  }

  const articleIdIndex = args.indexOf('-a');
  const sourceIdIndex = args.indexOf('-s');
  const allFlagIndex = args.indexOf('--all');

  try {
    if (articleIdIndex !== -1) {
      const articleId = parseInt(args[articleIdIndex + 1]);
      if (isNaN(articleId)) {
        console.error('Error: Please provide a valid article ID with -a.');
        process.exit(1);
      }
      console.log(`Attempting to re-scrape article with ID: ${articleId}`);

      const articleResult = await pool.query('SELECT source_id, source_url FROM articles WHERE id = $1', [articleId]);
      if (articleResult.rows.length === 0) {
        console.error(`Error: Article with ID ${articleId} not found.`);
        process.exit(1);
      }
      const { source_id, source_url } = articleResult.rows[0];

      const sourceResult = await pool.query('SELECT * FROM sources WHERE id = $1', [source_id]);
      if (sourceResult.rows.length === 0) {
        console.error(`Error: Source with ID ${source_id} not found for article ${articleId}.`);
        process.exit(1);
      }
      const source = sourceResult.rows[0];

      // Create a dummy response object for logging
      const dummyRes = {
        write: (data) => {
          try {
            const parsedData = JSON.parse(data.replace('data: ', ''));
            console.log(`[Scraper Log] ${parsedData.message}`);
          } catch (e) {
            console.log(`[Scraper Raw Log] ${data.trim()}`);
          }
        }
      };

      console.log(`Starting detailed re-scrape for article ID: ${articleId} from source ID: ${source_id}`);
      const result = await scrapeArticlePage(
        source,
        source_url,
        'rescrape',
        source.enable_ai_summary,
        source.enable_ai_tags,
        source.enable_ai_image,
        source.enable_ai_translations,
        source.scrape_after_date,
        dummyRes // Pass the dummy response object
      );

      if (result && result.success) {
        console.log(`Successfully re-scraped article ID ${articleId}.`);
      } else {
        console.error(`Failed to re-scrape article ID ${articleId}. Message: ${result ? result.message : 'Unknown error'}`);
      }

    } else if (sourceIdIndex !== -1) {
      const sourceId = parseInt(args[sourceIdIndex + 1]);
      if (isNaN(sourceId)) {
        console.error('Error: Please provide a valid source ID with -s.');
        process.exit(1);
      }
      console.log(`Attempting to re-scrape articles for source ID: ${sourceId}`);

      // Create a dummy response object for logging
      const dummyRes = {
        write: (data) => {
          try {
            const parsedData = JSON.parse(data.replace('data: ', ''));
            console.log(`[Scraper Log] ${parsedData.message}`);
          } catch (e) {
            console.log(`[Scraper Raw Log] ${data.trim()}`);
          }
        }
      };

      const result = await rescrapeSourceArticles(sourceId, dummyRes);
      console.log(`Re-scraping for source ID ${sourceId} completed. ${result.message}`);

    } else if (allFlagIndex !== -1) {
      console.log('Attempting to re-scrape all articles from all active sources.');
      const activeSourcesResult = await pool.query('SELECT id FROM sources WHERE is_active = TRUE');
      const activeSourceIds = activeSourcesResult.rows.map(row => row.id);

      // Create a dummy response object for logging
      const dummyRes = {
        write: (data) => {
          try {
            const parsedData = JSON.parse(data.replace('data: ', ''));
            console.log(`[Scraper Log] ${parsedData.message}`);
          } catch (e) {
            console.log(`[Scraper Raw Log] ${data.trim()}`);
          }
        }
      };

      for (const sourceId of activeSourceIds) {
        console.log(`\n--- Starting re-scraping for source ID: ${sourceId} ---`);
        const result = await rescrapeSourceArticles(sourceId, dummyRes);
        console.log(`Re-scraping for source ID ${sourceId} completed. ${result.message}`);
        console.log('--------------------------------------------------');
      }
      console.log('\nFinished re-scraping all active sources.');

    } else {
      console.error('Error: Invalid arguments provided.');
      console.log('Usage: node rescrapeArticles.js [-a <articleId> | -s <sourceId> | --all]');
      process.exit(1);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  } finally {
    await pool.end(); // Close the database connection pool
  }
};

main();
