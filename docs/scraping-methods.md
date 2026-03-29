# Scraping Methods

Mango News supports two scraping methods, configured per source.

## Open Source (Puppeteer)

A headless Chromium browser navigates each site and extracts content via CSS selectors. Best for JavaScript-rendered sites and when you need full control over extraction.

### Configuration

Set `scraping_method: 'opensource'` on the source. Then configure selectors:

| Selector field | What it targets | Required? |
|---|---|---|
| `os_content_selector` | Main article body | Yes |
| `os_title_selector` | Article headline | No |
| `os_date_selector` | Publication date | No |
| `os_author_selector` | Author name | No |
| `os_thumbnail_selector` | Featured image | No |
| `os_topics_selector` | Category/tag links | No |
| `include_selectors` | Restrict content to these areas | No |
| `exclude_selectors` | Remove elements (ads, nav, related posts) | No |

See [CSS Selectors](css-selectors.md) for selector syntax, examples, and debugging.

### Article Discovery

1. Load the source page using `networkidle2` wait strategy (catches JS-rendered content from Elementor, React, etc.)
2. Scroll the page incrementally to trigger lazy-loaded article lists (infinite scroll, Elementor widgets)
3. Extract all links with DOM context (parent container class names for heuristic scoring)
4. **Template matching**: if `article_link_template` is set, match links against the template regex
5. **Heuristic matching**: if no template, score links by URL structure (slug length, date patterns, path keywords) and DOM context (links inside `article`, `.post`, `.card` containers score higher)
6. **Pagination following**: automatically detect and follow WordPress `/page/N/`, `?page=N`, `?p=N` pagination links (up to 20 pages)
7. Filter to source domain only
8. Strip query parameters listed in `exclude_patterns` (e.g. `utm_source,fbclid,share`)
9. Skip URLs in `backend/config/blacklist.json` (prefix match)
10. Skip 40+ common non-article paths (`/contact`, `/about`, `/login`, `/admin`, `/wp-content`, etc.)
11. Skip articles older than `scrape_after_date` if set

Crawl depth is 2 (source → pagination/category → articles), increased from 1 to support paginated listings.

### Fallback Extraction

When configured CSS selectors return empty content, the scraper automatically tries common fallback selectors:

| Field | Fallback chain |
|-------|---------------|
| Title | `h1.entry-title` → `h1.post-title` → `h1[itemprop="headline"]` → `og:title` → `h1` |
| Content | `.entry-content` → `.post-content` → `div.page-content` → `[itemprop="articleBody"]` → `article` |
| Date | `article:published_time` → `pubdate` → `DC.date.issued` → `time[datetime]` |
| Author | `meta[name="author"]` → `article:author` → `[rel="author"]` → `.author-name` → `.byline` |
| Thumbnail | `og:image` (excluding logos/icons) → first large image in content |

This makes the scraper resilient to site redesigns and allows sources to work with minimal or no selector configuration.

### Browser Pool

A single Puppeteer instance (`src/browserPool.js`) is shared across all scraping operations to conserve memory. The `getPage()` function accepts options:

| Option | Default | Purpose |
|--------|---------|---------|
| `allowImages` | `false` | Enable image loading (for thumbnail extraction) |
| `allowStyles` | `false` | Enable stylesheet loading (for layout-dependent pages) |
| `timeout` | `30000` | Navigation timeout in ms |

The backend logs `[BROWSER] Connected: true, PID: XXXX` to confirm it's alive.

## Firecrawl (API-based)

