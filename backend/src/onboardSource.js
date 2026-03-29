/**
 * Automated New Source Onboarding Pipeline
 *
 * Given a source page URL, this module:
 * 1. Fetches the page via Firecrawl to get its HTML/markdown
 * 2. Uses Groq LLM to detect article structure and propose CSS selectors
 * 3. Discovers article URLs from the source page
 * 4. Scrapes a test article to validate selectors
 * 5. Validates output against the unified article schema
 * 6. Saves the source configuration to the database
 *
 * Usage:
 *   const { onboardSource } = require('./onboardSource');
 *   const result = await onboardSource('https://example.com/news', { name: 'Example News' });
 *
 * CLI usage:
 *   cd backend && node src/onboardSource.js <url> [name]
 */

const { z } = require('zod');
const { generateText } = require('ai');
const { createGroq } = require('@ai-sdk/groq');
const axios = require('axios');
const { JSDOM } = require('jsdom');

// Try to load Firecrawl; falls back to HTTP fetch if unavailable or API key invalid
let Firecrawl;
try { Firecrawl = require('firecrawl').default; } catch { Firecrawl = null; }

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/** The unified article schema that all sources must produce */
const ARTICLE_SCHEMA = {
  title: { required: true, type: 'string', minLength: 5 },
  content: { required: true, type: 'string', minWords: 30 },
  publication_date: { required: false, type: 'date' },
  author: { required: false, type: 'string' },
  thumbnail_url: { required: false, type: 'url' },
};

/** Source config that gets saved to the DB */
const SOURCE_CONFIG_FIELDS = [
  'name', 'url', 'scraping_method',
  'os_title_selector', 'os_content_selector', 'os_date_selector',
  'os_author_selector', 'os_thumbnail_selector', 'os_topics_selector',
  'include_selectors', 'exclude_selectors',
  'article_link_template', 'exclude_patterns',
  'scrape_after_date',
];

// ============================================================================
// STEP 1: FETCH SOURCE PAGE
// ============================================================================

/**
 * Fetch a page via HTTP with SSL tolerance.
 */
async function httpFetch(url) {
  const https = require('https');
  const resp = await axios.get(url, {
    timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MangoNews/1.0)' },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    maxRedirects: 5,
  });
  return resp.data;
}

// Common non-article path patterns
const NON_ARTICLE_PATTERNS = /^\/(contact|about|privacy|terms|login|register|search|category|tag|tags|archive|feed|sitemap|schedule|podcasts|faq|careers|jobs|vacancy|recruitment|staff|team|leadership|departments|services|gallery|events|donate|subscribe|newsletter|cart|checkout|account|profile|settings|admin|wp-admin|wp-login|wp-content|wp-includes|cdn-cgi|assets|static|media|images|img|css|js|fonts|api)\b/i;

/**
 * Score a link as likely being an article vs. navigation.
 * Uses link text, URL structure, and DOM context.
 */
function scoreLink(url, text, context) {
  let score = 0;
  const path = new URL(url).pathname;

  // Hard exclusions
  if (NON_ARTICLE_PATTERNS.test(path)) return -10;
  if (/\.(css|js|jpg|png|gif|svg|ico|pdf|xml|rss|json|zip|mp3|mp4)$/i.test(path)) return -10;

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return -10;

  // Article URL heuristics
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.length > 20) score += 1;
  if (lastSegment.includes('-') && lastSegment.split('-').length >= 3) score += 3;
  if (/\/\d{4}\/\d{2}\//.test(path)) score += 4;
  if (/\/(news|article|post|blog|press|story|update|report|release|announcement)\b/i.test(path)) score += 2;

  // Article link text heuristics
  if (text && text.length > 15 && text.length < 200) score += 2;
  if (text && text.length > 40) score += 1;
  // Navigation links tend to be short generic labels
  if (text && text.length <= 5) score -= 2;

  // DOM context: links inside article containers are very likely articles
  if (context && /article|post|entry|story|news|card|feed|item|elementor-post/i.test(context)) score += 4;

  // Pagination-like links are not articles
  if (/[?&](page|p|pg)=\d+|\/page\/\d+/i.test(url)) score -= 3;

  return score;
}

/**
 * Extract article links from raw HTML using DOM parsing.
 * Uses heuristic scoring to distinguish articles from navigation.
 */
