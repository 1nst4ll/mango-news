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
              const excludeSelectors = selectors.exclude.split(',').map(s => s.trim()).filter(s => s);
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
 * Discovers potential article URLs from a given source URL.
 * This is a basic example and would need significant enhancement for real-world use.
 * It finds links on the page that are on the same domain.
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

    while (urlsToVisit.length > 0 && articleUrls.size < limit) { // Use articleUrls.size and limit
      const { url: currentUrl, depth } = urlsToVisit.shift();

      if (visitedUrls.has(currentUrl) || depth > maxDepth) {
        console.log(`Skipping already visited or max depth reached: ${currentUrl} (Depth ${depth})`);
        continue;
      }

      console.log(`Visiting for discovery (Depth ${depth}): ${currentUrl}`);
      visitedUrls.add(currentUrl);

      try {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }); // Increased timeout
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
            link = url.toString(); // Update link with modified URL

            // Check if the link is on the same domain and hasn't been visited
            if (url.hostname === sourceHostname) {
              const path = url.pathname;

              // Exclude common non-article paths
              const isExcludedPath =
                path.endsWith('/') || // Root or directory index
                path.includes('/category/') ||
                path.includes('/tag/') ||
                path.includes('/author/') ||
                path.includes('/archive/') ||
                path.includes('/page/') || // Pagination
                path.includes('/comment/') ||
                path.includes('/feed/') ||
                path.includes('/news/categories/') || // Exclude category pages
                path.includes('/print/') ||
                path.includes('/share/') ||
                path.includes('/replytocom/') ||
                path.includes('/cdn-cgi/') || // Cloudflare
                path.includes('/wp-admin/') || // WordPress admin
                path.includes('/wp-login.php') ||
                path.includes('/wp-json/') ||
                path.includes('/uploads/') ||
                path.includes('/plugins/') ||
                path.includes('/themes/') ||
                path.includes('/xmlrpc.php') ||
                path.includes('/feed/') ||
                path.includes('/trackback/') ||
                path.includes('/comments/') ||
                path.includes('/search/') ||
                path.includes('/shop/') || // E-commerce
                path.includes('/product/') ||
                path.includes('/cart/') ||
                path.includes('/checkout/') ||
                path.includes('/my-account/') ||
                path.includes('/wishlist/') ||
                path.includes('/compare/') ||
                path.includes('/privacy-policy/') ||
                path.includes('/terms-of-service/') ||
                path.includes('/contact/') ||
                path.includes('/about/') ||
                path.includes('/faq/') ||
                path.includes('/sitemap') || // Sitemap files
                path.endsWith('.xml') ||
                path.endsWith('.txt') ||
                path.endsWith('.css') ||
                path.endsWith('.js') ||
                path.endsWith('.png') ||
                path.endsWith('.jpg') ||
                path.endsWith('.jpeg') ||
                path.endsWith('.gif') ||
                path.endsWith('.svg') ||
                path.endsWith('.pdf');

              // Check for the specific magneticmediatv.com article link format
              const isMagneticMediaArticle = url.hostname === 'magneticmediatv.com' && /\/\d{4}\/\d{2}\/[^\/]+\/$/.test(path);

              // Specific check for suntci.com article link format
              const isSuntciArticle = url.hostname === 'suntci.com' && /\/[a-zA-Z0-9-]+\-p\d+\-\d+\.htm$/.test(path);


              // Refined heuristic to identify potential article links
              let isPotentialArticle = false;

              if (url.hostname === 'magneticmediatv.com') {
                // Prioritize the specific magneticmediatv.com article format
                isPotentialArticle = isMagneticMediaArticle;
              } else if (url.hostname === 'suntci.com') {
                 // Prioritize the specific suntci.com article format
                 isPotentialArticle = isSuntciArticle;
              }
              else {
                // General heuristics for other domains
                isPotentialArticle =
                  !isExcludedPath &&
                  (
                    /\/\d{4}\/\d{2}\/\d{2}\/[^\/]+/.test(path) || // /year/month/day/slug
                    /\/\w+\/\w+-\w+/.test(path) || // /category/slug
                    /\/article\/\d+/.test(path) || // /article/id
                    /\/news\//.test(path) || // /news/
                    /\/story\//.test(path) || // /story/
                    /\.html?$/.test(path) || // .html or .htm extension
                    /\/[a-zA-Z0-9-]+\/\d+$/.test(path) || // /slug/id
                    /\/[a-zA-Z0-9-]+\/\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9-]+/.test(path) || // /category/year-month-day/slug
                    /\/\d{4}\/\d{2}\/[a-zA-Z0-9-]+\.html?$/.test(path) || // /year/month/slug.html
                    /\/p\/\d+$/.test(path) || // /p/id (common for some blogs/news)
                    /\/post\/\d+$/.test(path) || // /post/id (another common pattern)
                    /\/story\/\d+$/.test(path) || // /story/id
                    /\/article\/[a-zA-Z0-9-]+$/.test(path) || // /article/slug
                    /\/news\/[a-zA-Z0-9-]+$/.test(path) || // /news/slug
                    /\/\w+\/\d{4}\/\d{2}\/\d{2}\/[^\/]+/.test(path) || // /category/year/month/day/slug
                    /\/\d{4}\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/.test(path) || // /year/slug/slug
                    /\/\d{4}\/\d{2}\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/slug/slug
                    /\/\w+\/\d{4}\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/.test(path) || // /category/year/slug/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/slug/slug
                    /\/\w+\/\w+\/\d+$/.test(path) || // /category/subcategory/id
                    /\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+$/.test(path) || // /year/month/day/category/slug
                    /\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/slug/slug
                    /\/\w+\/\w+\/\w+\/\d+$/.test(path) || // /category/subcategory/subsubcategory/id
                    /\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/slug
                    /\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/subsub/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/slug
                    /\/\w+\/\w+\/\w+\/\w+\/\d+$/.test(path) || // /category/subcategory/subsubcategory/subsub/id
                    /\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/subsub/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/\d+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/subsub/id
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/subsub/slug
                    /\/\w+\/\w+\/\w+\/\w+\/\w+\/\d+$/.test(path) || // /category/subcategory/subsubcategory/subsub/subsub/id
                    /\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/subsub/subsub/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/subsub/slug
                    /\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/subsub/subsub/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/subsub/slug
                    /\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/\d+$/.test(path) || // /category/subcategory/subsubcategory/subsub/subsub/id
                    /\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/subsub/subsub/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/subsub/slug
                    /\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /category/subcategory/subsubcategory/subsub/subsub/subsub/slug
                    /\/\d{4}\/\d{2}\/\d{2}\/\w+\/\w+\/\w+\/\w+\/\w+\/\w+\/[a-zA-Z0-9-]+$/.test(path) || // /year/month/day/category/subcategory/subsubcategory/subsub/subsub/slug
                    path.split('/').filter(segment => segment.length > 0).pop().length > 20 // Check for longer final path segments
                  );
              }


              if (isPotentialArticle) {
                 articleUrls.add(link);
                 console.log(`Link "${link}" matches articleLinkTemplate "${articleLinkTemplate}". Including.`);
                 // Only add potential article links to urlsToVisit for further exploration
                 if (!visitedUrls.has(link) && urlsToVisit.length < 200 && depth + 1 <= maxDepth) {
                    urlsToVisit.push({ url: link, depth: depth + 1 });
                 }
              } else {
                 // console.log(`Link "${link}" does not match articleLinkTemplate "${articleLinkTemplate}". Excluding.`); // Comment out this line
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

    return Array.from(articleUrls); // Return only the links that were added (matched the template)

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
