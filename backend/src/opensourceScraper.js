const puppeteer = require('puppeteer');

/**
 * Scrapes a single article from a given URL using Puppeteer.
 * @param {string} url - The URL of the article to scrape.
 * @param {object} selectors - An object containing CSS selectors for title, content, etc.
 * @returns {Promise<object|null>} - A promise that resolves with the scraped article data or null if scraping fails.
 */
async function scrapeArticle(url, selectors) {
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the URL and wait for the page to load
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extract data using the provided selectors
    const articleData = await page.evaluate((selectors) => {
      const titleElement = document.querySelector(selectors.title);
      const contentElement = document.querySelector(selectors.content);
      // Add more selectors as needed (e.g., author, date, thumbnail)

      return {
        title: titleElement ? titleElement.innerText.trim() : null,
        content: contentElement ? contentElement.innerText.trim() : null,
        // Extract other fields here
      };
    }, selectors);

    return articleData;

  } catch (error) {
    console.error(`Error scraping article from ${url}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Discovers potential article URLs from a given source URL.
 * This is a basic example and would need significant enhancement for real-world use.
 * It finds links on the page that are on the same domain.
 * @param {string} sourceUrl - The URL of the source to discover articles from.
 * @returns {Promise<Array<string>>} - A promise that resolves with an array of discovered article URLs.
 */
async function discoverArticleUrls(sourceUrl) {
  let browser;
  const articleUrls = new Set();
  const visitedUrls = new Set();
  const urlsToVisit = [sourceUrl];
  const maxDepth = 1; // Limit crawling depth for discovery

  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    const sourceHostname = new URL(sourceUrl).hostname;

    while (urlsToVisit.length > 0 && visitedUrls.size < 50) { // Limit number of pages visited
      const currentUrl = urlsToVisit.shift();
      if (visitedUrls.has(currentUrl)) {
        continue;
      }

      console.log(`Visiting for discovery: ${currentUrl}`);
      visitedUrls.add(currentUrl);

      try {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

        const links = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a'));
          return anchors.map(anchor => anchor.href).filter(href => href.startsWith('http'));
        });

        for (const link of links) {
          try {
            const url = new URL(link);
            // Check if the link is on the same domain and hasn't been visited
            if (url.hostname === sourceHostname) {
              // Basic heuristic to identify potential article links
              // This needs to be more sophisticated for real-world use
              if (link.includes('/') && link.split('/').pop().length > 5) { // Example: check for path segments and length
                 articleUrls.add(link);
              }
              if (!visitedUrls.has(link) && urlsToVisit.length < 100) { // Limit queue size
                 urlsToVisit.push(link);
              }
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      } catch (e) {
        console.error(`Error visiting ${currentUrl} for discovery:`, e);
      }
    }

    return Array.from(articleUrls);

  } catch (error) {
    console.error(`Error discovering article URLs from ${sourceUrl}:`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


module.exports = {
  scrapeArticle,
  discoverArticleUrls, // Export the new discovery function
};
