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
│   ├── ErrorBoundary.tsx      # React class component, catches render errors
│   ├── EmergencyBanner.tsx    # Admin-toggled red banner above Header
│   ├── Header.tsx             # Navigation bar, login button, theme toggle
│   ├── NewsFeed.tsx           # Main article feed (infinite scroll, filters)
│   ├── ArticleDetail.tsx      # Full article view (gallery, sharing, nav)
│   ├── SettingsPage.tsx       # Admin dashboard (5 tabs, lazy-loaded)
│   ├── settings/              # Lazy-loaded SettingsPage sub-components
│   │   ├── OverviewStats.tsx            # KPI cards, charts, AI coverage
│   │   ├── ScraperControls.tsx          # Manual scrape triggers, AI toggles, purge
│   │   ├── ScheduledTasks.tsx           # Cron editors for 3 jobs
│   │   ├── SourceManagement.tsx         # Source CRUD, filters, bulk actions
│   │   ├── SundayEditionsAdmin.tsx      # Edition list, edit, regenerate, purge
│   │   └── types.ts                     # Shared TypeScript interfaces
│   ├── SourceArticles.tsx     # Per-source article management table
│   ├── ArticleEditDialog.tsx  # Rich article editor (80% width modal)
│   ├── HtmlEditor.tsx         # TipTap WYSIWYG wrapper
│   ├── charts/                # Dashboard data visualizations
│   │   ├── AiCoverageChart.tsx           # Radial gauge per AI feature
│   │   ├── ArticlesTimelineChart.tsx     # Gradient area chart (yearly)
│   │   ├── SourceBarChart.tsx            # Horizontal bar chart
│   │   └── SourceDistributionPieChart.tsx # Donut pie chart
│   ├── LanguageSwitcher.tsx   # Flag-based locale selector (spinner on nav)
│   ├── SundayEditionDetail.tsx  # Full Sunday Edition view (breadcrumbs, audio, sharing)
│   ├── SundayEditionList.tsx    # Sunday Edition listing page (card grid)
│   ├── LoginDialog.tsx
│   ├── ModeToggle.tsx         # Dark/light theme toggle
│   ├── footer.tsx
│   └── columns.tsx            # TanStack Table column definitions
├── pages/                     # Astro file-based routing
│   ├── index.astro            # Root redirect (reads localStorage for preferred locale)
│   ├── settings.astro         # Admin settings
│   ├── article/[id].astro     # Article (non-locale fallback)
│   ├── [lang]/                # Locale-prefixed routes (es, ht)
│   │   ├── index.astro
│   │   ├── article/[id].astro
│   │   ├── news/topic/[topicSlug].astro
│   │   └── sunday-edition/
│   │       ├── index.astro    # Sunday Edition listing page
│   │       └── [id].astro     # Sunday Edition detail page
│   └── settings/source/[sourceId].astro
├── layouts/BaseLayout.astro    # Root layout (registers SW, renders EmergencyBanner)
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

### Navigation

Navbar links are defined in `frontend/src/lib/nav-items.ts`. Current items:

| Label | Route | Notes |
|---|---|---|
| News | `/` | Main feed |
| Sunday Edition | `/sunday-edition` | Edition listing page |
| RSS Feed | `/api/rss` | RSS icon shown instead of text |

External mango.tc links (Home, Vehicles, Real Estate, Jobs) have been removed from the navbar.

### NewsFeed

Main article feed at the home page:

- **Infinite scroll** via `IntersectionObserver`
- **Request deduplication** — AbortController cancels stale requests
- **Grouped by date** with visual separators
- **Filters**: source (including "Sunday Edition"), full-text search
- Paginates at 15 articles per request
- **Sunday Edition filter** — special source ID `0` controls Sunday Edition visibility without affecting backend API queries (stripped before `source_ids` param is built)

### SundayEditionList

Listing page at `/sunday-edition` (renders `SundayEditionList.tsx`):

- Card grid (1/2/3 columns responsive) of all editions
- Each card links to its detail page
- Blue accent border + "Sunday Edition" badge on image
- Data fetched server-side in the Astro page (no client-side fetch)

### SundayEditionDetail

Full Sunday Edition view at `/sunday-edition/[id]` (renders `SundayEditionDetail.tsx`):

- **Breadcrumb trail**: News Feed › Sunday Edition › [Title]
- **Back button**: "Back to News Feed" with `ChevronLeft` icon
- Audio player with autoplay enabled
- Sharing buttons (WhatsApp, Facebook)
- Sources fetched server-side in `[id].astro` so the footer shows News Sources

