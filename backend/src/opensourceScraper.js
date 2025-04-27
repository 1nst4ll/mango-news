const puppeteer = require('puppeteer');

/**
 * Scrapes a single article from a given URL using Puppeteer with retry logic.
 * Includes detailed logging for debugging.
 * @param {string} url - The URL of the article to scrape.
 * @param {object} selectors - An object containing CSS selectors for title, content, date, author, thumbnail, and topics.
 * @param {number} [retries=3] - The number of times to retry scraping on failure.
 * @param {number} [delay=1000] - The delay in milliseconds between retries.
 * @returns {Promise<object|null>} - A promise that resolves with the scraped article data or null if scraping fails after retries.
 */
async function scrapeArticle(url, selectors, retries = 3, delay = 1000) {
  console.log(`Starting article scraping for: ${url} (Attempt ${4 - retries})`);
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true }); // Use headless mode
    const page = await browser.newPage();

    // Set a reasonable timeout for page navigation
    await page.setDefaultNavigationTimeout(30000); // 30 seconds

    console.log(`Attempting to navigate to ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log(`Successfully navigated to ${url}`);
    } catch (navError) {
      console.error(`Navigation failed for ${url}:`, navError);
      if (retries > 0) {
        console.log(`Retrying navigation for ${url} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return scrapeArticle(url, selectors, retries - 1, delay * 2); // Exponential backoff
      }
      return null; // Return null if navigation fails after retries
    }

    try {
        // Extract data using the provided selectors
        const articleData = await page.evaluate((selectors) => {
          const getText = (selector) => {
            try {
              const element = document.querySelector(selector);
              console.log(`Attempting to get text for selector: ${selector}`);
              const text = element ? element.innerText.trim() : null;
              console.log(`Text for selector ${selector}: ${text ? text.substring(0, 100) + '...' : 'null'}`);
              return text;
            } catch (e) {
              console.error(`Error getting text for selector ${selector}:`, e);
              return null;
            }
          };

          const getAttribute = (selector, attribute) => {
            try {
              const element = document.querySelector(selector);
              console.log(`Attempting to get attribute "${attribute}" for selector: ${selector}`);
              const attr = element ? element.getAttribute(attribute) : null;
              console.log(`Attribute "${attribute}" for selector ${selector}: ${attr ? attr.substring(0, 100) + '...' : 'null'}`);
              return attr;
            } catch (e) {
              console.error(`Error getting attribute ${attribute} for selector ${selector}:`, e);
              return null;
            }
          };

          const getMultipleText = (selector) => {
            try {
              const elements = document.querySelectorAll(selector);
              console.log(`Attempting to get multiple text for selector: ${selector}`);
              const texts = Array.from(elements).map(el => el.innerText.trim()).filter(text => text);
              console.log(`Multiple text for selector ${selector}: Found ${texts.length} elements`);
              return texts;
            } catch (e) {
              console.error(`Error getting multiple text for selector ${selector}:`, e);
              return [];
            }
          };

          let content = '';

          // Handle include selectors first
          if (selectors.include) {
            const includeSelectors = selectors.include.split(',').map(s => s.trim()).filter(s => s);
            console.log(`Processing include selectors: ${includeSelectors.join(', ')}`);
            includeSelectors.forEach(includeSelector => {
              try {
                document.querySelectorAll(includeSelector).forEach(el => {
                  content += el.innerText.trim() + '\n'; // Concatenate text from included elements
                });
              } catch (e) {
                 console.error(`Error processing include selector ${includeSelector}:`, e);
              }
            });
             console.log(`Content after include selectors: ${content ? content.substring(0, 200) + '...' : 'empty'}`);
          } else if (selectors.content) {
             // If no include selectors, use the main content selector
             console.log(`Processing main content selector: ${selectors.content}`);
             content = getText(selectors.content);
             console.log(`Content from main selector: ${content ? content.substring(0, 200) + '...' : 'null'}`);
          }


          // Handle exclude selectors
          if (content && selectors.exclude) {
              const excludeSelectors = selectors.exclude ? selectors.exclude.split(',').map(s => s.trim()) : [];
              console.log(`Processing exclude selectors: ${excludeSelectors.join(', ')}`);
              // Create a temporary DOM element to perform exclusions without affecting the actual page structure
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content; // Use innerHTML to parse the content as HTML

              excludeSelectors.forEach(excludeSelector => {
                try {
                  tempDiv.querySelectorAll(excludeSelector).forEach(el => {
                      if (el.parentElement) {
                          el.parentElement.removeChild(el);
                      }
                  });
                } catch (e) {
                   console.error(`Error processing exclude selector ${excludeSelector}:`, e);
                }
              });
              // Get the cleaned content from the temporary element
              content = tempDiv.innerText.trim(); // Use innerText to get the text content
              console.log(`Content after exclude selectors: ${content ? content.substring(0, 200) + '...' : 'empty'}`);
          }


          const scrapedTitle = getText(selectors.title);
          // Check if the date selector targets a meta tag
          const scrapedDate = selectors.date?.startsWith('meta[')
            ? getAttribute(selectors.date, 'content')
            : getText(selectors.date);
          const scrapedAuthor = getText(selectors.author);
          let scrapedThumbnailUrl = null;

          // Handle thumbnail extraction based on selector format
          if (selectors.thumbnail) {
            const parts = selectors.thumbnail.split('::');
            const selector = parts[0];
            const attribute = parts[1];
            const jsonKey = parts[2] || null; // Optional JSON key

            if (attribute) {
              scrapedThumbnailUrl = getAttribute(selector, attribute, jsonKey);
              // For Wix images, construct the full URL
              if (jsonKey === 'uri' && scrapedThumbnailUrl) {
                 scrapedThumbnailUrl = `https://static.wixstatic.com/media/${scrapedThumbnailUrl}`;
              }
            } else {
               // Default to getting the src attribute if only a selector is provided
               scrapedThumbnailUrl = getAttribute(selector, 'src');
            }
          }


          const scrapedTopics = getMultipleText(selectors.topics);

          // Log missing optional fields
          if (!scrapedDate) console.warn(`Missing publication date for ${window.location.href}`);
          if (!scrapedAuthor) console.warn(`Missing author for ${window.location.href}`);
          if (!scrapedThumbnailUrl) console.warn(`Missing thumbnail URL for ${window.location.href}`);
          if (scrapedTopics.length === 0) console.warn(`Missing topics for ${window.location.href}`);


          console.log('Scraped Title:', scrapedTitle); // Log scraped title
          console.log('Scraped Content (first 200 chars):', content ? content.substring(0, 200) + '...' : 'empty'); // Log scraped content

          return {
            title: scrapedTitle,
            content: content,
            publication_date: scrapedDate,
            author: scrapedAuthor,
            thumbnail_url: scrapedThumbnailUrl,
            topics: scrapedTopics,
            url: window.location.href // Get the final URL after redirects
          };
        }, selectors);

        // Basic validation of scraped data
        if (!articleData || !articleData.title || !articleData.content) {
            console.warn(`Scraped data incomplete for ${url}:`, articleData);
             if (retries > 0) {
                console.log(`Retrying scraping for ${url} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return scrapeArticle(url, selectors, retries - 1, delay * 2); // Exponential backoff
            }
            return null; // Return null if essential data is missing after retries
        }

        console.log(`Successfully scraped article from ${url}`);
        return articleData;
    } catch (evalError) {
        console.error(`Error during page evaluation for ${url}:`, evalError);
         if (retries > 0) {
            console.log(`Retrying scraping for ${url} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return scrapeArticle(url, selectors, retries - 1, delay * 2); // Exponential backoff
        }
        return null;
    }


      } catch (error) {
        console.error(`Error scraping article from ${url}:`, error);
         if (retries > 0) {
            console.log(`Retrying scraping for ${url} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return scrapeArticle(url, selectors, retries - 1, delay * 2); // Exponential backoff
        }
        return null;
      } finally {
        if (browser) {
          await browser.close();
          console.log(`Browser closed for ${url}`);
        }
      }
    }

/**
 * Discovers potential article URLs from a given source URL using a provided template.
 * This function prioritizes matching links against the articleLinkTemplate.
 * @param {string} sourceUrl - The URL of the source to discover articles from.
 * @param {string} articleLinkTemplate - The template for article links.
 * @param {string} excludePatterns - Comma-separated query parameter names to exclude.
 * @param {number} [limit=100] - The maximum number of article URLs to discover.
 * @returns {Promise<Array<string>>} - A promise that resolves with an array of discovered article URLs.
 */
async function discoverArticleUrls(sourceUrl, articleLinkTemplate, excludePatterns, limit = 100) {
  let browser;
  const articleUrls = new Set();
  const excludeParams = excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : [];
  const visitedUrls = new Set();
  const urlsToVisit = [{ url: sourceUrl, depth: 0 }];
  const maxDepth = 1; // Limit crawling depth for discovery

  console.log(`Starting article URL discovery for: ${sourceUrl} (Limit: ${limit})`);

  try {
    browser = await puppeteer.launch({ headless: true }); // Use headless mode
    const page = await browser.newPage();
    const sourceHostname = new URL(sourceUrl).hostname;

    // Convert template to a regex pattern
    let templateRegex = null;
    if (articleLinkTemplate) {
      try {
        templateRegex = new RegExp('^' + articleLinkTemplate
          .replace(/\{YYYY\}/g, '\\d{4}')
          .replace(/\{MM\}/g, '\\d{2}')
          .replace(/\{DD\}/g, '\\d{2}')
          .replace(/\{article_slug\}/g, '[^\\/]+')
          .replace(/\{id\d*\}/g, '\\d+') // Handle {id}, {id1}, {id2}, etc.
          .replace(/\./g, '\\.') // Escape dots
          .replace(/\//g, '\\/') // Escape slashes
          + '$');
        console.log(`Generated template regex: ${templateRegex}`);
      } catch (e) {
        console.error(`Error creating regex from template "${articleLinkTemplate}":`, e);
        templateRegex = null; // Invalidate regex if creation fails
      }
    }


    while (urlsToVisit.length > 0 && articleUrls.size < limit) {
      const { url: currentUrl, depth } = urlsToVisit.shift();

      if (visitedUrls.has(currentUrl) || depth > maxDepth) {
        console.log(`Skipping already visited or max depth reached: ${currentUrl} (Depth ${depth})`);
        continue;
      }

      console.log(`Visiting for discovery (Depth ${depth}): ${currentUrl}`);
      visitedUrls.add(currentUrl);

      try {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`Successfully navigated to ${currentUrl} for discovery`);

        const links = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a'));
          return anchors.map(anchor => anchor.href).filter(href => href.startsWith('http'));
        });

        console.log(`Found ${links.length} links on ${currentUrl}`);

        for (const link of links) {
          try {
            const url = new URL(link);

            // Exclude social media share links
            if (url.search.includes('?share=')) {
              console.log(`Excluding social share link: ${link}`);
              continue;
            }

            // Remove excluded query parameters
            if (excludeParams.length > 0) {
              const params = new URLSearchParams(url.search);
              excludeParams.forEach(param => {
                if (params.has(param)) {
                  params.delete(param);
                  console.log(`Removed excluded parameter "${param}" from link: ${link}`);
                }
              });
              url.search = params.toString();
            }

            // Remove hash fragment
            url.hash = '';
            const cleanedLink = url.toString(); // Use a new variable for the modified link

            // Check if the link is on the same domain
            if (url.hostname === sourceHostname) {
              let isPotentialArticle = false;

              // Prioritize matching against the articleLinkTemplate if provided
              if (templateRegex && templateRegex.test(cleanedLink)) {
                isPotentialArticle = true;
                console.log(`Link "${cleanedLink}" matches articleLinkTemplate "${articleLinkTemplate}". Including.`);
              } else {
                 console.log(`Link "${cleanedLink}" does not match articleLinkTemplate "${articleLinkTemplate}". Excluding based on template.`);
              }

              if (isPotentialArticle) {
                 articleUrls.add(cleanedLink);
                 // Only add potential article links to urlsToVisit for further exploration
                 if (!visitedUrls.has(cleanedLink) && urlsToVisit.length < 200 && depth + 1 <= maxDepth) {
                    urlsToVisit.push({ url: cleanedLink, depth: depth + 1 });
                 }
              }
            }
          } catch (e) {
            // Ignore invalid URLs
            console.warn(`Skipping invalid URL: ${link}`, e);
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
  discoverArticleUrls, // Export the updated discovery function
};
