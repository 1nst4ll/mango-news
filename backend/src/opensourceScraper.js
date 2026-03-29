// Contains the logic for the open-source scraping method using Puppeteer.
// Updated to use browser pool to prevent memory leaks from launching multiple browsers
const { getPage, closePage, getBrowser } = require('./browserPool');
const { loadUrlBlacklist, getBlacklist } = require('./configLoader'); // Import from configLoader

/**
 * Scrapes a single article from a given URL using Puppeteer with retry logic.
 * Includes detailed logging for debugging.
 * @param {string} url - The URL of the article to scrape.
 * @param {object} selectors - An object containing CSS selectors for title, content, date, author, thumbnail, and topics.
 * @param {number} [retries=3] - The number of times to retry scraping on failure.
 * @param {number} [delay=1000] - The delay in milliseconds between retries.
 * @param {string|null} scrapeAfterDate - Optional date string to filter articles published before this date.
 * @returns {Promise<object|null>} - A promise that resolves with the scraped article data or null if scraping fails after retries or if the article is older than scrapeAfterDate.
 */
async function scrapeArticle(url, selectors, scrapeAfterDate = null, retries = 3, delay = 1000) {
  console.log(`[scrape] ${url} (attempt ${4 - retries})`);
  await loadUrlBlacklist();

  const blacklist = getBlacklist();
  if (blacklist.some(b => url.startsWith(b))) {
    console.log(`[scrape] Blacklisted, skipping: ${url}`);
    return null;
  }

  let page = null;
  try {
    page = await getPage();

    try {
      // Use networkidle2 for better JS-rendered content support
      // Falls back to domcontentloaded if networkidle2 times out
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
      } catch (niError) {
        if (niError.name === 'TimeoutError') {
          console.log(`[scrape] networkidle2 timed out for ${url}, falling back to domcontentloaded`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } else {
          throw niError;
        }
      }
      // Scroll to trigger lazy-load JS (e.g. Wix gallery images) then wait briefly
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (navError) {
      console.error(`[scrape] Navigation failed for ${url}:`, navError.message);
      await closePage(page);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return scrapeArticle(url, selectors, scrapeAfterDate, retries - 1, delay * 2);
      }
      return null;
    }

    try {
        // Extract data using the provided selectors with fallback extraction
        const articleData = await page.evaluate((selectors) => {
          // --- Helper functions ---
          const getText = (selector) => {
            if (!selector) return null;
            try {
              const el = document.querySelector(selector);
              return el ? el.innerText.trim() : null;
            } catch { return null; }
          };

          const getHtml = (selector) => {
            if (!selector) return null;
            try {
              const el = document.querySelector(selector);
              return el ? el.innerHTML : null;
            } catch { return null; }
          };

          const getAttribute = (selector, attribute) => {
            if (!selector) return null;
            try {
              const el = document.querySelector(selector);
              return el ? el.getAttribute(attribute) : null;
            } catch { return null; }
          };

          const getMultipleText = (selector) => {
            if (!selector) return [];
            try {
              return Array.from(document.querySelectorAll(selector)).map(el => el.innerText.trim()).filter(Boolean);
            } catch { return []; }
          };

          // --- Content extraction with fallback ---
          let content = '';

          if (selectors.include) {
            const includeSelectors = selectors.include.split(',').map(s => s.trim()).filter(Boolean);
            includeSelectors.forEach(sel => {
              try { document.querySelectorAll(sel).forEach(el => { content += el.innerHTML; }); } catch {}
            });
          } else if (selectors.content) {
            content = getHtml(selectors.content);
          }

          // Fallback: if configured selector returned nothing, try common content containers
          if (!content || content.replace(/<[^>]*>/g, '').trim().length < 50) {
            const fallbackSelectors = [
              'article .entry-content', '.entry-content', '.post-content', '.article-content',
              'article .content', '[class*="article-body"]', '[class*="post-body"]',
              'div.page-content', 'div.story-body', '.story-content',
              '[itemprop="articleBody"]', '[data-component="text-block"]',
              'main article', 'article',
            ];
            for (const fb of fallbackSelectors) {
              try {
                const el = document.querySelector(fb);
                if (el) {
                  const fbContent = el.innerHTML;
                  const fbText = el.innerText.trim();
                  if (fbText.length > 100) {
                    console.log(`[scrape] Fallback content found via: ${fb} (${fbText.length} chars)`);
                    content = fbContent;
                    break;
                  }
                }
              } catch {}
            }
          }

          // Handle exclude selectors
          if (content && selectors.exclude) {
              const excludeSelectors = selectors.exclude.split(',').map(s => s.trim()).filter(Boolean);
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              excludeSelectors.forEach(sel => {
                try { tempDiv.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
              });
              content = tempDiv.innerHTML;
          }

          // Absolutize relative links within the content
          if (content) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            tempDiv.querySelectorAll('a[href]').forEach(link => {
              const href = link.getAttribute('href');
              if (href && !href.startsWith('http') && !href.startsWith('#')) {
                try { link.setAttribute('href', new URL(href, window.location.href).href); } catch {}
              }
            });
            content = tempDiv.innerHTML;
          }

          // --- Title extraction with fallback ---
          let scrapedTitle = getText(selectors.title);
          if (!scrapedTitle) {
            // Try common title selectors
            scrapedTitle = getText('h1.entry-title') || getText('h1.post-title') ||
              getText('h1[itemprop="headline"]') || getText('article h1') || getText('main h1') ||
              getAttribute('meta[property="og:title"]', 'content') ||
              getText('h1');
            if (scrapedTitle) console.log(`[scrape] Fallback title: "${scrapedTitle.substring(0, 60)}"`);
          }

          // --- Date extraction with fallback ---
          let scrapedDate = null;
          if (selectors.date) {
            scrapedDate = selectors.date.startsWith('meta[')
              ? getAttribute(selectors.date, 'content')
              : getText(selectors.date);
          }
          if (!scrapedDate) {
            // Try common date sources (meta tags first — most reliable)
            scrapedDate = getAttribute('meta[property="article:published_time"]', 'content') ||
              getAttribute('meta[name="pubdate"]', 'content') ||
              getAttribute('meta[name="date"]', 'content') ||
              getAttribute('meta[name="DC.date.issued"]', 'content') ||
              getAttribute('time[datetime]', 'datetime') ||
              getAttribute('time[itemprop="datePublished"]', 'datetime') ||
              getText('time[datetime]') || getText('time');
            if (scrapedDate) console.log(`[scrape] Fallback date: ${scrapedDate}`);
          }

          // --- Author extraction with fallback ---
          let scrapedAuthor = getText(selectors.author);
          if (!scrapedAuthor) {
            scrapedAuthor = getAttribute('meta[name="author"]', 'content') ||
              getAttribute('meta[property="article:author"]', 'content') ||
              getText('[rel="author"]') || getText('[itemprop="author"]') ||
              getText('.author-name') || getText('.byline');
            if (scrapedAuthor) console.log(`[scrape] Fallback author: ${scrapedAuthor}`);
          }
          // Clean author
          if (scrapedAuthor) {
            scrapedAuthor = scrapedAuthor.replace(/•/g, '').replace(/^by\s+/i, '').replace(/\s+/g, ' ').trim();
          }

          if (content) {
            content = content.replace(/Share this:.*$/, '').trim();
          }

          // --- Thumbnail extraction with fallback ---
          let scrapedThumbnailUrl = null;
          if (selectors.thumbnail) {
            const parts = selectors.thumbnail.split('::');
            const selector = parts[0];
            const attribute = parts[1];
            const jsonKey = parts[2] || null;
            if (attribute) {
              scrapedThumbnailUrl = getAttribute(selector, attribute);
              if (jsonKey === 'uri' && scrapedThumbnailUrl) {
                scrapedThumbnailUrl = `https://static.wixstatic.com/media/${scrapedThumbnailUrl}`;
              }
            } else {
              scrapedThumbnailUrl = getAttribute(selector, 'src');
            }
          }
          if (!scrapedThumbnailUrl) {
            // Try og:image, then first large image in content
            const ogImage = getAttribute('meta[property="og:image"]', 'content');
            if (ogImage && !ogImage.includes('logo') && !ogImage.includes('favicon') && !ogImage.includes('icon')) {
              scrapedThumbnailUrl = ogImage;
              console.log(`[scrape] Fallback thumbnail from og:image`);
            } else if (content) {
              // Find first image in content that looks like a real photo (not icon/logo)
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              const imgs = tempDiv.querySelectorAll('img[src]');
              for (const img of imgs) {
                const src = img.getAttribute('src');
                const width = parseInt(img.getAttribute('width') || '0');
                const height = parseInt(img.getAttribute('height') || '0');
                // Skip tiny images (icons, tracking pixels)
                if (width > 0 && width < 100) continue;
                if (height > 0 && height < 100) continue;
                if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !src.includes('emoji')) {
                  try {
                    scrapedThumbnailUrl = new URL(src, window.location.href).href;
                    console.log(`[scrape] Fallback thumbnail from content image`);
                    break;
                  } catch {}
                }
              }
            }
          }

          // Remove the thumbnail image from the content to avoid duplication
          if (content && scrapedThumbnailUrl) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            tempDiv.querySelectorAll('img').forEach(img => {
              try {
                const absoluteSrc = new URL(img.getAttribute('src'), window.location.href).href;
                if (absoluteSrc === scrapedThumbnailUrl) img.remove();
              } catch {}
            });
            content = tempDiv.innerHTML;
          }

          const scrapedTopics = getMultipleText(selectors.topics);

          return {
            title: scrapedTitle,
            content: content,
            publication_date: scrapedDate,
            author: scrapedAuthor,
            thumbnail_url: scrapedThumbnailUrl,
            topics: scrapedTopics,
            url: window.location.href
          };
        }, selectors);

        // Basic validation — allow retry if essential data is missing
        if (!articleData || !articleData.title || !articleData.content) {
            console.warn(`[scrape] Incomplete data for ${url}: title=${!!articleData?.title}, content=${!!articleData?.content}`);
            await closePage(page);
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return scrapeArticle(url, selectors, scrapeAfterDate, retries - 1, delay * 2);
            }
            return null;
        }

        // Date filtering
        if (scrapeAfterDate && articleData.publication_date) {
          const articleDate = new Date(articleData.publication_date);
          const filterDate = new Date(scrapeAfterDate);
          articleDate.setHours(0, 0, 0, 0);
          filterDate.setHours(0, 0, 0, 0);
          if (articleDate < filterDate) {
            console.log(`[scrape] Skipping old article: "${articleData.title}" (${articleData.publication_date})`);
            await closePage(page);
            return null;
          }
        }

        console.log(`[scrape] Success: "${articleData.title}" (${url})`);
        await closePage(page);
        return articleData;
    } catch (evalError) {
        console.error(`[scrape] Evaluation error for ${url}:`, evalError.message);
        await closePage(page);
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return scrapeArticle(url, selectors, scrapeAfterDate, retries - 1, delay * 2);
        }
        return null;
    }

      } catch (error) {
        console.error(`[scrape] Error for ${url}:`, error.message);
        await closePage(page);
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return scrapeArticle(url, selectors, scrapeAfterDate, retries - 1, delay * 2);
        }
        return null;
      }
    }

