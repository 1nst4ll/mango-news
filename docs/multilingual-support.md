# Multilingual Support (Spanish & Haitian Creole)

This document outlines the implementation of multilingual support for the Mango News application, including AI-powered translations for news article titles, summaries, topic tags, and **main article content**, as well as UI internationalization.

## Overview

The application now supports English (default), Spanish, and Haitian Creole. Users can switch languages via a new language switcher in the header. Dynamic content (article titles, summaries, topics, and main article content) is translated using the Groq API during the scraping process, and static UI text is managed via locale files.

## Backend Implementation

### Database Schema Changes (`db/schema.sql`)

The following columns have been added to the database to store translated content:

*   **`articles` table:**
    *   `title_es` (TEXT): Spanish translation of the article title.
    *   `summary_es` (TEXT): Spanish translation of the article summary.
    *   `raw_content_es` (TEXT): Spanish translation of the main article content.
    *   `title_ht` (TEXT): Haitian Creole translation of the article title.
    *   `summary_ht` (TEXT): Haitian Creole translation of the article summary.
    *   `raw_content_ht` (TEXT): Haitian Creole translation of the main article content.
*   **`topics` table:**
    *   `name_es` (VARCHAR(100)): Spanish translation of the topic name.
    *   `name_ht` (VARCHAR(100)): Haitian Creole translation of the topic name.

**Action Required:** Ensure these schema changes are applied to your PostgreSQL database.

### AI Translation Integration (`backend/src/scraper.js`)

A new function `generateAITranslation(text, targetLanguageCode, type)` has been added to `backend/src/scraper.js`. This function utilizes the Groq API to translate text into the specified target language (Spanish or Haitian Creole), with `type` allowing for specific handling of titles, summaries, and raw content.

The `processScrapedData` function has been updated to:
1.  Call `generateAITranslation` for the English `title`, `summary`, and **`raw_content`** to generate their Spanish and Haitian Creole counterparts.
2.  Save these translated titles, summaries, and **raw content** into the new `title_es`, `summary_es`, `raw_content_es`, `title_ht`, `summary_ht`, and `raw_content_ht` columns in the `articles` table.
3.  When a new topic is created, its name is saved along with its pre-translated Spanish and Haitian Creole equivalents from a static mapping (`topicTranslations`) into the `name_es` and `name_ht` columns in the `topics` table. If an existing topic is encountered, its translations are updated from this static mapping if they are missing or differ.

The `processAiForArticle` and `processMissingAiForSource` functions have been extended to support a new `featureType: 'translations'`. This allows for on-demand or scheduled processing to generate missing translations for existing articles, now including the **main article content**.

### API Endpoint Updates (`backend/src/index.js`)

The following API endpoints now return the translated fields:

*   **`GET /api/articles`**: The response for each article now includes `title_es`, `summary_es`, `raw_content_es`, `title_ht`, `summary_ht`, `raw_content_ht`, `topics_es`, and `topics_ht`.
*   **`GET /api/articles/:id`**: The response for a single article now includes `title_es`, `summary_es`, `raw_content_es`, `title_ht`, `summary_ht`, `raw_content_ht`, `topics_es`, and `topics_ht`.
*   **`GET /api/topics`**: The response for each topic now includes `name_es` and `name_ht`.

The frontend will use these fields based on the user's selected language.

## Frontend Implementation

### Astro Internationalization (i18n) Configuration (`frontend/astro.config.mjs`)

Astro's i18n feature has been configured to handle routing and locale management:

```javascript
// frontend/astro.config.mjs
export default defineConfig({
  // ... other configurations
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ht'],
    routing: {
      prefixDefaultLocale: true, // Ensures all URLs are prefixed (e.g., /en/page, /es/page)
    },
  },
});
```

### Locale Files (`frontend/src/locales/`)

A new directory `frontend/src/locales/` has been created to store JSON files for static UI text translations:

*   `en.json`: English translations.
*   `es.json`: Spanish translations.
*   `ht.json`: Haitian Creole translations.

These files contain key-value pairs for all translatable UI strings (e.g., button labels, navigation titles, loading messages).

### Language Switcher UI Component (`frontend/src/components/LanguageSwitcher.tsx`)

A new React component `LanguageSwitcher.tsx` has been created.
*   It displays country flag emojis (🇺🇸 for English, 🇪🇸 for Spanish, 🇭🇹 for Haitian Creole).
*   Clicking the flag opens a `shadcn/ui` Popover with options to switch languages.
*   Selecting a language navigates the user to the corresponding locale-prefixed URL (e.g., `/es/` or `/ht/`).
*   The user's preferred language is stored in `localStorage`.

### Header Integration (`frontend/src/components/Header.tsx`)

