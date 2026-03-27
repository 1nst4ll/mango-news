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

1. Load the source homepage
2. Find all links matching `article_link_template` (regex pattern)
3. Filter to source domain only
4. Strip query parameters listed in `exclude_patterns` (e.g. `utm_source,fbclid,share`)
5. Skip URLs in `backend/config/blacklist.json` (prefix match)
6. Skip articles older than `scrape_after_date` if set

### Browser Pool

A single Puppeteer instance (`src/browserPool.js`) is shared across all scraping operations to conserve memory. The backend logs `[BROWSER] Connected: true, PID: XXXX` to confirm it's alive.

## Firecrawl (API-based)

Sends article URLs to the [Firecrawl](https://firecrawl.dev) API and receives clean markdown/HTML back. Simpler to configure — no selectors needed.

### Configuration

1. Set `FIRECRAWL_API_KEY` in `backend/.env`
2. Set `scraping_method: 'firecrawl'` on the source

No CSS selectors required. Firecrawl handles extraction and returns structured content.

### When to use Firecrawl vs Open Source

| | Open Source | Firecrawl |
|---|---|---|
| CSS selectors required | Yes | No |
| Works offline / self-hosted | Yes | No (external API) |
| Handles JS-heavy sites | Yes (headless Chrome) | Yes |
| Cost | Free | Paid API |
| Control | Full | Limited |

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

- [CSS Selectors](css-selectors.md) - Selector syntax, examples, debugging
- [Admin UI](admin-ui.md) - Source configuration interface
- [AI Optimization Analysis](ai-optimization-analysis.md) - AI service architecture
- [Troubleshooting](troubleshooting.md) - Common scraping issues