// Helper function to build regex from article link template
function buildTemplateRegex(template) {
  // Find all placeholders {name} or {name:regex}
  const placeholderRegex = /\{([^}:]+)(?::([^}]+))?\}/g;
  let lastIndex = 0;
  let regexString = '^';
  let match;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const placeholderName = match[1];
    const customRegex = match[2];

    // Add the literal part before the placeholder, escaped
    const literalPart = template.substring(lastIndex, match.index);
    regexString += literalPart.replace(/[.+?^$|()[\]\\]/g, '\\$&');

    // Add the regex for the placeholder
    regexString += customRegex ? `(${customRegex})` : '([^/]+)';

    lastIndex = placeholderRegex.lastIndex;
  }

  // Add the remaining literal part after the last placeholder, escaped
  regexString += template.substring(lastIndex).replace(/[.+?^$|()[\]\\]/g, '\\$&');

  regexString += '$'; // Anchor to the end of the string

  console.log(`[discovery] Template regex: ${regexString}`);

  return new RegExp(regexString);
}

// Common non-article path patterns to skip during heuristic discovery
const NON_ARTICLE_PATTERNS = /^\/(contact|about|privacy|terms|login|register|search|category|tag|tags|archive|feed|sitemap|schedule|podcasts|faq|careers|jobs|vacancy|recruitment|staff|team|leadership|departments|services|gallery|events|donate|subscribe|newsletter|cart|checkout|account|profile|settings|admin|wp-admin|wp-login|wp-content|wp-includes|cdn-cgi|assets|static|media|images|img|css|js|fonts|api)\b/i;

