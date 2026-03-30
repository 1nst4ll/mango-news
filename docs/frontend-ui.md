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
│   │   ├── OverviewStats.tsx            # KPI cards, charts, AI coverage, freshness
│   │   ├── ScraperControls.tsx          # Manual scrape, AI toggles, emergency banner, blacklist, purge
│   │   ├── ScheduledTasks.tsx           # Cron editors for 3 jobs
│   │   ├── SourceManagement.tsx         # Source CRUD, filters, bulk actions, article search
│   │   ├── SundayEditionsAdmin.tsx      # Edition list, edit, regenerate, draft/publish, purge
│   │   ├── TopicManagement.tsx          # Topic CRUD, translations, merge
│   │   └── types.ts                     # Shared TypeScript interfaces
│   ├── SourceArticles.tsx     # Per-source article management table
│   ├── ArticleEditDialog.tsx  # Rich article editor (80% width modal)
│   ├── HtmlEditor.tsx         # TipTap WYSIWYG wrapper
│   ├── charts/                # Dashboard data visualizations
│   │   ├── AiCoverageChart.tsx           # Radial gauge per AI feature
│   │   ├── ArticlesTimelineChart.tsx     # Gradient area chart (yearly)
│   │   ├── SourceBarChart.tsx            # Horizontal bar chart
│   │   ├── TopicBarChart.tsx             # Topic distribution bar chart
│   │   └── SourceDistributionPieChart.tsx # Donut pie chart
│   ├── LanguageSwitcher.tsx   # Flag-based locale selector (spinner on nav)
│   ├── SundayEditionDetail.tsx  # Full Sunday Edition view (breadcrumbs, audio, sharing)
│   ├── SundayEditionList.tsx    # Sunday Edition listing page (card grid)
│   ├── LoginDialog.tsx
│   ├── ModeToggle.tsx         # Dark/light theme toggle
│   ├── footer.tsx
│   ├── ui/ImageLightbox.tsx   # Unified image lightbox (focus trap, prev/next, keyboard)
│   └── columns.tsx            # TanStack Table column definitions
├── middleware.ts               # Server-side locale redirect (cookie + Accept-Language)
├── pages/                     # Astro file-based routing
│   ├── index.astro            # Fallback redirect (middleware handles server-side)
│   ├── 404.astro              # Custom 404 page (SSR, returns 404 status)
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
| RSS Feed | `/api/rss` | RSS icon shown instead of text; `/api/` paths skip locale prefix |

External mango.tc links (Home, Vehicles, Real Estate, Jobs) have been removed from the navbar.

`Header.tsx` applies the locale prefix (`/${currentLocale}`) to all relative hrefs **except** those starting with `http` or `/api/` — so `/api/rss` is used as-is and never becomes `/en/api/rss`.

### NewsFeed

Main article feed at the home page:

- **Topic navigation bar** — horizontally scrollable pill bar fetched from `/api/topics`, locale-aware display names, links to topic pages
- **Infinite scroll** via `IntersectionObserver`
- **Request deduplication** — AbortController cancels stale requests
- **Grouped by date** with visual separators
- **Filters**: source (including "Sunday Edition"), full-text search (server-side)
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
- Audio player (autoplay disabled for WCAG 1.4.2)
- Sharing buttons (Copy Link, native Share API, WhatsApp, Facebook)
- Sources fetched server-side in `[id].astro` so the footer shows News Sources

### ArticleDetail

Full article view at `/article/[id]`:

- **SSR resilience** — article fetch is wrapped in try-catch. If the backend is unreachable during SSR (cold start, timeout), the page still renders with generic meta tags and the client-side `ArticleDetail` React component retries the fetch from the browser. Non-existent articles (404) redirect to `/404`
- **Image lightbox** — unified `ImageLightbox` component with focus trap, arrow key navigation, Escape to close, focus restoration. Thumbnail + all content images in one gallery
- **Wix CDN** — resize parameters stripped to load full-resolution images
- **Social sharing** — Copy Link (clipboard + toast), native Share API (mobile), WhatsApp, Facebook
- **Reading time** — estimated from word count (200 WPM), shown in metadata bar
- **Previous/Next navigation** — uses localStorage article list when available, falls back to server-side adjacent articles API (`GET /api/articles/:id/adjacent`) for direct-link visitors
- Clickable topic badges → filtered feed

> **SSR hook ordering:** `displayTitle` and `getTranslatedText` are defined before all `useEffect` hooks in `ArticleDetail.tsx`. This is required because React SSR evaluates `useEffect` dependency arrays eagerly — placing `const` declarations after conditional returns causes a Temporal Dead Zone `ReferenceError` during server-side rendering.

### ErrorBoundary

React class component that wraps all page-level components in `.astro` pages. Catches JavaScript render errors and displays a fallback UI with a retry button. Uses Lucide icons (`AlertCircle`, `RefreshCw`).

### EmergencyBanner