function extractLinksFromHtml(html, sourceUrl) {
  const dom = new JSDOM(html, { url: sourceUrl });
  const doc = dom.window.document;
  const baseHostname = new URL(sourceUrl).hostname;

  // Get page title
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const pageTitle = ogTitle || doc.querySelector('title')?.textContent || '';

  // Detect CMS type for better heuristics
  const cmsHints = detectCMS(doc, html);

  // First pass: try to find links inside article containers (most reliable)
  const articleContainerSelectors = [
    'article.elementor-post', '.elementor-posts-container article',
    'article[class*="post"]', '.post-list article', '.news-list article',
    '[class*="article-list"] a', '[class*="post-list"] a',
    '.entries article', '.feed article', '.stories article',
  ];

  const articleLinks = [];
  const seen = new Set();

  // Try structured extraction first (articles inside post containers)
  for (const containerSel of articleContainerSelectors) {
    const containers = doc.querySelectorAll(containerSel);
    if (containers.length >= 2) { // Need at least 2 to be a real list
      for (const container of containers) {
        const link = container.querySelector('a[href]');
        if (!link) continue;
        const href = link.getAttribute('href');
        if (!href) continue;
        try {
          const resolved = new URL(href, sourceUrl).href;
          if (new URL(resolved).hostname !== baseHostname) continue;
          if (!seen.has(resolved)) {
            seen.add(resolved);
            const title = container.querySelector('h2, h3, h4, [class*="title"]')?.textContent?.trim() ||
                          link.textContent?.trim() || '';
            if (title.length > 3) {
              articleLinks.push({ url: resolved, title, score: 10, method: 'container' });
            }
          }
        } catch {}
      }
      if (articleLinks.length >= 2) {
        console.log(`[onboard] Found ${articleLinks.length} articles via container: ${containerSel}`);
        break; // Found structured articles, stop looking
      }
    }
  }

  // Second pass: heuristic scoring on all links (if structured extraction found too few)
  if (articleLinks.length < 3) {
    const allLinks = doc.querySelectorAll('a[href]');
    for (const el of allLinks) {
      const href = el.getAttribute('href');
      if (!href || href === '/' || href === '#' || href.startsWith('javascript:')) continue;

      try {
        const resolved = new URL(href, sourceUrl).href;
        const resolvedUrl = new URL(resolved);

        if (resolvedUrl.hostname !== baseHostname) continue;
        if (resolvedUrl.pathname === '/' || resolvedUrl.pathname === new URL(sourceUrl).pathname) continue;
        if (seen.has(resolved)) continue;

        const text = el.textContent?.trim() || el.getAttribute('title') || '';
        const parent = el.closest('article, [class*="post"], [class*="news"], [class*="story"], [class*="card"], [class*="entry"], [class*="item"], li');
        const context = parent?.className || '';

        const linkScore = scoreLink(resolved, text, context);
        if (linkScore >= 3 && text.length > 5) {
          seen.add(resolved);
          articleLinks.push({ url: resolved, title: text, score: linkScore, method: 'heuristic' });
        }
      } catch {}
    }

    // Sort by score descending
    articleLinks.sort((a, b) => b.score - a.score);
  }

  dom.window.close();
  return { siteName: pageTitle, articleLinks, cmsHints };
}

/**
 * Detect CMS type from HTML structure.
 * Returns hints that help configure selectors.
 */
