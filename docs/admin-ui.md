# Settings Page - Admin Controls

The Settings page provides centralized management for news sources and scraping operations.

**Access:** `http://your-frontend-url/settings` (requires authentication)

## Overview & Stats Tab

View database statistics and charts:

- **Total Articles** and **Total Sources** counts
- **Articles per Source** - Bar chart
- **Articles per Year** - Bar chart

## Global Settings & Actions Tab

Controls for manual scraping operations:

### AI Generation Toggles

These apply to **manual** scraper runs only:

- **Generate AI Summaries** - Enable/disable summary generation
- **Generate AI Tags** - Enable/disable topic assignment
- **Generate AI Images** - Enable/disable image generation
- **Generate AI Translations** - Enable/disable Spanish/Haitian Creole translations

### Actions

- **Trigger Full Scraper Run** - Scrape all active sources
- **Purge All Articles** - Delete all articles (requires confirmation)

## Scheduled Tasks Tab

Configure automated background jobs:

### Main Scraper Schedule

- **Cron Expression** - When to run the main scraper (default: `0 * * * *` hourly)

### Missing AI Processor Schedule

- **Cron Expression** - When to process missing AI data (default: `*/20 * * * *`)
- **Process Missing Summaries** - Toggle scheduled summary generation
- **Process Missing Tags** - Toggle scheduled tag assignment
- **Process Missing Images** - Toggle scheduled image generation
- **Process Missing Translations** - Toggle scheduled translations

### Sunday Edition Schedule

- **Cron Expression** - When to generate weekly summary (default: `0 0 * * 0` Sunday midnight)

**Save Schedule Settings** - Persist cron configurations to database

## Source Management Tab

### Source List

Each source displays:

- Name and URL
- Active status
- AI settings (summary, tags, image, translations enabled)
- Scraping method (opensource/firecrawl)
- Configured selectors

### Source Actions

| Action | Description |
|--------|-------------|
| **Scrape Now** | Trigger immediate scrape for this source |
| **Delete Articles** | Remove all articles from this source |
| **Edit** | Open configuration dialog |
| **Delete Source** | Remove source entirely |
| **View Articles** | Navigate to article management page |
| **Process Missing AI** | Generate missing AI content for all articles |

### Add/Edit Source Dialog

**Basic Settings:**
- Name, URL, Active status
- Scraping method (opensource/firecrawl)

**AI Settings (per-source):**
- Enable AI Summary
- Enable AI Tags
- Enable AI Image
- Enable AI Translations

**Open Source Selectors:**
- Title, Content, Date, Author, Thumbnail, Topics selectors
- Include/Exclude selectors for content filtering

**Advanced:**
- Article Link Template - URL pattern for discovering articles
- Exclude Patterns - Query parameters to strip from URLs
- Scrape After Date - Ignore articles before this date

## Source Articles Page

Located at `/settings/source/[sourceId]`, this page manages articles for a specific source.

### Article Table Columns

| Column | Description |
|--------|-------------|
| ID | Article database ID |
| Title | Article title (clickable) |
| URL | Source URL |
| Thumbnail | Preview image |
| Publication Date | When published |
| AI Summary | Generated summary status |
| AI Tags | Assigned topics |
| AI Image | Generated image status |

### Article Actions (Dropdown)

- **Copy ID** - Copy article ID to clipboard
- **Rerun Summary** - Regenerate AI summary
- **Rerun Tags** - Regenerate topic assignments
- **Rerun Image** - Regenerate AI image
- **Rerun Translations** - Regenerate translations
- **Rescrape** - Re-fetch content from source
- **Edit Article** - Open edit dialog
- **Delete** - Remove article (with confirmation)

### Bulk Actions

- **Rescrape All Articles** - Re-scrape all articles (streams progress via SSE)
- **Process Missing AI Data** - Generate missing AI content for source

### Article Edit Dialog

Edit individual article fields:

- Title (English, Spanish, Haitian Creole)
- Summary (all languages)
- Content (all languages)
- Topics (all languages)
- Publication date
- Thumbnail URL

## Related Documentation

- [Frontend UI](frontend-ui.md) - Overall frontend architecture
- [Scraping Methods](scraping-methods.md) - Scraper configuration
- [CSS Selectors](css-selectors.md) - Selector syntax guide
- [Troubleshooting](troubleshooting.md) - Common issues
