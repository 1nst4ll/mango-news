# WordPress Integration

Embed Mango News content in WordPress using pre-built HTML/JS widget files in the `widgets/` directory.

## Widget Files

| File | Purpose |
|---|---|
| `widgets/mango-news-content.html` | Full paginated news feed |
| `widgets/mango-news-single-article.html` | Single article display |
| `widgets/mango-news-styles.html` | Shared CSS styles |

## Integration Methods

### 1. Elementor HTML Widget

1. Edit the page in Elementor
2. Drag an **HTML Code** widget to the page
3. Paste the contents of `widgets/mango-news-content.html`
4. Save

### 2. Direct HTML Embed

Paste the widget file content directly into any theme template, page builder block, or custom HTML area. Include `mango-news-styles.html` once per page if using multiple widgets.

### 3. PHP Shortcode

If your theme supports it:

```php
<?php mango_news_feed(['language' => 'es']); ?>
```

Or as a shortcode: `[mango_news_feed language="ht"]`

## Widget Configuration

Each widget contains a JavaScript config object at the top:

```javascript
const config = {
  apiUrl: 'https://your-backend-url.com/api',  // required
  displayLanguage: 'en',    // 'en', 'es', or 'ht'
  articlesPerPage: 10,
  showImages: true,
  showSummary: true,
  showTopics: true,
  topicFilter: null,        // restrict to one topic, e.g. 'Politics'
};
```

Set `apiUrl` to your deployed backend URL. The widget fetches from `GET /api/articles` and `GET /api/topics` — ensure your backend CORS config allows requests from your WordPress domain.

## Multilingual Support

Set `displayLanguage` to `en`, `es`, or `ht`. The widget displays translated titles, summaries, and topics when available, falling back to English if a translation is missing.

## CORS Configuration

The backend must allow requests from your WordPress domain. In `backend/src/index.js`, the CORS configuration uses the `cors` package. If your WordPress site is on a different domain than the backend, add it to the allowed origins in the CORS config or set a permissive policy for public read endpoints.

## Styling

`mango-news-styles.html` contains scoped CSS. To customize:
- Copy the CSS into your theme's stylesheet
- Adjust colors, fonts, card layout, and responsive breakpoints as needed
- Widget classes are prefixed to avoid conflicts with theme styles

## API Endpoints Used

The widgets call these public (unauthenticated) endpoints:

- `GET /api/articles` — article list with pagination and filtering
- `GET /api/articles/:id` — single article detail
- `GET /api/topics` — topic list for filter UI

See [API Documentation](api-documentation.md) for query parameters and response shapes.

## Related Documentation

- [API Documentation](api-documentation.md) - Endpoint details and query parameters
- [Multilingual Support](multilingual-support.md) - Translation system
- [Frontend UI](frontend-ui.md) - Reference implementation of the same API