function detectCMS(doc, html) {
  const hints = { cms: 'unknown', selectors: {} };

  // WordPress
  if (html.includes('wp-content') || doc.querySelector('meta[name="generator"][content*="WordPress"]')) {
    hints.cms = 'wordpress';
    hints.selectors = {
      title: 'h1.entry-title',
      content: '.entry-content',
      date: 'meta[property="article:published_time"]',
      author: 'meta[name="author"]',
      thumbnail: 'meta[property="og:image"]',
    };
    // Elementor detection
    if (html.includes('elementor')) {
      hints.cms = 'wordpress-elementor';
      hints.selectors.content = 'div.page-content, .entry-content, .elementor-widget-theme-post-content';
    }
  }
  // Wix
  else if (html.includes('wixstatic.com') || html.includes('_wix_browser_sess')) {
    hints.cms = 'wix';
    hints.selectors = {
      title: 'h1[data-hook="post-title"]',
      content: 'div[data-id="content-viewer"]',
      date: 'meta[property="article:published_time"]',
      author: 'span[data-hook="user-name"]',
      thumbnail: 'figure[data-hook="figure-IMAGE"] img',
    };
  }
  // Ghost
  else if (doc.querySelector('meta[name="generator"][content*="Ghost"]')) {
    hints.cms = 'ghost';
    hints.selectors = {
      title: 'h1.article-title, h1.post-full-title',
      content: '.article-content, .post-full-content',
      date: 'time[datetime]',
      author: '.author-name',
    };
  }
  // Joomla
  else if (html.includes('Joomla') || html.includes('/components/com_')) {
    hints.cms = 'joomla';
    hints.selectors = {
      title: 'h1, h2.item-title',
      content: '.item-page, [itemprop="articleBody"]',
      date: 'time[datetime]',
    };
  }
  // Drupal
  else if (html.includes('Drupal') || html.includes('drupal.js')) {
    hints.cms = 'drupal';
    hints.selectors = {
      title: 'h1.page-title, h1.node-title',
      content: '.node-content, .field--name-body',
      date: 'meta[property="article:published_time"]',
    };
  }

  return hints;
}

/**
 * Fetch the source page and extract its structure.
 * Tries Firecrawl first, falls back to HTTP + DOM parsing.
 */
async function fetchSourcePage(sourceUrl, firecrawl) {
  console.log(`[onboard] Step 1: Fetching source page: ${sourceUrl}`);

  // Try Firecrawl first
  if (firecrawl) {
    try {
      const pageResult = await firecrawl.scrape(sourceUrl, {
        formats: ['markdown', 'rawHtml', 'extract'],
        onlyMainContent: false,
        extract: {
          schema: z.object({
            site_name: z.string().optional().describe('The name of the news website'),
            articles: z.array(z.object({
              title: z.string().optional(),
              url: z.string().optional(),
              date: z.string().optional(),
            })).describe('List of article links visible on the page'),
          }),
          prompt: "Extract the website name and a list of all news article links visible on this page.",
        },
      });

      if (pageResult?.success) {
        const articleLinks = (pageResult.extract?.articles || [])
          .map(a => a.url).filter(url => url && url.startsWith('http'));
        console.log(`[onboard] Firecrawl found ${articleLinks.length} article links`);
        return {
          markdown: pageResult.markdown,
          rawHtml: pageResult.rawHtml,
          siteName: pageResult.extract?.site_name || null,
          articleLinks,
          articles: pageResult.extract?.articles || [],
          method: 'firecrawl',
        };
      }
    } catch (err) {
      console.log(`[onboard] Firecrawl failed (${err.message}), falling back to HTTP fetch`);
    }
  }

  // Fallback: direct HTTP fetch + DOM parsing
  console.log(`[onboard] Using HTTP fetch fallback...`);
  const html = await httpFetch(sourceUrl);
  const { siteName, articleLinks: parsedLinks, cmsHints } = extractLinksFromHtml(html, sourceUrl);

  console.log(`[onboard] HTTP fetch found ${parsedLinks.length} potential article links`);
  console.log(`[onboard] Site name: ${siteName || '(unknown)'}`);
  if (cmsHints?.cms !== 'unknown') {
    console.log(`[onboard] Detected CMS: ${cmsHints.cms}`);
  }

  return {
    markdown: null,
    rawHtml: html,
    siteName,
    articleLinks: parsedLinks.map(l => l.url),
    articles: parsedLinks,
    cmsHints,
    method: 'http',
  };
}

// ============================================================================
// STEP 2: FETCH ARTICLE PAGE FOR ANALYSIS
// ============================================================================

/**
 * Fetch a single article page to analyze its DOM structure.
 * Uses Firecrawl if available, otherwise falls back to HTTP + LLM extraction.
 */
