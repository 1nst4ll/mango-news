# CSS Selectors for Scraping

This guide helps you identify and configure CSS selectors for scraping news sources.

## Finding Selectors

1. Open the target website in your browser
2. Right-click on the element you want to extract
3. Select "Inspect" to open Developer Tools
4. Identify unique classes, IDs, or tag structures

**Tips:**
- Prefer classes/IDs over deeply nested selectors
- Test selectors in browser console: `document.querySelector('your-selector')`
- More specific = more reliable, but also more fragile to site changes

## Selector Types

### Title Selector

Targets the article headline:
```css
h1.entry-title
article header h1
.post-title
```

### Content Selector

Targets the main article body:
```css
.entry-content
article .content
div.article-body
main .post-content
```

### Date Selector

Targets publication date:
```css
time.published
.entry-date
span.post-date
meta[property='article:published_time']::attr(content)
```

### Author Selector

Targets the author name:
```css
.author-name
.byline a
span.vcard .fn
```

### Thumbnail Selector

Targets the featured image:
```css
.post-thumbnail img::src
.featured-image img::src
meta[property='og:image']::content
img.wp-post-image::src
```

Use `::src` or `::attr(src)` to get the image URL instead of the element.

### Topics Selector

Targets category/tag links:
```css
.post-categories a
.tags-links a
.entry-meta .cat-links a
```

## Include/Exclude Selectors

### Include Selectors

Specify content areas to extract (comma-separated):
```
.article-content, .post-body
```

### Exclude Selectors

Remove unwanted elements (comma-separated):
```
.advertisement, .sidebar, .social-share, .related-posts, .comments
```

## Common WordPress Patterns

WordPress sites often use consistent class names:

| Element | Common Selectors |
|---------|-----------------|
| Title | `h1.entry-title`, `.post-title` |
| Content | `.entry-content`, `.post-content` |
| Date | `.entry-date`, `time.published` |
| Author | `.author`, `.vcard .fn` |
| Thumbnail | `.post-thumbnail img`, `meta[property='og:image']` |
| Categories | `.cat-links a`, `.post-categories a` |
| Tags | `.tags-links a`, `.post-tags a` |

## Source-Specific Examples

### Example: WordPress News Site

```
os_title_selector: h1.entry-title
os_content_selector: .entry-content
os_date_selector: time.entry-date
os_author_selector: .author-name
os_thumbnail_selector: meta[property='og:image']::content
os_topics_selector: .cat-links a
include_selectors: .entry-content
exclude_selectors: .sharedaddy, .jp-relatedposts, .comments
```

### Example: Custom CMS

```
os_title_selector: article h1
os_content_selector: article .content
os_date_selector: .article-meta .date
os_author_selector: .article-meta .author
os_thumbnail_selector: .hero-image img::src
os_topics_selector: .article-tags a
```

## Debugging Selectors

If scraping fails:

1. **Check selector validity** - Paste into browser console
2. **Verify site hasn't changed** - Websites update their HTML
3. **Check for dynamic content** - May need to wait for JavaScript
4. **Review backend logs** - See what content was extracted

## Related Documentation

- [Scraping Methods](scraping-methods.md) - Open Source vs Firecrawl
- [Admin UI](admin-ui.md) - Configure selectors in UI
- [Troubleshooting](troubleshooting.md) - Common scraping issues