// Common pagination URL patterns
const PAGINATION_PATTERNS = /[?&](page|p|pg|offset|start)=\d+|\/page\/\d+\/?$/i;

/**
 * Detect pagination links on a page.
 * Returns URLs of subsequent pages (page 2, 3, etc.).
 */
function detectPaginationLinks(links, sourceUrl, sourceHostname) {
  const paginationUrls = [];
  const sourcePath = new URL(sourceUrl).pathname;

  for (const link of links) {
    try {
      const url = new URL(link);
      if (url.hostname !== sourceHostname) continue;

      // Match /page/N/ patterns (WordPress, Elementor)
      const pageMatch = url.pathname.match(/^(.+?)\/page\/(\d+)\/?$/);
      if (pageMatch) {
        const basePath = pageMatch[1] || '/';
        const pageNum = parseInt(pageMatch[2]);
        // Only follow if this pagination is for our source page
        if (sourcePath.startsWith(basePath) || basePath.startsWith(sourcePath.replace(/\/$/, ''))) {
          if (pageNum >= 2 && pageNum <= 20) { // Cap at 20 pages to avoid runaway crawls
            paginationUrls.push({ url: link, page: pageNum });
          }
        }
        continue;
      }

      // Match ?page=N, ?p=N, ?pg=N, ?offset=N patterns
      const params = new URLSearchParams(url.search);
      for (const [key, value] of params) {
        if (/^(page|p|pg)$/i.test(key) && /^\d+$/.test(value)) {
          const pageNum = parseInt(value);
          if (pageNum >= 2 && pageNum <= 20) {
            paginationUrls.push({ url: link, page: pageNum });
          }
        }
      }
    } catch { /* skip invalid */ }
  }

  // Deduplicate and sort by page number
  const seen = new Set();
  return paginationUrls
    .filter(p => { if (seen.has(p.url)) return false; seen.add(p.url); return true; })
    .sort((a, b) => a.page - b.page)
    .map(p => p.url);
}

