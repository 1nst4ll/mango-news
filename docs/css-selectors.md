# CSS Selectors for Scraping

This guide explains how to find and configure CSS selectors for Open Source (Puppeteer) scraping. Selectors are set per-source in the Admin UI or via the API.

## Finding Selectors

1. Open the target article page in your browser
2. Right-click the element you want → **Inspect**
3. Identify a stable class, ID, or tag combination
4. Test in browser console: `document.querySelector('your-selector')`

**Tips:**
- Prefer IDs and semantic class names over deeply nested paths
- More specific = more reliable now, but more fragile when the site updates
- Test on multiple articles to confirm the selector is consistent

## Selector Fields

### Content Selector (`os_content_selector`) — required

Targets the main article body container. Everything inside this element becomes the article text.

```css
.entry-content
article .content
div.article-body
```

### Title Selector (`os_title_selector`)

```css
h1.entry-title
article header h1
.post-title
```

If omitted, the scraper tries fallback selectors: `h1.entry-title`, `h1.post-title`, `h1[itemprop="headline"]`, `og:title`, then generic `h1`.

### Date Selector (`os_date_selector`)

```css
time.published
.entry-date
span.post-date
meta[property='article:published_time']
```

### Author Selector (`os_author_selector`)

```css
.author-name
.byline a
span.vcard .fn
```

### Thumbnail Selector (`os_thumbnail_selector`)

Use `::src` or `::attr(src)` to extract the image URL rather than the element:

```css
.post-thumbnail img::src
meta[property='og:image']::content
img.wp-post-image::src
```

### Topics Selector (`os_topics_selector`)

```css
.post-categories a
.tags-links a
.entry-meta .cat-links a
```

## Include / Exclude Selectors

**Include selectors** — restrict content extraction to specific areas (comma-separated):
```
.article-content, .post-body
```

**Exclude selectors** — remove unwanted elements before extraction (comma-separated):
```
.advertisement, .sidebar, .social-share, .related-posts, .comments
```

Exclude selectors are applied inside the content selector, so they only remove matched elements within the article body.

## Common WordPress Patterns

Most WordPress sites use these standard class names:

| Element | Selectors |
|---------|-----------|
| Title | `h1.entry-title`, `.post-title` |
| Content | `.entry-content`, `.post-content` |
| Date | `.entry-date`, `time.published` |
| Author | `.author`, `.vcard .fn` |
| Thumbnail | `.post-thumbnail img`, `meta[property='og:image']` |
| Categories | `.cat-links a`, `.post-categories a` |
| Tags | `.tags-links a`, `.post-tags a` |

### Full WordPress example

```
os_title_selector:     h1.entry-title
os_content_selector:   .entry-content
os_date_selector:      time.entry-date
os_author_selector:    .author-name
os_thumbnail_selector: meta[property='og:image']::content
os_topics_selector:    .cat-links a
exclude_selectors:     .sharedaddy, .jp-relatedposts, .comments
```

### WordPress + Elementor example

Elementor sites often use different content containers:

```
os_title_selector:     h1.entry-title
os_content_selector:   div.page-content
os_date_selector:      meta[property='article:published_time']
os_author_selector:    meta[name='author']
exclude_selectors:     .elementor-post__meta-data
article_link_template: https://example.com/{article_slug}/
```

## Article Link Template

The `article_link_template` field uses placeholder syntax (not raw regex) to define the URL pattern for articles. The scraper converts placeholders to regex internally.

### Placeholder syntax

| Placeholder | Matches | Example |
|------------|---------|---------|
| `{article_slug}` | Any path segment (`[^/]+`) | `my-article-title` |
| `{YYYY}` | 4-digit year | `2026` |
| `{MM}` | 2-digit month | `03` |
| `{DD}` | 2-digit day | `28` |
| `{slug}` | Any path segment | Same as `{article_slug}` |
| `{id:(regex)}` | Custom regex pattern | `{id:(111\|129\|135)}` |

### Examples

```
# WordPress date-based URLs
https://example.com/{YYYY}/{MM}/{article_slug}/

# Simple slug under root
https://example.com/{article_slug}/

# Category + slug
https://suntci.com/{slug}-p{id1}-{id2}.htm

# Custom ID filter
https://example.com/post/{id:(news\|sports)}/{article_slug}
```

### Heuristic discovery (no template)

If `article_link_template` is not set, the scraper uses heuristic scoring to identify article links. Links are scored by:
- URL structure (slug length, dash count, date patterns in path)
- Path keywords (`/news/`, `/article/`, `/post/`, `/press/`)
- Anchor text length (articles have descriptive titles, nav links are short)
- DOM context (links inside `article`, `.post`, `.card`, `.elementor-post` containers)

Links scoring 3+ are treated as potential articles. This allows sources to work without manual template configuration.

### Exclude patterns

Query parameters to strip from discovered URLs (comma-separated):
```
utm_source,utm_medium,fbclid,share
```

## Debugging

If scraping produces no content or wrong content:

1. **Verify the selector in browser console** — `document.querySelector('.entry-content')` should return an element
2. **Check multiple articles** — the selector must work across the source, not just one page
3. **Inspect the raw HTML** — view page source to see what the browser actually loads vs. what Puppeteer sees
4. **Check exclude selectors** — an overly broad exclude may be removing content
5. **Review backend logs** — the scraper logs what it extracted for each field

See [Troubleshooting](troubleshooting.md#scraping-specific-issues) for common scraping problems.

## Related Documentation

- [Scraping Methods](scraping-methods.md) - How the scraper uses selectors
- [Admin UI](admin-ui.md) - Where to configure selectors
- [Troubleshooting](troubleshooting.md) - Diagnosing scraping failures
