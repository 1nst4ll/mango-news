# Scraping Methods

Mango News supports two scraping methods: **Open Source** (Puppeteer) and **Firecrawl** (API-based).

## Open Source Scraping (Puppeteer)

Uses a headless browser to navigate websites and extract content via CSS selectors.

### When to Use

- Need fine-grained control over scraping
- Sites with dynamic JavaScript content
- Prefer self-hosted solution

### Configuration

Set `scraping_method: 'opensource'` on the source.

**Required Selectors:**
- `os_content_selector` - Main article content area

**Optional Selectors:**
- `os_title_selector` - Article title
- `os_date_selector` - Publication date
- `os_author_selector` - Author name
- `os_thumbnail_selector` - Featured image
- `os_topics_selector` - Category/topic tags

**Content Filtering:**
- `include_selectors` - CSS selectors to include
- `exclude_selectors` - Elements to remove (ads, sidebars)

### Article Discovery

The scraper discovers article URLs by:

1. Loading the source homepage
2. Finding links matching `article_link_template`
3. Crawling up to depth 3 from homepage
4. Filtering URLs matching the source domain

**Article Link Template Examples:**
```
https://example.com/news/{slug}
https://example.com/\d{4}/\d{2}/{slug}/
```

**Exclude Patterns:** Strip query parameters from discovered URLs:
```
utm_source,utm_medium,share,fbclid
```

### Browser Pool

A single Puppeteer browser instance is shared across all scraping operations to conserve memory. See [`backend/src/browserPool.js`](../backend/src/browserPool.js).

## Firecrawl Scraping

Uses the Firecrawl API for managed content extraction.

### When to Use

- Prefer API-based simplicity
- Don't want to manage headless browsers
- Need structured markdown output

### Configuration

1. Set `FIRECRAWL_API_KEY` in environment
2. Set `scraping_method: 'firecrawl'` on the source

### How It Works

1. Backend sends article URL to Firecrawl API
2. Firecrawl returns clean content (markdown/HTML)
3. Backend processes and stores the content

## AI Features

AI processing runs after content extraction:

| Feature | API | Description |
|---------|-----|-------------|
| **Summary** | Groq (Llama) | SEO-optimized article summary |
| **Topics** | Groq | Assigns 3 topics from 31 predefined categories |
| **Image** | Ideogram | Generates relevant image if no thumbnail found |
| **Translations** | Groq | Spanish and Haitian Creole translations |

### AI Toggle Logic

**Scheduled/Full Scrapes:** Feature enabled if:
- Global toggle is ON (from request or default)
- AND source-level toggle is ON

**Per-Source Scrapes:** Feature enabled if:
- Source-level toggle is ON
- (Global toggles are ignored)

### Enable AI Per-Source

In source configuration:
- `enable_ai_summary` - Generate summaries
- `enable_ai_tags` - Assign topic tags
- `enable_ai_image` - Generate missing images
- `enable_ai_translations` - Generate translations

## Scrape After Date

Set `scrape_after_date` on a source to ignore articles published before that date. Useful for avoiding historical content during initial setup.

## URL Blacklist

Exclude specific URLs from scraping via `backend/config/blacklist.json`:

```json
[
  "https://example.com/page-to-skip",
  "https://example.com/category/excluded/"
]
```

Matching uses prefix comparison, so partial URLs block all matching pages.

## Related Documentation

- [CSS Selectors](css-selectors.md) - Selector syntax guide
- [Admin UI](admin-ui.md) - Source configuration interface
- [Backend Setup](backend-setup.md) - Environment configuration
