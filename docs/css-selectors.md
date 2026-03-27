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

If omitted, the scraper falls back to the page `<title>` tag.

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

## Article Link Template

The `article_link_template` field is a regex pattern used to discover article URLs from the source homepage. The scraper finds all links on the homepage and keeps only those matching this pattern.

```
# Match date-based URLs
https://example.com/\d{4}/\d{2}/[^/]+/

# Match path prefix
https://example.com/news/[^/]+

# Match any slug under /articles/
https://example.com/articles/.+
```

**Exclude patterns** — query parameters to strip from discovered URLs:
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
