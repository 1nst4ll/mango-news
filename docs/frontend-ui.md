# Frontend UI - Architecture and Components

The Mango News frontend is built with Astro and React, providing a fast, SEO-friendly news aggregation experience.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Astro** | Static site generation with SSR support |
| **React** | Interactive UI components (Islands architecture) |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible component library (Radix UI based) |
| **TypeScript** | Type safety |

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

```env
PUBLIC_API_URL=http://localhost:3000
```

## Project Structure

```
frontend/src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── Header.tsx       # Navigation header
│   ├── NewsFeed.tsx     # Main article feed with infinite scroll
│   ├── ArticleDetail.tsx # Single article view
│   ├── SettingsPage.tsx # Admin dashboard
│   ├── SourceArticles.tsx # Source-specific article management
│   ├── LanguageSwitcher.tsx # i18n language selector
│   └── ...
├── pages/               # Astro pages (file-based routing)
│   ├── [lang]/          # Language-prefixed routes
│   │   ├── index.astro
│   │   ├── article/[id].astro
│   │   ├── news/topic/[topicSlug].astro
│   │   └── sunday-edition/[id].astro
│   └── settings/
├── layouts/             # Page layouts
├── locales/             # Translation files (en.json, es.json, ht.json)
├── lib/                 # Utilities and hooks
└── styles/              # Global CSS
```

## Key Components

### NewsFeed

The main news feed component with optimized infinite scrolling:

- **IntersectionObserver** for loading more articles
- **Request deduplication** to prevent duplicate API calls
- **Grouped by date** with visual separators
- **Filter support**: topics, sources, date range, search

### ArticleDetail

Full article view with:

- Multilingual content display
- Social sharing (WhatsApp, Facebook)
- Previous/Next navigation
- Related articles section
- Clickable topic badges

### SettingsPage (Admin)

Tabbed dashboard for administrators:

1. **Overview & Stats** - Charts showing articles per source/year
2. **Global Settings** - AI toggles for manual scrapes
3. **Scheduled Tasks** - Cron configuration for automated scraping
4. **Source Management** - CRUD operations for news sources

## Internationalization (i18n)

Supports English, Spanish, and Haitian Creole.

### Configuration (`astro.config.mjs`)

```javascript
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'ht'],
  routing: {
    prefixDefaultLocale: true,
  },
}
```

### Translation Files

Static UI text: `frontend/src/locales/{lang}.json`

Dynamic content (articles) is translated via backend AI and displayed based on active locale.

### Usage

```tsx
import { useTranslations } from '@/lib/hooks/useTranslations';

const { t, currentLocale } = useTranslations();
// t('key') returns translated string
```

## Styling

### Global Styles

Located in `frontend/src/styles/global.css`:

- CSS variables for theming (light/dark mode)
- Article content typography (`.article-content` class)
- Responsive breakpoints

### Theme Toggle

The `ModeToggle.tsx` component handles light/dark mode switching, persisted to localStorage.

## Responsive Design

- Mobile-first approach with Tailwind breakpoints
- Hamburger menu for mobile navigation
- Collapsible settings tabs on small screens
- Touch-friendly controls

## Open Graph Tags

Dynamic OG meta tags are set per page type:

- **Articles**: Title, summary, AI/thumbnail image
- **Index**: Site title, description, logo
- **Settings**: Generic admin page metadata

## Performance Features

- **Lazy loading** for images
- **Paginated API calls** (15 articles per request)
- **AbortController** for request cancellation
- **Debounced scroll events** for infinite scroll
- **useDeepCompareEffect** to prevent unnecessary re-renders

## Related Documentation

- [Admin UI](admin-ui.md) - Settings page details
- [Multilingual Support](multilingual-support.md) - Translation system
- [Deployment](deployment.md) - Production deployment
