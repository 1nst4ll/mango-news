# Multilingual Support

Mango News supports English (default), Spanish, and Haitian Creole for both UI text and article content.

| Language | Code | URL prefix |
|---|---|---|
| English | `en` | none (e.g. `/`, `/article/123`) |
| Spanish | `es` | `/es/`, `/es/article/123` |
| Haitian Creole | `ht` | `/ht/`, `/ht/article/123` |

---

## Frontend

### Routing

Configured in `frontend/astro.config.mjs`:

```javascript
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'ht'],
  routing: {
    prefixDefaultLocale: false, // English has no prefix; /es/ and /ht/ do
  },
}
```

### Static UI Text

All UI strings (buttons, labels, nav items) live in `frontend/src/locales/`:

```
locales/
├── en.json
├── es.json
└── ht.json
```

Example entry:
```json
{ "read_more": "Read More", "share_on_whatsapp": "Share on WhatsApp" }
```

**Adding a new UI string:**
1. Add the key to `en.json`
2. Add matching translations to `es.json` and `ht.json`
3. Use in components with `t('your_key')`

### useTranslations Hook

```tsx
import { useTranslations } from '@/lib/hooks/useTranslations';

const { t, currentLocale } = useTranslations();
// t('read_more') → "Read More" / "Leer más" / "Li plis"
```

### Language Switcher

`LanguageSwitcher.tsx` shows a flag for the current locale. Selecting a language navigates to the locale-prefixed equivalent of the current page and saves the preference to both `localStorage` and a `preferredLocale` cookie (for server-side detection). Language names display with proper `lang` attributes for screen readers.

### Language Persistence

The chosen language is persisted across visits:

1. When the user selects a language, `preferredLocale` is saved to `localStorage` and as a cookie
2. **Server-side middleware** (`middleware.ts`) intercepts requests to `/` and redirects based on:
   - The `preferredLocale` cookie (returning visitors) → instant redirect, no flash
   - The `Accept-Language` header (first-time visitors) → auto-detect browser language
   - Fallback to English if no match
3. The root `index.astro` page serves as a JS fallback only (for edge cases where middleware doesn't apply)

This means returning visitors get an instant server-side redirect with no white flash or JavaScript dependency.

### Translated UI Chrome

All user-facing UI strings across the following components use translation keys (not hardcoded English):

- `LoginDialog.tsx` — login, email, password, remember me, signing in
- `LoginButton.tsx` — my account, settings, sign out
- `Header.tsx` — open/close menu
- `ModeToggle.tsx` — toggle theme
- `LanguageSwitcher.tsx` — change language
- Share buttons — copy link, link copied, share

### Display Logic

Components select the correct content field based on `currentLocale`:

```tsx
const title = currentLocale === 'es' ? article.title_es
            : currentLocale === 'ht' ? article.title_ht
            : article.title;
```

**Fallback:** if a translation field is `null`, the component falls back to the English value with a visual notice.

---

## Backend

### Database Columns

Article translations are stored as separate columns:

| Field | ES column | HT column |
|---|---|---|
| Title | `title_es` | `title_ht` |
| Summary | `summary_es` | `summary_ht` |
| Body | `raw_content_es` | `raw_content_ht` |

Topic translations are stored in the `topics` table: `name_es`, `name_ht`.

### AI Translation

Handled by `aiService.translateBatch()` in `backend/src/services/aiService.js`. All 6 fields (title, summary, body × ES, HT) are dispatched in parallel via `Promise.all()`.

Topic names use a static in-memory mapping (`topicTranslations` in `aiService.js`) for consistent output across all articles — no AI call needed per topic.

### Triggering Translations

**Single article:**
```bash
curl -X POST "http://localhost:3000/api/articles/123/process-ai" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureType": "translations"}'
```

**All articles for a source:**
```bash
curl -X POST "http://localhost:3000/api/process-missing-ai/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureType": "translations"}'
```

**Scheduled:** enable "Process Missing Translations" in Settings → Scheduled Tasks.

---

## API Response Shape

All article endpoints include translation fields automatically:

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

---

## Related Documentation

- [Frontend UI](frontend-ui.md) - Component architecture and routing
- [Admin UI](admin-ui.md) - Translation toggle controls per source
- [AI Optimization Analysis](ai-optimization-analysis.md) - Translation caching and parallel processing
- [API Documentation](api-documentation.md) - Full translation field reference