The `LanguageSwitcher` component has been integrated into the `Header.tsx` for both desktop and mobile views.

The `Header` component now also uses a `useTranslations` hook (defined locally within `Header.tsx` for now, but can be refactored into a shared utility) to fetch translated navigation item titles from the locale files. Navigation links are dynamically prefixed with the current locale.

### Dynamic Content Internationalization (`frontend/src/components/NewsFeed.tsx`, `frontend/src/components/ArticleDetail.tsx`)

Both `NewsFeed.tsx` and `ArticleDetail.tsx` now:
*   Utilize the `useTranslations` hook to access the current locale and translated static UI strings.
*   Display article titles, summaries, and topic tags in the selected language (Spanish or Haitian Creole) if available from the backend.
*   Implement a fallback mechanism: if a translation is not available, the original English text is displayed along with a message like "Translation to [Language] not available yet." (this message itself is translatable).
*   Date formatting (e.g., `toLocaleDateString`) is now dynamic based on the `currentLocale`.
*   Share button text is also translated.

### Navigation Items (`frontend/src/lib/nav-items.ts`)

The `navItems` array now uses `titleKey` properties (e.g., `"home"`, `"automoto"`) instead of hardcoded titles. These keys correspond to the entries in the locale JSON files, allowing the `Header` component to fetch the correct translated title for each navigation link.

### WordPress Widget Integration (`widgets/`)

Multilingual support has been extended to the WordPress news feed widgets, allowing content to be displayed in English, Spanish, or Haitian Creole.

*   **Elementor Widget (`widgets/mango-news-feed-elementor-widget.php`)**:
    *   A new **"Display Language"** control has been added to the widget settings in Elementor.
    *   Administrators can select the desired language (English, Spanish, or Haitian Creole) for the articles, summaries, topics, and static UI text displayed by that specific widget instance.

*   **Direct HTML/JS Embed (`widgets/mango-news-direct-code.php`)**:
    *   When embedding the news feed directly using the HTML/JS snippet, the display language can be set by modifying the `displayLanguage` property within the JavaScript `config` object.
    *   Example: `displayLanguage: 'es',` for Spanish.
    *   The `translations` object within the JavaScript also contains the necessary strings for each language.

*   **PHP Function & Shortcode (`widgets/mango-news-direct-code.php`)**:
    *   The `mango_news_feed()` PHP function now accepts a `language` argument.
    *   Example usage in a theme template: `<?php mango_news_feed(['language' => 'es']); ?>`
    *   The `[mango_news_feed]` shortcode also accepts a `language` attribute.
    *   Example usage in a post/page: `[mango_news_feed language="ht"]`

The widget will automatically fetch and display the appropriate translated content (titles, summaries, topics) from the API based on the configured language. If a translation is not available for a specific field, it will fall back to the English version.

## Usage and Maintenance

### Adding New Translations

To add new static UI strings:
1.  Add the new key-value pair to `frontend/src/locales/en.json`.
2.  Translate the new string into Spanish and Haitian Creole and add them to `frontend/src/locales/es.json` and `frontend/src/locales/ht.json` respectively.

### Regenerating Missing Article/Topic Translations

If articles or topics were scraped before the translation feature was fully implemented, or if translations are missing for any reason, you can trigger a re-translation process via the backend API.

You can use the `/api/articles/:articleId/process-ai` endpoint with `featureType: 'translations'` for a single article, or the `/api/process-missing-ai/:sourceId` endpoint with `featureType: 'translations'` for all missing translations for a specific source.

Example API call (requires authentication token):

```bash
# To process translations for a single article
curl -X POST "http://localhost:3000/api/articles/YOUR_ARTICLE_ID/process-ai" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"featureType": "translations"}'

# To process missing translations for all articles of a specific source
curl -X POST "http://localhost:3000/api/process-missing-ai/YOUR_SOURCE_ID" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"featureType": "translations"}'
```

## Troubleshooting

*   **Missing Translations on UI:**
    *   Ensure the backend scraper has run and successfully generated translations for new articles.
    *   Verify that the database schema updates were applied correctly.
    *   Check backend logs for any errors during AI translation (`generateAITranslation`).
    *   For existing articles, try triggering the `process-missing-ai` endpoint with `featureType: 'translations'`.
    *   Ensure `frontend/src/locales/*.json` files are correctly populated and imported.
*   **Incorrect Routing:**
    *   Verify `frontend/astro.config.mjs` i18n configuration is correct.
    *   Check `LanguageSwitcher.tsx` logic for URL construction.
*   **UI Styling Issues:**
    *   Ensure `shadcn/ui` and Tailwind CSS are correctly applied to new components.
