# Multilingual Support

Mango News supports English (default), Spanish, and Haitian Creole for both UI text and article content.

## Overview

| Language | Code | Flag |
|----------|------|------|
| English | `en` | 🇺🇸 |
| Spanish | `es` | 🇪🇸 |
| Haitian Creole | `ht` | 🇭🇹 |

## Frontend Setup

### Astro i18n Configuration

```javascript
// frontend/astro.config.mjs
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'ht'],
  routing: {
    prefixDefaultLocale: true,  // All URLs prefixed: /en/, /es/, /ht/
  },
}
```

### Static UI Text

Translations stored in `frontend/src/locales/`:

```
locales/
├── en.json   # English
├── es.json   # Spanish
└── ht.json   # Haitian Creole
```

**Example entry:**
```json
{
  "loading": "Loading...",
  "read_more": "Read More",
  "share_on_whatsapp": "Share on WhatsApp"
}
```

### Using Translations

```tsx
import { useTranslations } from '@/lib/hooks/useTranslations';

function MyComponent() {
  const { t, currentLocale } = useTranslations();
  
  return <button>{t('read_more')}</button>;
}
```

### Language Switcher

The `LanguageSwitcher.tsx` component:
- Displays current language flag
- Opens popover with language options
- Navigates to locale-prefixed URL
- Saves preference to localStorage

## Backend Translation

### Database Columns

**articles table:**
- `title_es`, `title_ht` - Translated titles
- `summary_es`, `summary_ht` - Translated summaries
- `raw_content_es`, `raw_content_ht` - Translated content

**topics table:**
- `name_es`, `name_ht` - Translated topic names

### AI Translation

The `generateAITranslation()` function in `scraper.js`:

1. Takes English text and target language code
2. Sends to Groq API for translation
3. Returns translated text

**Supported types:**
- `title` - Short, preserves formatting
- `summary` - Medium length
- `raw_content` - Long content (max 8192 tokens)

### Topic Translations

Topics use a static mapping (`topicTranslations` in `scraper.js`) for consistent translations:

```javascript
const topicTranslations = {
  'Politics': { es: 'Política', ht: 'Politik' },
  'Sports': { es: 'Deportes', ht: 'Espò' },
  // ... 31 predefined topics
};
```

## API Response

Translation fields included automatically:

```json
{
  "id": 1,
  "title": "English Title",
  "title_es": "Título en Español",
  "title_ht": "Tit an Kreyòl",
  "summary": "English summary...",
  "summary_es": "Resumen en español...",
  "summary_ht": "Rezime an Kreyòl...",
  "topics": ["Politics", "Local"],
  "topics_es": ["Política", "Local"],
  "topics_ht": ["Politik", "Lokal"]
}
```

## Frontend Display Logic

Components display content based on `currentLocale`:

```tsx
const title = currentLocale === 'es' ? article.title_es 
            : currentLocale === 'ht' ? article.title_ht 
            : article.title;
```

**Fallback behavior:** If translation is missing, displays English with a notice.

## Processing Missing Translations

### Single Article

```bash
curl -X POST "http://localhost:3000/api/articles/123/process-ai" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureType": "translations"}'
```

### All Articles for Source

```bash
curl -X POST "http://localhost:3000/api/process-missing-ai/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureType": "translations"}'
```

### Scheduled Processing

Enable "Process Missing Translations" in Settings → Scheduled Tasks.

## Adding New Static Translations

1. Add key to `frontend/src/locales/en.json`
2. Add translations to `es.json` and `ht.json`
3. Use with `t('your_key')` in components

## Related Documentation

- [Frontend UI](frontend-ui.md) - i18n implementation details
- [Admin UI](admin-ui.md) - Translation toggle controls
- [API Documentation](api-documentation.md) - Translation field responses
