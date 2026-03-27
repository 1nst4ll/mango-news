# Frontend UI — Architecture and Components

Built with Astro 5 (SSR) + React 19 + Tailwind CSS 4 + shadcn/ui (Radix UI).

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Astro | 5.7.5 | SSR framework, file-based routing, i18n |
| React | 19.1.0 | Interactive UI components (Islands architecture) |
| Tailwind CSS | 4.1.8 | Utility-first styling |
| shadcn/ui | — | Accessible component library (Radix UI) |
| TipTap | — | Rich HTML editor (lazy-loaded) |
| TypeScript | — | Type safety across all components |

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # set PUBLIC_API_URL=http://localhost:3000
npm run dev            # http://localhost:4321
```

## Project Structure

```text
frontend/src/
├── components/
│   ├── ui/                    # shadcn/ui base components (30+)
│   ├── Header.tsx             # Navigation bar, login button, theme toggle
│   ├── NewsFeed.tsx           # Main article feed (infinite scroll, filters)
│   ├── ArticleDetail.tsx      # Full article view (gallery, sharing, nav)
│   ├── SettingsPage.tsx       # Admin dashboard (4 tabs)
│   ├── SourceArticles.tsx     # Per-source article management table
│   ├── ArticleEditDialog.tsx  # Rich article editor (80% width modal)
│   ├── HtmlEditor.tsx         # TipTap WYSIWYG wrapper
│   ├── LanguageSwitcher.tsx   # Flag-based locale selector
│   ├── SundayEditionDetail.tsx
│   ├── LoginDialog.tsx
│   ├── ModeToggle.tsx         # Dark/light theme toggle
│   ├── footer.tsx
│   └── columns.tsx            # TanStack Table column definitions
├── pages/                     # Astro file-based routing
│   ├── index.astro            # Homepage (English, no /en/ prefix)
│   ├── settings.astro         # Admin settings
│   ├── article/[id].astro     # Article (non-locale fallback)
│   ├── [lang]/                # Locale-prefixed routes (es, ht)
│   │   ├── index.astro
│   │   ├── article/[id].astro
│   │   ├── news/topic/[topicSlug].astro
│   │   └── sunday-edition/[id].astro
│   └── settings/source/[sourceId].astro
├── layouts/Layout.astro       # Root layout wrapper
├── locales/                   # Static UI translation files
│   ├── en.json
│   ├── es.json
│   └── ht.json
├── lib/
│   ├── utils.ts
│   ├── nav-items.ts
│   └── hooks/
│       ├── useTranslations.ts       # t() helper + currentLocale
│       └── useDeepCompareEffect.ts  # Prevents unnecessary re-renders
└── styles/
    ├── global.css               # CSS variables, light/dark theme
    └── article-content.css      # Editorial serif typography
```

## Key Components

### NewsFeed

Main article feed at the home page:

- **Infinite scroll** via `IntersectionObserver`
- **Request deduplication** — AbortController cancels stale requests
- **Grouped by date** with visual separators
- **Filters**: topic, source, date range, full-text search
- Paginates at 15 articles per request

### ArticleDetail

Full article view at `/article/[id]`:

- **Image gallery** — consecutive images grouped into a lightbox grid; click backdrop or use arrow keys to navigate
- **Wix CDN** — resize parameters stripped to load full-resolution images
- **Social sharing** — WhatsApp, Facebook
- Previous/Next article navigation
- Clickable topic badges → filtered feed

### SettingsPage (Admin)

Tabbed dashboard at `/settings` (requires login):

1. **Overview & Stats** — articles per source/year bar charts (Recharts)
2. **Global Settings** — AI feature toggles for manual scraper runs
3. **Scheduled Tasks** — cron expression editor for all three background jobs
4. **Source Management** — CRUD for news sources, per-source scraping config

See [Admin UI](admin-ui.md) for the full feature reference.

### SourceArticles

Article management table at `/settings/source/[sourceId]`:

- **Source navigation** — `←` / `→` arrows step through sources by ID
- **DataTable** (TanStack React Table) with persistent `pageSize` and column visibility via `localStorage`
- Clickable title → opens article in new tab
- Clickable thumbnail/AI image → full-screen lightbox

### ArticleEditDialog

80%-width modal for editing article content:

- **Meta fields** — title, author, date, URL, thumbnail, topics
- **Language tabs** — English, Spanish, Haitian Creole
- **TipTap WYSIWYG** with toolbar: Bold, Italic, Strike, H2, H3, lists, Blockquote, Link, Image, Undo/Redo
- **`</> HTML` toggle** per tab — raw textarea syncs back to WYSIWYG on close
- **Live preview** side-by-side with editor

TipTap is **lazy-loaded** (`React.lazy`) — only bundled when the dialog opens.

## Internationalization (i18n)

See [Multilingual Support](multilingual-support.md) for the full translation system.

### Routing

```javascript
// frontend/astro.config.mjs
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'ht'],
  routing: {
    prefixDefaultLocale: false, // / not /en/, but /es/ and /ht/
  },
}
```

### Static UI Text

```tsx
import { useTranslations } from '@/lib/hooks/useTranslations';

const { t, currentLocale } = useTranslations();
// t('read_more') → "Read More" / "Leer más" / "Li plis"
```

Add new keys: edit `locales/en.json`, then add matching entries to `es.json` and `ht.json`.

### Dynamic Content

Article titles, summaries, and body text are translated by the backend AI and stored in the database. Components select the correct field based on `currentLocale` with English fallback if a translation is missing.

## Article Typography

`article-content.css` — scoped to `.article-content`, "Caribbean Journal" editorial style:

- **Font**: Lora serif, 1.125rem / 1.8 line-height (desktop); 1.0625rem / 1.75 (mobile)
- **Drop cap**: Playfair Display, 4em, primary color — spans ~3 lines on first paragraph
- **h2**: bottom border in primary color
- **h3**: left border in primary color
- **Blockquote**: primary-tinted background with decorative quotation mark
- **Links**: primary-color underline, full color on hover
- Gallery thumbnails excluded from image rules via `data-gallery-thumb` attribute

Fonts: `Lora` (regular, italic, bold) + `Playfair Display` (bold) via Google Fonts.

## Styling & Theming

- **Tailwind CSS 4** — utility-first, no config file (CSS-based config)
- **CSS variables** in `global.css` — light/dark mode via `ModeToggle.tsx`, persisted to `localStorage`
- **Accent color**: coral `#FF7F50`

## Responsive Design

- Mobile-first Tailwind breakpoints
- Hamburger menu for mobile navigation
- Tables scroll horizontally on mobile
- Touch-friendly controls throughout

## Open Graph Tags

Dynamic OG meta tags per page type:

- **Articles** — title, summary, thumbnail or AI-generated image
- **Index** — site title, description, logo
- **Settings** — generic admin metadata

## Performance

- Lazy-loaded images throughout
- `AbortController` for request cancellation on filter/navigation changes
- `useDeepCompareEffect` to skip re-renders when filter objects haven't changed
- TipTap editor lazy-loaded — excluded from initial bundle
- Paginated API calls (15 articles per request)

## Related Documentation

- [Admin UI](admin-ui.md) - Settings page and article management
- [Multilingual Support](multilingual-support.md) - Full translation system
- [Deployment](deployment.md) - Production build and serving
