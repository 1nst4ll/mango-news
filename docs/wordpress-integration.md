# WordPress Integration

Embed Mango News content in WordPress sites using widgets or HTML snippets.

## Integration Methods

### 1. Elementor Widget

For sites using Elementor:

1. Open page in Elementor editor
2. Drag "HTML Code" widget to your page
3. Paste content from `widgets/mango-news-content.html`

**Language Control:** Set `displayLanguage` in the JavaScript config:
```javascript
const config = {
  displayLanguage: 'es',  // 'en', 'es', or 'ht'
  // ...
};
```

### 2. Direct HTML/JS Embed

Copy snippets directly into your theme or page:

**Files:**
- `widgets/mango-news-content.html` - Full news feed
- `widgets/mango-news-single-article.html` - Single article display
- `widgets/mango-news-styles.html` - CSS styling

### 3. PHP Function / Shortcode

Add to your theme's `functions.php` or use the provided widget file.

**PHP Function:**
```php
<?php mango_news_feed(['language' => 'es']); ?>
```

**Shortcode:**
```
[mango_news_feed language="ht"]
```

## Widget Files

| File | Purpose |
|------|---------|
| `widgets/mango-news-content.html` | Main news feed HTML/JS |
| `widgets/mango-news-single-article.html` | Single article embed |
| `widgets/mango-news-styles.html` | CSS styles |

## Multilingual Support

The widgets respect the `displayLanguage` setting:

- `en` - English (default)
- `es` - Spanish
- `ht` - Haitian Creole

Translated content (titles, summaries, topics) is automatically displayed based on the configured language. Falls back to English if translation unavailable.

## Configuration Options

In the JavaScript config object:

```javascript
const config = {
  apiUrl: 'https://your-backend-url.com/api',
  displayLanguage: 'en',
  articlesPerPage: 10,
  showImages: true,
  showSummary: true,
  showTopics: true,
  topicFilter: null,  // Filter by specific topic
};
```

## Editing Widgets in WordPress

1. Log in to WordPress admin
2. Navigate to the page with the widget
3. Click "Edit with Elementor"
4. Select the HTML Code widget
5. Modify the code/settings
6. Save changes

## Styling

The `mango-news-styles.html` file contains CSS that can be customized:

- Colors and fonts
- Card layouts
- Responsive breakpoints
- Image sizing

For custom styling, copy and modify the CSS classes.

## API Requirements

Widgets fetch data from the backend API:

- `GET /api/articles` - Article list
- `GET /api/articles/:id` - Single article
- `GET /api/topics` - Topic list

Ensure your backend CORS settings allow requests from your WordPress domain.

## Related Documentation

- [Frontend UI](frontend-ui.md) - Reference implementation
- [API Documentation](api-documentation.md) - Endpoint details
- [Multilingual Support](multilingual-support.md) - Translation system
