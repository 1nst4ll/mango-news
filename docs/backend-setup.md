# Backend Setup and Configuration

This guide covers setting up and configuring the Mango News backend.

## Prerequisites

- Node.js and npm installed
- PostgreSQL database
- API keys:
  - **Groq API** - AI summaries and translations
  - **Ideogram API** - AI image generation
  - **AWS S3** - Image storage
  - **Firecrawl API** - Optional, for Firecrawl scraping method
  - **Unreal Speech API** - Optional, for Sunday Edition audio

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE mangonews;
CREATE USER mangoadmin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mangonews TO mangoadmin;
```

### 2. Apply Schema

```bash
cd db
psql -U mangoadmin -d mangonews -f schema.sql
```

The schema creates the following tables:
- `users` - Authentication
- `sources` - News source configurations
- `articles` - Scraped articles with translations
- `topics` - Topic tags with translations
- `article_topics` - Article-topic relationships
- `application_settings` - Scheduler and app settings
- `sunday_editions` - Weekly summary posts

### 3. Run Migrations

For existing databases, apply migrations:

```bash
psql -U mangoadmin -d mangonews -f db/migrations/add_translation_columns.sql
psql -U mangoadmin -d mangonews -f db/migrations/add_sunday_editions_table.sql
# Apply other migrations as needed
```

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

## Environment Variables

Edit `backend/.env`:

```env
# Database
DB_HOST=localhost
DB_NAME=mangonews
DB_USER=mangoadmin
DB_PASSWORD=your_database_password

# AI Services
GROQ_API_KEY=your_groq_api_key
IDEOGRAM_API_KEY=your_ideogram_api_key

# AWS S3 (for AI-generated images)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name

# Optional
FIRECRAWL_API_KEY=your_firecrawl_api_key  # For Firecrawl scraping
UNREAL_SPEECH_API_KEY=your_unreal_key     # For Sunday Edition audio

# Authentication
JWT_SECRET=your_jwt_secret_key
```

## Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The API runs on `http://localhost:3000` by default.

## Authentication

The backend uses JWT authentication:

1. **Register:** `POST /api/register` with `{ username, password }`
2. **Login:** `POST /api/login` → Returns `{ token }`
3. **Protected Routes:** Include `Authorization: Bearer YOUR_TOKEN` header

Protected endpoints include:
- Source management (CRUD operations)
- Scraper triggering
- Article deletion/blocking
- Statistics and settings

See [API Documentation](api-documentation.md) for the complete endpoint reference.

## URL Blacklist

Prevent scraping specific URLs by editing `backend/config/blacklist.json`:

```json
[
  "https://example.com/page-to-skip",
  "https://another-site.com/unwanted-article"
]
```

The scraper checks URLs against this list using prefix matching.

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Express server, API routes, graceful shutdown |
| `src/scraper.js` | Article scraping, AI processing, cron jobs |
| `src/opensourceScraper.js` | Puppeteer-based web scraping |
| `src/browserPool.js` | Shared Puppeteer browser instance |
| `src/db.js` | PostgreSQL connection pool |
| `src/sundayEditionGenerator.js` | Weekly AI summary generation |
| `src/user.js` | User authentication logic |
| `src/middleware/auth.js` | JWT verification middleware |

### Scheduled Jobs

The backend runs three cron jobs (configured in Settings):

1. **Main Scraper** - Fetches new articles from all active sources
2. **Missing AI Processor** - Generates AI content for articles missing summaries/tags/images/translations
3. **Sunday Edition** - Weekly news summary with audio narration

## Related Documentation

- [API Documentation](api-documentation.md) - Complete endpoint reference
- [Scraping Methods](scraping-methods.md) - Open-source vs Firecrawl
- [CSS Selectors](css-selectors.md) - Configuring source selectors
- [Deployment](deployment.md) - Production deployment guide
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
