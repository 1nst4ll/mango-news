# Admin UI — Settings and Source Management

**Access:** `/settings` (requires login)

The Settings page is the control center for sources, scraping, AI, and scheduling.

## Overview & Stats Tab

- **Total Articles** and **Total Sources** counts
- **Articles per Source** — bar chart
- **Articles per Year** — bar chart

## Global Settings Tab

AI toggles that apply to **manual** scraper runs only (scheduled runs use per-source settings):

- Generate AI Summaries
- Generate AI Tags
- Generate AI Images
- Generate AI Translations

**Actions:**
- **Trigger Full Scraper Run** — scrapes all active sources immediately
- **Purge All Articles** — deletes all articles (confirmation required)

## Scheduled Tasks Tab

Configure the three background cron jobs:

| Job | Default schedule | Controls |
|-----|-----------------|---------|
| Main Scraper | `0 * * * *` (hourly) | Cron expression |
| Missing AI Processor | `*/20 * * * *` | Cron expression + per-feature toggles |
| Sunday Edition | `0 0 * * 0` (Sunday midnight) | Cron expression |

The Missing AI Processor has individual toggles for summaries, tags, images, and translations. Click **Save Schedule Settings** to persist — changes take effect immediately without restart.

See [API Documentation](api-documentation.md) for the scheduler endpoints (`GET/POST /api/settings/scheduler`).

## Source Management Tab

### Source List

Each source card shows: ID, name, URL, article count, active status, AI settings, and scraping method.

### Source Actions

| Action | Description |
|--------|-------------|
| **Scrape Now** | Trigger immediate scrape for this source |
| **Delete Articles** | Remove all articles from this source |
| **Edit** | Open configuration dialog |
| **Delete Source** | Remove source entirely |
| **View Articles** | Navigate to article management (`/settings/source/[id]`) |

### Add / Edit Source Dialog

**Basic:**
- Name, URL, Active status
- Scraping method: `opensource` (Puppeteer) or `firecrawl`

**AI Settings (per-source):**
- Enable AI Summary, Tags, Image, Translations

**Open Source Selectors** (CSS selectors for Puppeteer scraping):
- Title, Content, Date, Author, Thumbnail, Topics
- Include / Exclude selectors for content filtering

**Advanced:**
- `article_link_template` — URL regex pattern for article discovery
- `exclude_patterns` — query parameters to strip (e.g. `utm_source,fbclid`)
- `scrape_after_date` — ignore articles published before this date

See [CSS Selectors](css-selectors.md) for selector syntax and examples, and [Scraping Methods](scraping-methods.md) for how each method works.

---

## Source Articles Page

**Access:** `/settings/source/[sourceId]`

Manages individual articles for a specific source.

### Navigation

- **← / →** arrows in the header step between sources by ID
- **Back to Settings** returns to the source list

### Article Table

Rows per page: 10, 20, 50, 100 — persisted to `localStorage`. Column visibility also persisted.

| Column | Notes |
|--------|-------|
| ID | Database ID |
| Title | Clickable — opens article on site in new tab |
| URL | Original source URL |
| Thumbnail | Clickable — opens full-size lightbox |
| Publication Date | — |
| AI Summary | Generated summary text |
| AI Tags | Assigned topic names |
| AI Image | Clickable — opens full-size lightbox |

### Article Actions (row dropdown)

- **Copy ID** — copy to clipboard
- **Rerun Summary / Tags / Image / Translations** — regenerate individual AI features
- **Rescrape** — re-fetch content from source URL
- **Edit Article** — open edit dialog (see below)
- **Delete** — remove article

### Bulk Actions

- **Rescrape All Articles** — re-scrapes every article in the source, streaming progress via SSE
- **Process Missing AI Data** — generates any missing AI content for all articles

---

## Article Edit Dialog

Full-width modal (80% viewport) for editing article content.

**Meta fields:**
- Title, Author, Publication Date, Source URL, Thumbnail URL, Topics

**Summary** — plain textarea (English only)

**Content tabs — English / Spanish / Haitian Creole:**

Each tab contains:
- Title and Summary fields (translated tabs)
- **WYSIWYG editor** (TipTap) — Bold, Italic, Strike, H2, H3, Bullet list, Ordered list, Blockquote, Link, Image, Undo/Redo
- **`</> HTML` toggle** — switches to raw HTML textarea; syncs back to WYSIWYG on toggle
- **Live preview** — renders current HTML side-by-side

---

## Related Documentation

- [Frontend UI](frontend-ui.md) - Overall frontend architecture
- [Scraping Methods](scraping-methods.md) - How each scraping method works
- [CSS Selectors](css-selectors.md) - Selector syntax and debugging
- [API Documentation](api-documentation.md) - Source and article API endpoints
- [Troubleshooting](troubleshooting.md) - Common issues with sources and scraping