### ArticleDetail

Full article view at `/article/[id]`:

- **Image gallery** — consecutive images grouped into a lightbox grid; click backdrop or use arrow keys to navigate
- **Wix CDN** — resize parameters stripped to load full-resolution images
- **Social sharing** — WhatsApp, Facebook
- Previous/Next article navigation
- Clickable topic badges → filtered feed

### ErrorBoundary

React class component that wraps all page-level components in `.astro` pages. Catches JavaScript render errors and displays a fallback UI with a retry button. Uses Lucide icons (`AlertCircle`, `RefreshCw`).

### EmergencyBanner

Rendered above `Header` in `BaseLayout`. Fetches `/api/settings/emergency` on mount and, when enabled, shows a red dismissible banner with the admin-configured text. Dismiss state persists for the session via `sessionStorage`. Toggled on/off by admins through the Settings page.

### LanguageSwitcher

Flag-based locale selector. Now shows a `Loader2` spinner during language change navigation to provide visual feedback while the page transitions.

### SettingsPage (Admin)

Tabbed dashboard at `/settings` (requires login):

1. **Overview & Stats** — KPI cards, area/pie/bar charts, AI coverage radial gauges (Recharts)
2. **Scraper Controls** — AI feature toggles, manual scrape triggers, purge
3. **Scheduled Tasks** — cron expression editor for all three background jobs
4. **Source Management** — CRUD for news sources, per-source scraping config, filters, bulk actions
5. **Sunday Editions** — Edition list, edit, regenerate image/audio, purge

SettingsPage is now an **orchestrator** that lazy-loads 5 tab components via `React.lazy()`:

| Sub-component | Path | Responsibility |
|---------------|------|----------------|
| `OverviewStats.tsx` | `settings/OverviewStats.tsx` | KPI cards, charts, AI coverage |
| `ScraperControls.tsx` | `settings/ScraperControls.tsx` | Manual scrape triggers, AI toggles, purge |
| `ScheduledTasks.tsx` | `settings/ScheduledTasks.tsx` | Cron editors for 3 jobs |
| `SourceManagement.tsx` | `settings/SourceManagement.tsx` | Source CRUD, filters, bulk actions |
| `SundayEditionsAdmin.tsx` | `settings/SundayEditionsAdmin.tsx` | Edition list, edit, regenerate, purge |

Each tab is wrapped in `React.Suspense` with a `Skeleton` fallback. Shared TypeScript interfaces live in `settings/types.ts`. This decomposition reduced the SettingsPage chunk from **522 KB to 39 KB**.

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
- **Accent color**: pastel orange `#FFB88C`

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

## PWA / Service Worker

- `public/sw.js` registered in `BaseLayout` via an inline `<script>` block
- **Caching strategies:**
  - **Network-first** for HTML pages
  - **Cache-first** for static assets (JS, CSS, images, fonts)
  - **Stale-while-revalidate** for API responses
- Skips auth endpoints and `/settings` pages (never cached)
- Pre-caches logo, favicon, and app icon on install
- `public/site.webmanifest` updated with proper `name`, `start_url`, and `theme_color`

## Performance

- `loading="lazy"` on all feed and article images (`NewsFeed.tsx`, `ArticleDetail.tsx`)
- Lazy-loaded SettingsPage sub-components (5 tabs via `React.lazy`, Skeleton fallbacks)
- `AbortController` for request cancellation on filter/navigation changes
- `useDeepCompareEffect` to skip re-renders when filter objects haven't changed
- TipTap editor lazy-loaded — excluded from initial bundle
- Paginated API calls (15 articles per request)
- Share buttons: icon-only on small screens (`<640px`), text visible on larger screens

## Accessibility

- Lightbox prevents body scroll when open (`overflow: hidden`)
- Footer external links show an `ExternalLink` icon to indicate outbound navigation
- Dark mode: `ModeToggle` reads from DOM `classList` on init (no flash of wrong theme)

## UX Improvements

- Share buttons: icon-only on mobile, full text on desktop
- Language switcher shows a loading spinner during navigation
- Removed dead 2001-date workaround (no affected articles in production)

## Related Documentation

- [Admin UI](admin-ui.md) - Settings page and article management
- [Multilingual Support](multilingual-support.md) - Full translation system
- [Deployment](deployment.md) - Production build and serving
