# Backend Setup and Configuration

## Prerequisites

- Node.js v18+
- PostgreSQL database
- API keys: Groq (required), fal.ai (required), AWS S3 (required), Firecrawl (optional), Unreal Speech (optional)

## Database Setup

```sql
-- Create database and user
CREATE DATABASE mangonews;
CREATE USER mangoadmin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mangonews TO mangoadmin;
```

```bash
# Apply schema
cd db
psql -U mangoadmin -d mangonews -f schema.sql

# For existing databases, apply any unapplied migrations
psql -U mangoadmin -d mangonews -f db/migrations/add_translation_columns.sql
psql -U mangoadmin -d mangonews -f db/migrations/add_sunday_editions_table.sql
# ... apply others as needed
```

**Tables created:**

| Table | Purpose |
|-------|---------|
| `users` | Admin authentication |
| `sources` | News source configurations and selectors |
| `articles` | Scraped articles with EN/ES/HT content |
| `topics` | Category tags with translations |
| `article_topics` | Article–topic many-to-many relationships |
| `application_settings` | Scheduler cron expressions and feature toggles |
| `sunday_editions` | Weekly AI-generated summary posts |

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

## Environment Variables

### Required

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mangonews
DB_USER=mangoadmin
DB_PASSWORD=your_database_password

# AI — summaries, translations, topic classification
GROQ_API_KEY=your_groq_api_key

# AI image generation (fal.ai FLUX.2 Turbo)
FAL_KEY=your_fal_ai_key

# Storage for AI-generated images
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name

# JWT authentication (use a long random secret in production)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_key

# Security
# Comma-separated list of allowed frontend origins for CORS
ALLOWED_ORIGINS=http://localhost:4321
# Set to 'production' to enable Secure cookies and hide error details
NODE_ENV=development
```

### Required for production

```env
# Independent refresh token secret — must be set; no fallback
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Shared secret for Unreal Speech webhook — required if using Sunday Edition audio
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
UNREAL_SPEECH_WEBHOOK_SECRET=your_webhook_secret
```

### Optional

```env
FIRECRAWL_API_KEY=your_firecrawl_api_key  # Firecrawl scraping method
UNREAL_SPEECH_API_KEY=your_unreal_key     # Sunday Edition audio narration
```

### Optional AI Tuning {#optional-ai-environment-variables}

All have sensible defaults — only set these to override:

```env
# Model selection (Groq/Llama)
AI_SUMMARY_MODEL=llama-3.3-70b-versatile      # default
AI_TRANSLATION_MODEL=llama-3.3-70b-versatile  # default
AI_TOPICS_MODEL=llama-3.1-8b-instant          # default (faster, cheaper)
AI_PROMPT_MODEL=llama-3.3-70b-versatile       # default

# Retry behaviour
AI_MAX_RETRIES=3          # max attempts on transient failures
AI_RETRY_DELAY=1000       # initial backoff delay (ms), doubles each retry

# Cache (in-memory, for topic translations)
AI_CACHE_TTL=86400000     # 24 hours
AI_CACHE_MAX_SIZE=1000    # max entries before LRU eviction

# Rate limiting
AI_RATE_LIMIT_PER_MINUTE=60  # max Groq API requests per minute
```

## Running the Server

```bash
npm run dev   # development — nodemon hot reload, http://localhost:3000
npm start     # production
```

## Authentication

Cookie-based JWT. On login the backend sets an `HttpOnly; Secure` cookie. The browser sends it automatically — no manual token handling needed in the frontend.

**`SameSite` policy:**
- `development` (`NODE_ENV=development`): `SameSite=Strict` — frontend and backend share the same origin
- `production` (`NODE_ENV=production`): `SameSite=None; Secure` — required when frontend and backend are on different domains (e.g. `mangonews.onrender.com` vs `mango-news.onrender.com`)

**Password rules:** minimum 12 characters, at least one lowercase letter, one uppercase letter, one number, and one special character. Username must be a valid email address.

```bash
# Register (first time only — email required as username)
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"SecurePass1!"}'