async function fetchArticlePage(articleUrl, firecrawl) {
  console.log(`[onboard] Step 2: Fetching article page for analysis: ${articleUrl}`);

  // Try Firecrawl first
  if (firecrawl) {
    try {
      const result = await firecrawl.scrape(articleUrl, {
        formats: ['markdown', 'rawHtml', 'extract'],
        onlyMainContent: false,
        extract: {
          schema: z.object({
            title: z.string().optional(),
            author: z.string().optional(),
            publication_date: z.string().optional(),
            thumbnail_url: z.string().optional(),
            content_preview: z.string().optional().describe('First 200 characters of article body text'),
          }),
          prompt: "Extract the article title, author name, publication date, main thumbnail/hero image URL, and the first 200 characters of the article body text.",
        },
      });

      if (result?.success) {
        return { markdown: result.markdown, rawHtml: result.rawHtml, extracted: result.extract };
      }
    } catch (err) {
      console.log(`[onboard] Firecrawl article fetch failed (${err.message}), using HTTP fallback`);
    }
  }

  // Fallback: direct HTTP fetch with rich extraction
  const html = await httpFetch(articleUrl);
  const dom = new JSDOM(html, { url: articleUrl });
  const doc = dom.window.document;

  // Try multiple selectors for each field, in order of specificity
  const trySelectors = (selectors, attr = null) => {
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (!el) continue;
        if (attr) {
          const val = el.getAttribute(attr);
          if (val) return val;
        } else {
          const text = el.textContent?.trim();
          if (text && text.length > 1) return text;
        }
      } catch {}
    }
    return null;
  };

  const extracted = {
    title: trySelectors([
      'h1.entry-title', 'h1.post-title', 'h1[itemprop="headline"]',
      'h1.article-title', 'article h1', 'main h1', 'h1',
    ]) || trySelectors(['meta[property="og:title"]'], 'content') ||
         trySelectors(['title']),

    author: trySelectors(['meta[name="author"]'], 'content') ||
            trySelectors(['meta[property="article:author"]'], 'content') ||
            trySelectors([
              'span[data-hook="user-name"]', '.author-name', '.byline',
              '[rel="author"]', '[itemprop="author"]', '.post-author',
            ]),

    publication_date: trySelectors(['meta[property="article:published_time"]'], 'content') ||
                      trySelectors(['meta[name="pubdate"]'], 'content') ||
                      trySelectors(['time[datetime]'], 'datetime') ||
                      trySelectors(['time']),

    thumbnail_url: trySelectors(['meta[property="og:image"]'], 'content'),

    content_preview: null,
  };

  // Content extraction with fallback chain
  const contentSelectors = [
    '.entry-content', '.post-content', 'div.page-content', '.article-content',
    '[itemprop="articleBody"]', 'div[data-id="content-viewer"]',
    'article .content', '.story-body', '.post-body',
    'article', 'main',
  ];
  const bodyEl = (() => {
    for (const sel of contentSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent.trim().length > 100) return el;
    }
    return doc.body;
  })();

  extracted.content_preview = bodyEl?.textContent?.substring(0, 300)?.trim();
  const markdown = bodyEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';

  dom.window.close();
  return { markdown, rawHtml: html, extracted };
}

// ============================================================================
// STEP 3: LLM-BASED SELECTOR DETECTION
// ============================================================================

/**
 * Use Groq LLM to analyze HTML and propose CSS selectors for article extraction.
 */