Sends article URLs to the [Firecrawl](https://firecrawl.dev) API and receives clean markdown/HTML back. Simpler to configure — no selectors needed.

### Configuration

1. Set `FIRECRAWL_API_KEY` in `backend/.env`
2. Set `scraping_method: 'firecrawl'` on the source

No CSS selectors required. Firecrawl handles extraction and returns structured content.

### When to use Firecrawl vs Open Source

| | Open Source | Firecrawl |
|---|---|---|
| CSS selectors required | Optional (fallback extraction available) | No |
| Works offline / self-hosted | Yes | No (external API) |
| Handles JS-heavy sites | Yes (headless Chrome + networkidle2) | Yes |
| Pagination support | Yes (auto-detects page links) | Limited |
| CMS auto-detection | Yes (WordPress, Wix, Ghost, etc.) | N/A |
| Cost | Free | Paid API |
| Control | Full | Limited |

---

## Source Onboarding Pipeline

The automated onboarding pipeline (`src/onboardSource.js`) configures new sources with minimal manual input. Given a news page URL, it:

1. **Fetches the page** via Firecrawl or HTTP+JSDOM fallback
2. **Detects CMS type** — WordPress (+ Elementor), Wix, Ghost, Joomla, Drupal — and proposes known-good default selectors
3. **Extracts article links** — first tries structured containers (`article.elementor-post`, `.post-list article`), then heuristic scoring on all links
4. **Detects CSS selectors** via LLM (Groq) or falls back to CMS-detected defaults
5. **Validates extraction** against 2 sample articles
6. **Generates link template** from discovered URL patterns
7. **Saves to database** (with `--save` flag)

### CLI usage

```bash
cd backend
node src/onboardSource.js <url> [name] [--save]

# Dry run (preview config without saving)
node src/onboardSource.js "https://example.com/news/" "Example News"

# Save to production DB
node src/onboardSource.js "https://example.com/news/" "Example News" --save
```

### API usage

```
POST /api/sources/onboard
Body: { "url": "https://example.com/news/", "name": "Example News", "saveToDB": true }
```

### CMS auto-detection

| CMS | Detection method | Default selectors |
|-----|-----------------|-------------------|
| WordPress | `wp-content` in HTML, generator meta tag | `h1.entry-title`, `.entry-content`, `article:published_time` |
| WordPress + Elementor | `elementor` in HTML | Same as WP + `div.page-content` content fallback |
| Wix | `wixstatic.com` in HTML | `h1[data-hook="post-title"]`, `div[data-id="content-viewer"]` |
| Ghost | Generator meta tag | `h1.article-title`, `.article-content`, `time[datetime]` |
| Joomla | `Joomla` or `/components/com_` | `h1`, `.item-page`, `time[datetime]` |
| Drupal | `Drupal` or `drupal.js` | `h1.page-title`, `.field--name-body`, `article:published_time` |

---

## HTML Sanitization Pipeline

Raw HTML from the Open Source scraper passes through a four-stage pipeline in `scraper.js` before being stored.

### Stage 1 — Pre-processing

- Strips `<figure>` / `<figcaption>` blocks entirely (prevents image captions leaking into body text)
- Converts `<br><br>` sequences into `<p>` breaks (handles sources like SunTCI that use line breaks instead of paragraphs)

### Stage 2 — DOMPurify

Removes scripts, iframes, event handlers, and unsafe attributes. Preserves structural and inline tags: `p`, `h1–h6`, `ul`, `ol`, `li`, `blockquote`, `strong`, `em`, `a`, `div`, `span`, etc.

### Stage 3 — Drop-cap removal

CMS-injected single-letter `<span>` elements (used for decorative drop caps) are replaced with plain text nodes so they don't render as oversized floating letters. The CSS in `article-content.css` applies its own drop-cap styling to the first paragraph instead.

### Stage 4 — Structured serialization

A DOM walker produces consistently structured output:

- `<p>` → `serializeParagraph()` — each paragraph becomes its own block; a `<p>` whose only child is `<strong>`/`<b>` is promoted to `<h3>`
- `<div>`, `<section>`, `<article>` → `serializeContainer()` — children are recursed so div-per-paragraph structures get proper breaks
- `<ul>`, `<ol>`, `<h1>–<h6>`, `<blockquote>` → preserved as-is
- `<strong>`, `<em>`, `<a>`, `<code>`, `<mark>`, `<sup>`, `<sub>` → preserved as inline formatting

### Source HTML patterns handled

| Source type | HTML pattern | Handled by |
|---|---|---|
| Magnetic Media | Standard `<p>` tags | `serializeParagraph` |
| NewslineTCI (Wix) | `<p>` with nested `<span>` | `serializeParagraph` + inline pass-through |
| TC Weekly News | One `<div>` per paragraph | `serializeContainer` |
| SunTCI | Plain text + `<br><br>` | Stage 1 pre-processing |
| TCI Police (WP+Elementor) | `<p>` in `div.page-content` | `serializeParagraph` |

---

## AI Processing

After content extraction, AI runs on each article (respecting per-source toggles):

| Feature | Service | Details |
|---|---|---|
| Summary | Groq Llama 3.3 70B | SEO-optimized, 80–100 words, 10K char input limit |
| Topics | Groq Llama 3.1 8B | 3 from 31 predefined categories, 5K char limit |
| Image | fal.ai FLUX.2 Turbo | Generated only when no thumbnail exists |
| Translations | Groq Llama 3.3 70B | ES + HT, all 6 fields in parallel |

### AI toggle logic

- **Scheduled / full scrapes**: feature runs if global toggle AND source-level toggle are both on
- **Single-source scrapes**: only source-level toggle applies

See [AI Optimization Analysis](ai-optimization-analysis.md) for caching, retry, and rate-limiting details.

---

## Related Documentation

- [CSS Selectors](css-selectors.md) - Selector syntax, templates, debugging
- [API Documentation](api-documentation.md) - Onboarding and scraping endpoints
- [Admin UI](admin-ui.md) - Source configuration interface
- [AI Optimization Analysis](ai-optimization-analysis.md) - AI service architecture
- [Troubleshooting](troubleshooting.md) - Common scraping issues
