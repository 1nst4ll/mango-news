const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { scheduleScraper } = require('./scraper');
const { discoverArticleUrls, scrapeArticle } = require('./opensourceScraper'); // Import opensourceScraper functions
const { scrapeUrl: firecrawlScrapeUrl } = require('@mendable/firecrawl-js'); // Assuming firecrawl-js is used for Firecrawl scraping

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// In-memory data store (replace with a database in a real application)
let sources = [
  { id: 1, name: 'Example News', url: 'https://example.com', is_active: true, enable_ai_summary: true, include_selectors: 'article', exclude_selectors: '.ad', scraping_method: 'opensource' },
];
let nextSourceId = 2;

// Helper function to find a source by ID
const findSourceById = (id) => sources.find(source => source.id === parseInt(id));

// API Endpoints

// Get all sources
app.get('/api/sources', (req, res) => {
  // In a real application, fetch from database
  res.json(sources);
});

// Add a new source
app.post('/api/sources', (req, res) => {
  const { name, url, is_active, enable_ai_summary, include_selectors, exclude_selectors, scraping_method } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Source name and URL are required.' });
  }
  const newSource = {
    id: nextSourceId++,
    name,
    url,
    is_active: is_active !== undefined ? is_active : true,
    enable_ai_summary: enable_ai_summary !== undefined ? enable_ai_summary : true,
    include_selectors: include_selectors || null,
    exclude_selectors: exclude_selectors || null,
    scraping_method: scraping_method || 'opensource', // Default to opensource
  };
  sources.push(newSource);
  // In a real application, save to database
  res.status(201).json(newSource);
});

// Update a source
app.put('/api/sources/:id', (req, res) => {
  const sourceId = req.params.id;
  const updates = req.body;
  const sourceIndex = sources.findIndex(source => source.id === parseInt(sourceId));

  if (sourceIndex === -1) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  // Update source properties, ensuring id is not changed
  sources[sourceIndex] = {
    ...sources[sourceIndex],
    ...updates,
    id: sources[sourceIndex].id, // Ensure ID remains unchanged
  };

  // In a real application, update in database
  res.json(sources[sourceIndex]);
});

// Get all topics (placeholder)
app.get('/api/topics', (req, res) => {
  // In a real application, fetch from database or derive from articles
  const topics = [
    { id: 1, name: 'Technology' },
    { id: 2, name: 'Politics' },
    { id: 3, name: 'Sports' },
    { id: 4, name: 'Entertainment' },
  ]; // Placeholder topics as objects
  res.json(topics);
});

// Get all articles (placeholder)
app.get('/api/articles', (req, res) => {
  // In a real application, fetch from database
  const articles = []; // Placeholder for articles
  res.json(articles);
});


// Delete a source
app.delete('/api/sources/:id', (req, res) => {
  const sourceId = req.params.id;
  const initialLength = sources.length;
  sources = sources.filter(source => source.id !== parseInt(sourceId));

  if (sources.length === initialLength) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  // In a real application, delete from database
  res.status(204).send(); // No content on successful deletion
});

// Trigger scraper for a specific source
app.post('/api/scrape/run/:id', async (req, res) => {
  const sourceId = req.params.id;
  const source = findSourceById(sourceId);

  if (!source) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  try {
    // Assuming scrapeArticlePage can handle both methods internally based on source.scraping_method
    // In a real app, you might have a dedicated scraper orchestration function
    console.log(`Triggering scrape for source: ${source.name}`);
    // Placeholder for triggering the scrape logic
    // await scrapeArticlePage(source); // This function would need to be implemented or imported
    res.json({ message: `Scraping triggered for ${source.name}` });
  } catch (error) {
    console.error(`Error triggering scrape for ${source.name}:`, error);
    res.status(500).json({ error: 'Failed to trigger scrape.' });
  }
});

// Basic endpoint for source discovery (currently calls opensourceDiscoverSources)
app.get('/api/discover-sources', async (req, res) => {
  try {
    // In a real application, you might pass parameters like a starting URL
    const discovered = await discoverArticleUrls('https://example.com'); // Use opensourceDiscoverUrls
    res.json(discovered);
  } catch (error) {
    console.error('Error during source discovery:', error);
    res.status(500).json({ error: 'Failed to discover sources.' });
  }
});


// Schedule the scraper to run periodically (example: every 1 hour)
// scheduleScraper('0 * * * *'); // Uncomment and configure as needed

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log('News scraper scheduled to run.'); // This message might be misleading if scheduleScraper is commented out
});
