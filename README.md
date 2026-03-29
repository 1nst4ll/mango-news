# Mango News - TCI News Aggregator

A news aggregation platform for the Turks and Caicos Islands. Scrapes multiple sources, processes content with AI (summaries, translations, topic classification, image generation), and presents it through a multilingual web interface.

**Live hosting:** [Render.com](https://render.com) — Backend API + Frontend SSR + Managed PostgreSQL.

## Quick Start

```bash
git clone https://github.com/your-repo/mango-news.git

# Backend
cd backend && cp .env.example .env   # fill in credentials
npm install && npm run dev            # http://localhost:3000

# Frontend (new terminal)
cd frontend && cp .env.example .env  # set PUBLIC_API_URL=http://localhost:3000
npm install && npm run dev           # http://localhost:4321
```

Apply the database schema before first run:

```bash
cd db && psql -U postgres -d mangonews -f schema.sql
```

See [Deployment](docs/deployment.md) for full setup including database, env vars, admin account creation, and production deployment.

## Architecture

```text
mango-news/
├── backend/        # Node.js/Express API — scraping, AI, cron jobs
│   ├── src/
│   │   ├── index.js                  # Slim orchestrator (~200 lines) — mounts route modules
│   │   ├── routes/                   # Route modules (8 files)
│   │   │   ├── auth.js               #   Authentication & user management
│   │   │   ├── articles.js           #   Article CRUD & search
│   │   │   ├── sources.js            #   Source management
│   │   │   ├── scraping.js           #   Scraper triggers & status
│   │   │   ├── sundayEditions.js     #   Sunday Edition endpoints
│   │   │   ├── stats.js              #   Dashboard statistics
│   │   │   ├── settings.js           #   Application settings
│   │   │   └── rss.js                #   RSS feed
│   │   ├── middleware/
│   │   │   ├── auth.js               #   JWT verification + RBAC
│   │   │   └── rateLimiter.js        #   3 rate limiters (general, auth, scraping)
│   │   ├── services/
│   │   │   ├── aiService.js          #   Centralized Groq AI (cache, retry, rate limit)
│   │   │   ├── imageService.js       #   fal.ai image generation
│   │   │   └── s3Service.js          #   Shared S3 upload
│   │   ├── scraper.js                # Scraping pipeline + AI processing
│   │   ├── opensourceScraper.js      # Puppeteer-based scraper
│   │   ├── cronLock.js               # Database-based cron job locking
│   │   └── sundayEditionGenerator.js # Weekly summary feature
│   └── config/blacklist.json         # URL exclusions
├── frontend/       # Astro 5 + React 19 + Tailwind CSS 4
│   ├── src/
│   │   ├── components/               # React components (NewsFeed, ArticleDetail…)
│   │   │   ├── ErrorBoundary.tsx     #   Wraps all page-level React components
│   │   │   ├── EmergencyBanner.tsx   #   Admin-toggled alert banner (in BaseLayout)
│   │   │   ├── LanguageSwitcher.tsx  #   Language switcher with loading spinner
│   │   │   └── settings/            #   5 lazy-loaded sub-components
│   │   │       ├── OverviewStats.tsx
│   │   │       ├── ScraperControls.tsx
│   │   │       ├── ScheduledTasks.tsx
│   │   │       ├── SourceManagement.tsx
│   │   │       ├── SundayEditionsAdmin.tsx
│   │   │       └── types.ts
│   │   ├── pages/                    # Astro file-based routing with i18n
│   │   └── locales/                  # UI translations (en, es, ht)
│   └── public/
│       ├── sw.js                     # Service worker (3 caching strategies)
│       └── site.webmanifest          # PWA manifest
├── db/             # PostgreSQL schema + migrations
└── widgets/        # WordPress embed snippets
```

## Key Features

- **Multi-source scraping** — Puppeteer (Open Source) or Firecrawl API per source
- **AI processing** — Groq/Llama for summaries, topics (31 categories), translations; fal.ai FLUX.2 Turbo for images
- **Multilingual** — English, Spanish, Haitian Creole (UI + article content)
- **Sunday Edition** — Weekly AI-narrated digest with Unreal Speech audio
- **Admin dashboard** — Source management, scraper controls, cron scheduling, article editing
- **RSS feed** — `GET /api/rss` (latest 20 articles, public)
- **PWA** — Service worker with 3 caching strategies, installable web manifest
- **Full-text search** — Trigram-based fuzzy search on article titles (`pg_trgm`)
- **Error boundaries** — Page-level React error boundaries for graceful failure handling
- **Emergency banner** — Admin-toggled site-wide alert banner
- **Image lazy loading** — All feed/article images load lazily for performance
- **WordPress widgets** — Embeddable news feed and single-article components

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DB_HOST=localhost
DB_NAME=mangonews
DB_USER=mangoadmin
DB_PASSWORD=your_password
DB_PORT=5432

# Required API keys
GROQ_API_KEY=your_groq_key
FAL_KEY=your_fal_ai_key
JWT_SECRET=your_jwt_secret

# AWS S3 (AI-generated image storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

# Optional
FIRECRAWL_API_KEY=your_key     # Firecrawl scraping method
UNREAL_SPEECH_API_KEY=your_key # Sunday Edition audio
SITE_URL=https://mango.tc      # Base URL for RSS feed public-facing links
```

### Frontend (`frontend/.env`)

```env
PUBLIC_API_URL=http://localhost:3000
```

For AI tuning variables (model selection, cache TTL, rate limits) see [Backend Setup](docs/backend-setup.md#optional-ai-environment-variables).

## Authentication

Protected endpoints require a JWT token:

```bash
# 1. Register (first time only)
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 2. Login to get token
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 3. Use token on protected requests
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/stats
```

## Documentation

| Document | Description |
| --- | --- |
| [Deployment](docs/deployment.md) | Local dev setup and Render production deployment |
| [Backend Setup](docs/backend-setup.md) | Database, environment variables, architecture |
| [API Documentation](docs/api-documentation.md) | Complete API endpoint reference |
| [Frontend UI](docs/frontend-ui.md) | Astro/React architecture and components |
| [Admin UI](docs/admin-ui.md) | Settings dashboard and source management |
| [Scraping Methods](docs/scraping-methods.md) | Puppeteer vs Firecrawl, HTML sanitization pipeline |
| [CSS Selectors](docs/css-selectors.md) | Configuring source scraping selectors |
| [Multilingual Support](docs/multilingual-support.md) | Spanish & Haitian Creole translation system |
| [Sunday Edition](docs/sunday-edition.md) | Weekly AI-narrated news summary feature |
| [AI Optimization](docs/ai-optimization-analysis.md) | AI services, optimizations, and monitoring |
| [WordPress Integration](docs/wordpress-integration.md) | Embedding news widgets in WordPress |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## License

ISC