async function detectSelectors(rawHtml, articleUrl, extractedData) {
  console.log(`[onboard] Step 3: Using LLM to detect CSS selectors...`);

  // Truncate HTML to avoid token limits — focus on the most relevant parts
  const truncatedHtml = rawHtml.length > 30000
    ? rawHtml.substring(0, 15000) + '\n... [TRUNCATED] ...\n' + rawHtml.substring(rawHtml.length - 15000)
    : rawHtml;

  const prompt = `Analyze this HTML from a news article page and propose CSS selectors for extracting article data.

ARTICLE URL: ${articleUrl}
KNOWN DATA (from LLM extraction):
- Title: ${extractedData?.title || '(unknown)'}
- Author: ${extractedData?.author || '(unknown)'}
- Date: ${extractedData?.publication_date || '(unknown)'}
- Thumbnail: ${extractedData?.thumbnail_url || '(unknown)'}

HTML:
${truncatedHtml}

Respond with ONLY a JSON object (no markdown formatting, no code blocks) with these fields:
{
  "os_title_selector": "CSS selector for the article title (h1, h2, etc.)",
  "os_content_selector": "CSS selector for the main article body content",
  "os_date_selector": "CSS selector for the publication date (or meta tag like meta[property=\\"article:published_time\\"])",
  "os_author_selector": "CSS selector for the author name (or null if not found)",
  "os_thumbnail_selector": "CSS selector for the featured/hero image (or null if not found)",
  "include_selectors": "Comma-separated selectors to include (or null)",
  "exclude_selectors": "Comma-separated selectors to exclude (ads, nav, footer, social, etc.) or null",
  "article_link_template": "URL template with {placeholders} for article links, e.g. https://example.com/news/{article_slug}"
}

RULES:
- Prefer specific selectors (IDs, data attributes, unique class names) over generic ones
- For article_link_template, analyze the article URL pattern and create a template with {slug} or {year}/{month}/{slug} placeholders
- Use :: notation for attribute extraction (e.g., "img.hero::src" to get the src attribute)
- For meta tags, use the full selector like meta[property="article:published_time"]
- For exclude_selectors, include common noise: social sharing buttons, related articles, ads, navigation within content
- Set to null if a field cannot be reliably detected`;

  try {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    const { text: response } = await generateText({
      model: groq(process.env.AI_PROMPT_MODEL || 'llama-3.3-70b-versatile'),
      prompt,
      maxTokens: 2000,
      temperature: 0.1,
    });

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM response did not contain valid JSON');
    }

    const selectors = JSON.parse(jsonMatch[0]);
    console.log(`[onboard] LLM proposed selectors:`);
    for (const [key, value] of Object.entries(selectors)) {
      if (value) console.log(`  ${key}: ${value}`);
    }

    return selectors;
  } catch (err) {
    console.error(`[onboard] LLM selector detection failed:`, err.message);
    // Return Firecrawl-based fallback
    return {
      os_title_selector: null,
      os_content_selector: null,
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      include_selectors: null,
      exclude_selectors: null,
      article_link_template: null,
      _fallback: true,
      _reason: err.message,
    };
  }
}

// ============================================================================
// STEP 4: VALIDATE SCRAPED OUTPUT
// ============================================================================

/**
 * Validate extracted article data against the unified schema.
 */
function validateArticle(data) {
  const issues = [];
  const fieldResults = {};

  // Title
  if (!data.title || data.title.trim().length < ARTICLE_SCHEMA.title.minLength) {
    issues.push(`Title missing or too short (got: "${data.title || ''}")`);
    fieldResults.title = 'FAIL';
  } else {
    fieldResults.title = 'OK';
  }

  // Content
  const contentWords = (data.content || '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').filter(Boolean).length;
  if (contentWords < ARTICLE_SCHEMA.content.minWords) {
    issues.push(`Content too short: ${contentWords} words (min: ${ARTICLE_SCHEMA.content.minWords})`);
    fieldResults.content = 'FAIL';
  } else {
    fieldResults.content = `OK (${contentWords} words)`;
  }

  // Date
  if (data.publication_date) {
    const d = new Date(data.publication_date);
    if (isNaN(d.getTime())) {
      issues.push(`Date unparseable: "${data.publication_date}"`);
      fieldResults.date = 'FAIL';
    } else {
      fieldResults.date = `OK (${d.toISOString().split('T')[0]})`;
    }
  } else {
    fieldResults.date = 'MISSING (optional)';
  }

  // Author
  fieldResults.author = data.author ? `OK ("${data.author}")` : 'MISSING (optional)';

  // Thumbnail
  fieldResults.thumbnail = data.thumbnail_url ? `OK (${data.thumbnail_url.substring(0, 60)}...)` : 'MISSING (optional)';

  return {
    valid: issues.length === 0,
    issues,
    fieldResults,
    contentWords,
  };
}

// ============================================================================
// STEP 5: GENERATE ARTICLE LINK TEMPLATE
// ============================================================================

/**
 * Analyze discovered article URLs to generate a link template pattern.
 */