# Login — sets jwt cookie (and jwt_refresh cookie)
curl -c cookies.txt -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"SecurePass1","rememberMe":false}'

# Use session cookie on subsequent requests
curl -b cookies.txt http://localhost:3000/api/stats

# Non-browser clients can also use the Authorization header as a fallback
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/stats
```

**Session lifecycle:**
- Access token (`jwt` cookie): 1 hour
- Refresh token (`jwt_refresh` cookie): 24 hours (default) or 30 days (with `rememberMe: true`)
- `POST /api/refresh` — issues a new access cookie from the refresh cookie (called automatically by the frontend's `apiFetch` wrapper)
- `POST /api/logout` — clears both cookies

Protected endpoints include: source CRUD, scraper triggering, article deletion/blocking, settings, statistics. All mutation endpoints (POST/PUT/DELETE) additionally require the `admin` role.

## URL Blacklist

Prevent scraping specific URLs by editing `backend/config/blacklist.json`:

```json
["https://example.com/page-to-skip", "https://example.com/category/ads/"]
```

Uses prefix matching — any URL starting with a blacklisted entry is skipped.

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Express server, 50+ API routes, graceful shutdown |
| `src/scraper.js` | Article scraping pipeline, AI processing, cron jobs |
| `src/opensourceScraper.js` | Puppeteer-based web scraping with fallback extraction and heuristic discovery |
| `src/onboardSource.js` | Automated source onboarding — CMS detection, selector proposal, validation |
| `src/browserPool.js` | Shared Puppeteer browser instance with configurable resource blocking |
| `src/audit.js` | Database audit script — selector health, content quality, cross-source analysis |
| `src/db.js` | PostgreSQL connection pool (max 10, 30s idle timeout) |
| `src/services/aiService.js` | Centralized Groq AI — caching, retry, rate limiting |
| `src/sundayEditionGenerator.js` | Weekly AI summary + audio narration |
| `src/user.js` | User registration (Zod validation), password hashing (bcrypt), JWT + refresh token generation |
| `src/middleware/auth.js` | JWT verification (cookie → header → query param); `requireRole()` RBAC middleware |

### AI Service (`services/aiService.js`)

All Groq-based AI operations are centralized here. `scraper.js` and `sundayEditionGenerator.js` call this service — no direct Groq calls elsewhere.

| Method | Purpose |
|--------|---------|
| `generateSummary(content)` | SEO summary, max 80–100 words |
| `assignTopics(content)` | 3 topics from 31 predefined categories |
| `translateBatch(items, lang)` | Parallel translation via `Promise.all()` |
| `getTopicTranslation(name, lang)` | Cached topic translation |
| `optimizeImagePrompt(content, title)` | fal.ai prompt generation |
| `generateWeeklySummary(articles)` | Sunday Edition digest |

See [AI Optimization Analysis](ai-optimization-analysis.md) for caching strategy, rate limiting, and monitoring endpoints.

### Scheduled Jobs

Three cron jobs run on configurable schedules (set via Settings → Scheduled Tasks):

1. **Main Scraper** (`0 * * * *` hourly) — scrapes all active sources
2. **Missing AI Processor** (`*/20 * * * *`) — fills missing summaries/tags/images/translations
3. **Sunday Edition** (`0 0 * * 0` Sunday midnight) — generates weekly digest

Locking prevents overlapping executions.

## Related Documentation

- [API Documentation](api-documentation.md) - Complete endpoint reference
- [AI Optimization Analysis](ai-optimization-analysis.md) - AI architecture, optimizations, monitoring
- [Scraping Methods](scraping-methods.md) - Open Source vs Firecrawl, HTML pipeline
- [CSS Selectors](css-selectors.md) - Configuring source selectors
- [Deployment](deployment.md) - Production deployment guide
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