/**
 * Heuristic: score a link as likely being an article vs. navigation.
 * Higher score = more likely an article. Used when no template is set.
 */
function scoreArticleLikelihood(url, anchorText, anchorContext) {
  let score = 0;
  const path = new URL(url).pathname;

  // Penalize known non-article patterns
  if (NON_ARTICLE_PATTERNS.test(path)) return -10;

  // Penalize very short paths (likely top-level nav)
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return -10;

  // Reward longer slugs (articles tend to have descriptive slugs)
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.length > 20) score += 2;
  if (lastSegment.includes('-') && lastSegment.split('-').length >= 3) score += 3; // slug-like

  // Reward date patterns in URL (/2026/03/article-slug)
  if (/\/\d{4}\/\d{2}\//.test(path)) score += 4;

  // Reward paths containing article-like segments
  if (/\/(news|article|post|blog|press|story|update|report|release|announcement)\b/i.test(path)) score += 3;

  // Reward meaningful anchor text (articles have descriptive titles)
  if (anchorText && anchorText.length > 15) score += 2;
  if (anchorText && anchorText.length > 40) score += 1;

  // Reward links inside article containers
  if (anchorContext && /article|post|entry|story|news|card|feed|item/i.test(anchorContext)) score += 3;

  // Penalize file extensions that aren't articles
  if (/\.(pdf|xml|json|rss|atom|zip|gz|mp3|mp4|mov|avi)$/i.test(path)) return -10;

  // Penalize pagination-looking URLs
  if (PAGINATION_PATTERNS.test(url)) return -5;

  return score;
}