function generateLinkTemplate(articleUrls, sourceUrl) {
  if (!articleUrls || articleUrls.length === 0) return null;

  try {
    const sourceHostname = new URL(sourceUrl).hostname;
    // Filter to same-domain URLs
    const sameDomain = articleUrls.filter(u => {
      try { return new URL(u).hostname === sourceHostname; } catch { return false; }
    });

    if (sameDomain.length === 0) return null;

    // Find common prefix
    const basePath = new URL(sourceUrl).origin;
    const paths = sameDomain.map(u => {
      try { return new URL(u).pathname; } catch { return ''; }
    }).filter(Boolean);

    if (paths.length < 2) {
      // Single article — try to create template from that
      const path = paths[0];
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 1) {
        // Replace the last segment (likely the slug) with {article_slug}
        const templateParts = [...parts];
        templateParts[templateParts.length - 1] = '{article_slug}';
        // Check if any middle segments look like dates
        for (let i = 0; i < templateParts.length - 1; i++) {
          if (/^\d{4}$/.test(parts[i])) templateParts[i] = '{YYYY}';
          else if (/^\d{2}$/.test(parts[i]) && parseInt(parts[i]) <= 12) templateParts[i] = '{MM}';
        }
        return basePath + '/' + templateParts.join('/');
      }
      return null;
    }

    // Analyze common patterns across multiple URLs
    const segmentCounts = paths.map(p => p.split('/').filter(Boolean).length);
    const commonLength = Math.min(...segmentCounts);

    // Build template from most common URL structure
    const firstParts = paths[0].split('/').filter(Boolean);
    const templateParts = [];

    for (let i = 0; i < commonLength; i++) {
      const segments = paths.map(p => p.split('/').filter(Boolean)[i]);
      const unique = new Set(segments);

      if (unique.size === 1) {
        // All URLs share this segment — it's a fixed part
        templateParts.push(firstParts[i]);
      } else if (segments.every(s => /^\d{4}$/.test(s))) {
        templateParts.push('{YYYY}');
      } else if (segments.every(s => /^\d{2}$/.test(s) && parseInt(s) <= 12)) {
        templateParts.push('{MM}');
      } else if (segments.every(s => /^\d{2}$/.test(s) && parseInt(s) <= 31)) {
        templateParts.push('{DD}');
      } else {
        templateParts.push('{article_slug}');
      }
    }

    // Add trailing slash if original URLs have it
    const hasTrailingSlash = sameDomain.some(u => new URL(u).pathname.endsWith('/'));
    const template = basePath + '/' + templateParts.join('/') + (hasTrailingSlash ? '/' : '');

    return template;
  } catch (err) {
    console.error(`[onboard] Error generating link template:`, err.message);
    return null;
  }
}

// ============================================================================
// MAIN ONBOARDING FUNCTION
// ============================================================================

/**
 * Fully automated source onboarding pipeline.
 *
 * @param {string} sourceUrl - The URL of the news source's article listing page
 * @param {object} options - Configuration options
 * @param {string} [options.name] - Name for the source (auto-detected if not provided)
 * @param {object} [options.pool] - PostgreSQL pool for DB operations
 * @param {string} [options.firecrawlApiKey] - Firecrawl API key override
 * @param {boolean} [options.saveToDB=false] - Whether to save the source to the database
 * @param {boolean} [options.dryRun=true] - If true, don't save but show what would be saved
 * @returns {object} - The onboarding result with proposed config and validation
 */