Rendered above `Header` in `BaseLayout`. Fetches `/api/settings/emergency` on mount and, when enabled, shows a red dismissible banner with the admin-configured text. Dismiss state persists for the session via `sessionStorage`. Toggled on/off by admins through the Settings page.

### LanguageSwitcher

Flag-based locale selector. Now shows a `Loader2` spinner during language change navigation to provide visual feedback while the page transitions.

### SettingsPage (Admin)

Tabbed dashboard at `/settings` (requires login):

1. **Overview & Stats** — KPI cards, area/pie/bar charts, AI coverage radial gauges, topic distribution, article freshness (Recharts)
2. **Scraper Controls** — AI feature toggles (DB-persisted), manual scrape trigger, emergency banner management, URL blacklist manager, danger zone (purge)
3. **Scheduled Tasks** — cron expression editor for all three background jobs
4. **Source Management** — CRUD for news sources, per-source scraping config, filters, bulk actions, cross-source article search
5. **Sunday Editions** — Edition list with draft/publish workflow, edit, regenerate image/audio, search/filter, purge
6. **Topics** — Topic CRUD with translations (EN/ES/HT), merge duplicates, article counts

SettingsPage is now an **orchestrator** that lazy-loads 5 tab components via `React.lazy()`:

| Sub-component | Path | Responsibility |
|---------------|------|----------------|
| `OverviewStats.tsx` | `settings/OverviewStats.tsx` | KPI cards, charts, AI coverage, freshness, topic stats |
| `ScraperControls.tsx` | `settings/ScraperControls.tsx` | Manual scrape, AI toggles, emergency banner, blacklist, purge |
| `ScheduledTasks.tsx` | `settings/ScheduledTasks.tsx` | Cron editors for 3 jobs |
| `SourceManagement.tsx` | `settings/SourceManagement.tsx` | Source CRUD, filters, bulk actions, article search |
| `SundayEditionsAdmin.tsx` | `settings/SundayEditionsAdmin.tsx` | Edition list, draft/publish, edit, regenerate, search, purge |
| `TopicManagement.tsx` | `settings/TopicManagement.tsx` | Topic CRUD, translations, merge |

Each tab is wrapped in `React.Suspense` with a `Skeleton` fallback. Shared TypeScript interfaces live in `settings/types.ts`. This decomposition reduced the SettingsPage chunk from **522 KB to 39 KB**.

See [Admin UI](admin-ui.md) for the full feature reference.

### SourceArticles

Article management table at `/settings/source/[sourceId]`:

- **Source navigation** — `←` / `→` arrows step through sources by ID
- **DataTable** (TanStack React Table) with persistent `pageSize` and column visibility via `localStorage`
- **Server-side search** — search by title, URL, or ID across all articles in the source
- Clickable title → opens article in new tab; blocked articles show "Blocked" badge
- Clickable thumbnail/AI image → unified `ImageLightbox`
- **Block/unblock articles** — toggle via row action menu (uses `is_blocked` column)

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

- **Tailwind CSS 4** — utility-first with `@theme inline` CSS-based config
- **CSS variables** in `global.css` — oklch color space, light/dark mode via `ModeToggle.tsx`, persisted to `localStorage`
- **Design tokens**: paper/ink newspaper palette, semantic status colors (`--success`, `--warning`), footer tokens, social brand tokens (`--social-whatsapp`, `--social-facebook`)
- **Accent color**: warm orange defined in oklch (`--accent: oklch(0.88 0.11 62)`)

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
- Share buttons: text always visible at all screen sizes; text wraps on small screens (`whitespace-normal h-auto`); icon has `shrink-0` to prevent squishing

## Accessibility

- **Skip navigation** link at top of `BaseLayout.astro` — visible on focus, jumps to `#main-content`
- **Unified lightbox** (`ImageLightbox.tsx`) — native `<dialog>`, focus trap (Tab cycles within buttons), Escape to close, focus restored to trigger element, scroll lock
- **Semantic topic badges** — `<a>` links wrapping `<Badge>` components (not `<span onClick>`)
- **Sunday Edition cards** — `<a href>` instead of `<div onClick>` for keyboard accessibility
- **Search input** has `aria-label` for screen readers
- **Language names** have `lang` attributes (`lang="es"`, `lang="ht"`)
- **i18n for UI chrome** — LoginDialog, LoginButton, Header, ModeToggle, LanguageSwitcher all use translation keys
- Footer external links show an `ExternalLink` icon to indicate outbound navigation
- Dark mode: `ModeToggle` reads from DOM `classList` on init (no flash of wrong theme)
- Sunday Edition audio: `autoplay={false}` (WCAG 1.4.2)

## UX Improvements

- Share buttons: text always shown, wraps to fit on any screen size
- Language switcher shows a loading spinner during navigation
- Removed dead 2001-date workaround (no affected articles in production)

## Related Documentation

- [Admin UI](admin-ui.md) - Settings page and article management
- [Multilingual Support](multilingual-support.md) - Full translation system
- [Deployment](deployment.md) - Production build and serving