/**
 * Discovers potential article URLs from a given source URL.
 * Supports template matching, heuristic discovery, and pagination following.
 *
 * @param {string} sourceUrl - The URL of the source to discover articles from.
 * @param {string} articleLinkTemplate - The template for article links.
 * @param {string} excludePatterns - Comma-separated query parameter names to exclude.
 * @param {number} [limit=100] - The maximum number of article URLs to discover.
 * @returns {Promise<Array<string>>} - A promise that resolves with an array of discovered article URLs.
 */
async function discoverArticleUrls(sourceUrl, articleLinkTemplate, excludePatterns, limit = 100) {
  await loadUrlBlacklist();
  let page = null;
  const articleUrls = new Set();
  const excludeParams = excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : [];
  const visitedUrls = new Set();
  const urlsToVisit = [{ url: sourceUrl, depth: 0, type: 'source' }];
  const maxDepth = 2; // Increased: source → pagination/category → articles

  console.log(`[discovery] Starting for: ${sourceUrl} (limit: ${limit})`);

  try {
    page = await getPage();
    const sourceHostname = new URL(sourceUrl).hostname;
    const blacklist = getBlacklist();

    // Build template regex if provided
    let templateRegex = null;
    if (articleLinkTemplate) {
      try {
        templateRegex = buildTemplateRegex(articleLinkTemplate);
      } catch (e) {
        console.error(`[discovery] Bad template "${articleLinkTemplate}":`, e.message);
      }
    }

    while (urlsToVisit.length > 0 && articleUrls.size < limit) {
      const { url: currentUrl, depth, type } = urlsToVisit.shift();

      if (visitedUrls.has(currentUrl) || depth > maxDepth) continue;
      visitedUrls.add(currentUrl);

      console.log(`[discovery] Visiting (depth ${depth}, ${type}): ${currentUrl}`);

      try {
        // Use networkidle0 for source/pagination pages to catch JS-rendered content
        // Use domcontentloaded for deeper pages (faster, less important)
        const waitStrategy = depth === 0 ? 'networkidle2' : 'domcontentloaded';
        await page.goto(currentUrl, { waitUntil: waitStrategy, timeout: 20000 });

        // For source pages, scroll to trigger lazy-loaded content (Elementor, infinite scroll)
        if (depth === 0) {
          await page.evaluate(async () => {
            // Scroll down in steps to trigger lazy loading
            const scrollStep = Math.max(window.innerHeight, 800);
            const maxScroll = document.body.scrollHeight;
            for (let y = 0; y < maxScroll; y += scrollStep) {
              window.scrollTo(0, y);
              await new Promise(r => setTimeout(r, 300));
            }
            window.scrollTo(0, document.body.scrollHeight);
          });
          await new Promise(r => setTimeout(r, 1500)); // Wait for lazy content to load
        }

        // Extract links with context (parent element classes for heuristic scoring)
        const linkData = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          return anchors
            .map(a => {
              const href = a.href;
              if (!href || !href.startsWith('http')) return null;
              const text = a.textContent?.trim() || '';
              // Capture parent context for heuristic scoring
              const parent = a.closest('article, [class*="post"], [class*="news"], [class*="story"], [class*="card"], [class*="entry"], [class*="item"], [class*="feed"], li, .elementor-post');
              const context = parent?.className || '';
              return { href, text, context };
            })
            .filter(Boolean);
        });

        console.log(`[discovery] Found ${linkData.length} links on ${currentUrl}`);

        // Detect pagination on source/pagination pages
        if (type === 'source' || type === 'pagination') {
          const allHrefs = linkData.map(l => l.href);
          const paginationUrls = detectPaginationLinks(allHrefs, sourceUrl, sourceHostname);
          for (const pagUrl of paginationUrls) {
            if (!visitedUrls.has(pagUrl)) {
              urlsToVisit.push({ url: pagUrl, depth: depth + 1, type: 'pagination' });
              visitedUrls.add(pagUrl); // Prevent duplicate queue entries
              console.log(`[discovery] Queued pagination page: ${pagUrl}`);
            }
          }
        }

        // Process each link
        for (const { href, text, context } of linkData) {
          try {
            const url = new URL(href);

            // Basic exclusions
            if (url.hostname !== sourceHostname) continue;
            if (url.search.includes('?share=') || href.includes('?page_id=')) continue;

            // Remove excluded query parameters
            if (excludeParams.length > 0) {
              const params = new URLSearchParams(url.search);
              let changed = false;
              excludeParams.forEach(param => {
                if (params.has(param)) { params.delete(param); changed = true; }
              });
              if (changed) url.search = params.toString();
            }

            url.hash = '';
            const cleanedLink = url.toString();

            // Blacklist check
            if (blacklist.some(b => cleanedLink.startsWith(b))) continue;

            // Skip pagination URLs as articles
            if (PAGINATION_PATTERNS.test(cleanedLink)) continue;

            let isPotentialArticle = false;

            if (templateRegex) {
              // Template-based matching (primary)
              isPotentialArticle = templateRegex.test(cleanedLink);
            } else {
              // Heuristic-based matching (when no template configured)
              const score = scoreArticleLikelihood(cleanedLink, text, context);
              isPotentialArticle = score >= 3;
              if (isPotentialArticle) {
                console.log(`[discovery] Heuristic match (score ${score}): ${cleanedLink}`);
              }
            }

            if (isPotentialArticle && !articleUrls.has(cleanedLink)) {
              articleUrls.add(cleanedLink);
              console.log(`[discovery] Found article: ${cleanedLink} (total: ${articleUrls.size})`);
            } else if (!isPotentialArticle && !visitedUrls.has(cleanedLink) && depth + 1 <= maxDepth) {
              // Queue non-article same-domain links for deeper crawling
              // But only if they look like category/section pages, not random nav
              const path = url.pathname;
              if (!NON_ARTICLE_PATTERNS.test(path) && type === 'source') {
                urlsToVisit.push({ url: cleanedLink, depth: depth + 1, type: 'crawl' });
                visitedUrls.add(cleanedLink);
              }
            }
          } catch { /* skip invalid URLs */ }
        }
      } catch (e) {
        console.error(`[discovery] Error visiting ${currentUrl}:`, e.message);
      }
    }

    console.log(`[discovery] Complete. Found ${articleUrls.size} article URLs.`);
    await closePage(page);
    return Array.from(articleUrls);

  } catch (error) {
    console.error(`[discovery] Fatal error for ${sourceUrl}:`, error.message);
    await closePage(page);
    return [];
  }
}


module.exports = {
  scrapeArticle,
  discoverArticleUrls, // Export the updated discovery function
};