async function onboardSource(sourceUrl, options = {}) {
  const {
    name: providedName,
    pool,
    firecrawlApiKey,
    saveToDB = false,
    dryRun = true,
  } = options;

  let firecrawl = null;
  const fcKey = firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
  if (Firecrawl && fcKey) {
    firecrawl = new Firecrawl({ apiKey: fcKey });
  }

  const result = {
    sourceUrl,
    steps: {},
    proposedConfig: null,
    validation: null,
    saved: false,
    errors: [],
  };

  try {
    // Step 1: Fetch source page
    const sourcePage = await fetchSourcePage(sourceUrl, firecrawl);
    result.steps.fetchSource = {
      success: true,
      siteName: sourcePage.siteName,
      articleLinksFound: sourcePage.articleLinks.length,
      sampleLinks: sourcePage.articleLinks.slice(0, 5),
    };

    if (sourcePage.articleLinks.length === 0) {
      result.errors.push('No article links found on source page');
      console.error('[onboard] No article links found. Cannot proceed.');
      return result;
    }

    // Step 2: Fetch a sample article page for DOM analysis
    const sampleUrl = sourcePage.articleLinks[0];
    const articlePage = await fetchArticlePage(sampleUrl, firecrawl);
    result.steps.fetchArticle = {
      success: true,
      url: sampleUrl,
      extracted: articlePage.extracted,
      markdownLength: articlePage.markdown?.length || 0,
    };

    // Step 3: Use LLM to detect selectors from the raw HTML
    let proposedSelectors;
    if (articlePage.rawHtml) {
      proposedSelectors = await detectSelectors(
        articlePage.rawHtml,
        sampleUrl,
        articlePage.extracted
      );
    } else {
      console.log(`[onboard] No raw HTML available, using Firecrawl extraction as fallback`);
      proposedSelectors = {
        _fallback: true,
        _reason: 'No raw HTML returned by Firecrawl',
      };
    }
    result.steps.detectSelectors = {
      success: !proposedSelectors._fallback,
      selectors: proposedSelectors,
    };

    // Step 3b: Generate article link template from discovered URLs
    const linkTemplate = proposedSelectors.article_link_template ||
      generateLinkTemplate(sourcePage.articleLinks, sourceUrl);
    console.log(`[onboard] Link template: ${linkTemplate || '(could not determine)'}`);

    // Step 4: Validate extraction using Firecrawl data as reference
    const validationData = {
      title: articlePage.extracted?.title,
      content: articlePage.markdown,
      publication_date: articlePage.extracted?.publication_date,
      author: articlePage.extracted?.author,
      thumbnail_url: articlePage.extracted?.thumbnail_url,
    };

    const validation = validateArticle(validationData);
    result.validation = validation;
    result.steps.validate = {
      success: validation.valid,
      fieldResults: validation.fieldResults,
      issues: validation.issues,
    };

    console.log(`[onboard] Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    for (const [field, status] of Object.entries(validation.fieldResults)) {
      console.log(`  ${field}: ${status}`);
    }
    if (validation.issues.length > 0) {
      console.log(`  Issues: ${validation.issues.join('; ')}`);
    }

    // Step 5: Build proposed source config
    // When LLM fails, use CMS-detected selectors as fallback
    const cmsSelectors = sourcePage.cmsHints?.selectors || {};
    const useCmsFallback = proposedSelectors._fallback && Object.keys(cmsSelectors).length > 0;
    if (useCmsFallback) {
      console.log(`[onboard] Using CMS fallback selectors (${sourcePage.cmsHints.cms})`);
    }

    const sourceName = providedName || sourcePage.siteName || new URL(sourceUrl).hostname;
    const proposedConfig = {
      name: sourceName,
      url: sourceUrl,
      is_active: true,
      scraping_method: 'opensource', // Always try opensource first — scraper has fallback extraction
      os_title_selector: proposedSelectors.os_title_selector || cmsSelectors.title || null,
      os_content_selector: proposedSelectors.os_content_selector || cmsSelectors.content || null,
      os_date_selector: proposedSelectors.os_date_selector || cmsSelectors.date || null,
      os_author_selector: proposedSelectors.os_author_selector || cmsSelectors.author || null,
      os_thumbnail_selector: proposedSelectors.os_thumbnail_selector || cmsSelectors.thumbnail || null,
      os_topics_selector: null,
      include_selectors: proposedSelectors.include_selectors || null,
      exclude_selectors: proposedSelectors.exclude_selectors || null,
      article_link_template: linkTemplate,
      exclude_patterns: null,
      enable_ai_summary: true,
      enable_ai_tags: true,
      enable_ai_image: true,
      enable_ai_translations: true,
      scrape_after_date: new Date().toISOString(),
      _cms_detected: sourcePage.cmsHints?.cms || 'unknown',
    };

    result.proposedConfig = proposedConfig;

    console.log(`\n[onboard] Proposed source configuration:`);
    for (const [key, value] of Object.entries(proposedConfig)) {
      if (value !== null) console.log(`  ${key}: ${value}`);
    }

    // Validate a second article to confirm selectors work across the source
    if (sourcePage.articleLinks.length > 1) {
      const secondUrl = sourcePage.articleLinks[1];
      console.log(`\n[onboard] Cross-validating with second article: ${secondUrl}`);
      try {
        const secondPage = await fetchArticlePage(secondUrl, firecrawl);
        const secondValidation = validateArticle({
          title: secondPage.extracted?.title,
          content: secondPage.markdown,
          publication_date: secondPage.extracted?.publication_date,
          author: secondPage.extracted?.author,
          thumbnail_url: secondPage.extracted?.thumbnail_url,
        });
        result.steps.crossValidate = {
          success: secondValidation.valid,
          url: secondUrl,
          fieldResults: secondValidation.fieldResults,
          issues: secondValidation.issues,
        };
        console.log(`  Cross-validation: ${secondValidation.valid ? 'PASSED' : 'FAILED'}`);
      } catch (err) {
        console.log(`  Cross-validation failed: ${err.message}`);
        result.steps.crossValidate = { success: false, error: err.message };
      }
    }

    // Step 6: Save to database if requested
    if (saveToDB && pool && !dryRun) {
      console.log(`\n[onboard] Saving source to database...`);
      try {
        const insertResult = await pool.query(
          `INSERT INTO sources (name, url, is_active, scraping_method,
            os_title_selector, os_content_selector, os_date_selector,
            os_author_selector, os_thumbnail_selector, os_topics_selector,
            include_selectors, exclude_selectors, article_link_template,
            exclude_patterns, enable_ai_summary, enable_ai_tags,
            enable_ai_image, enable_ai_translations, scrape_after_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING *`,
          [
            proposedConfig.name, proposedConfig.url, proposedConfig.is_active,
            proposedConfig.scraping_method,
            proposedConfig.os_title_selector, proposedConfig.os_content_selector,
            proposedConfig.os_date_selector, proposedConfig.os_author_selector,
            proposedConfig.os_thumbnail_selector, proposedConfig.os_topics_selector,
            proposedConfig.include_selectors, proposedConfig.exclude_selectors,
            proposedConfig.article_link_template, proposedConfig.exclude_patterns,
            proposedConfig.enable_ai_summary, proposedConfig.enable_ai_tags,
            proposedConfig.enable_ai_image, proposedConfig.enable_ai_translations,
            proposedConfig.scrape_after_date ? new Date(proposedConfig.scrape_after_date) : null,
          ]
        );
        result.saved = true;
        result.savedSource = insertResult.rows[0];
        console.log(`[onboard] Source saved with ID: ${insertResult.rows[0].id}`);
      } catch (err) {
        result.errors.push(`DB save failed: ${err.message}`);
        console.error(`[onboard] Failed to save to DB:`, err.message);
      }
    } else if (dryRun) {
      console.log(`\n[onboard] DRY RUN — source not saved to database`);
    }

  } catch (err) {
    result.errors.push(err.message);
    console.error(`[onboard] Pipeline error:`, err.message);
  }

  return result;
}

// ============================================================================
// API ENDPOINT HANDLER
// ============================================================================

/**
 * Express route handler for POST /api/sources/onboard
 * Expects body: { url: string, name?: string, saveToDB?: boolean }
 */
async function handleOnboardRequest(req, res, pool) {
  const { url, name, saveToDB = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const result = await onboardSource(url, {
      name,
      pool,
      saveToDB,
      dryRun: !saveToDB,
    });

    res.json(result);
  } catch (err) {
    console.error('[onboard] API error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (require.main === module) {
  require('dotenv').config({ path: __dirname + '/../.env', quiet: true });
  const { Pool } = require('pg');

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node src/onboardSource.js <url> [name] [--save]');
    console.log('  <url>    Source page URL (required)');
    console.log('  [name]   Source name (optional, auto-detected)');
    console.log('  --save   Save to database (default: dry run)');
    process.exit(0);
  }

  const sourceUrl = args[0];
  const saveToDB = args.includes('--save');
  const nameArg = args.find(a => a !== sourceUrl && !a.startsWith('--'));

  // Use the production Render DB
  const pool = new Pool({
    user: 'mangoadmin',
    host: 'dpg-d0967lbe5dus738ar8f0-a.ohio-postgres.render.com',
    database: 'mangonews',
    password: 'pphAnw69sHfbcAwuGdXL2K9FWc0ydC8T',
    port: 5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  onboardSource(sourceUrl, {
    name: nameArg,
    pool,
    saveToDB,
    dryRun: !saveToDB,
  }).then(result => {
    console.log('\n' + '='.repeat(70));
    console.log('ONBOARDING RESULT');
    console.log('='.repeat(70));
    console.log(JSON.stringify(result, null, 2));
    pool.end();
  }).catch(err => {
    console.error('Fatal:', err);
    pool.end();
    process.exit(1);
  });
}

module.exports = {
  onboardSource,
  handleOnboardRequest,
  validateArticle,
  generateLinkTemplate,
  fetchSourcePage,
  fetchArticlePage,
  detectSelectors,
};
