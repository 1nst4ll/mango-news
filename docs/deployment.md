# Deployment Guide

## Local Development

### Prerequisites

- Node.js v18+
- PostgreSQL running locally
- API keys — see [Backend Setup](backend-setup.md#environment-variables) for the full list

### Setup

```bash
# 1. Clone
git clone https://github.com/your-repo/mango-news.git
cd mango-news

# 2. Backend
cd backend
cp .env.example .env   # fill in credentials (see backend-setup.md)
npm install

# 3. Database
cd ../db
psql -U postgres -d mangonews -f schema.sql

# 4. Frontend
cd ../frontend
cp .env.example .env   # set PUBLIC_API_URL=http://localhost:3000
npm install
```

Minimum `backend/.env` for local dev:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mangonews
DB_USER=postgres
DB_PASSWORD=your_local_password

GROQ_API_KEY=your_groq_key
FAL_KEY=your_fal_ai_key
JWT_SECRET=any_random_string_for_dev
REFRESH_TOKEN_SECRET=another_random_string_for_dev  # must be different from JWT_SECRET

AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

# Security
ALLOWED_ORIGINS=http://localhost:4321
NODE_ENV=development

# Optional
FIRECRAWL_API_KEY=your_key
UNREAL_SPEECH_API_KEY=your_key
UNREAL_SPEECH_WEBHOOK_SECRET=any_random_string_for_dev
```

### Run

```bash
# Terminal 1 — backend (nodemon hot reload)
cd backend && npm run dev   # http://localhost:3000

# Terminal 2 — frontend (Astro dev server)
cd frontend && npm run dev  # http://localhost:4321
```

### Create your admin account

Username must be a valid email. Password must be 12+ characters with at least one lowercase letter, one uppercase letter, one number, and one special character.

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"SecurePass1!"}'
```

Then log in via the frontend at `/settings`.

---

## Production Deployment (Render)

Mango News is deployed on **[Render](https://render.com)** as three services:

| Service | Type | Root directory |
|---------|------|----------------|
| Backend API | Web Service (Node.js) | `backend/` |
| Frontend | Web Service (Node.js SSR) | `frontend/` |
| Database | Managed PostgreSQL | — |

### 1. Database

Create a Render Managed PostgreSQL instance, then apply the schema:

```bash
psql -h your-render-host -U your-user -d your-db -f db/schema.sql
```

For existing databases, run any unapplied migrations from `db/migrations/`.

### 2. Backend Web Service

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `node src/index.js`

**Environment variables** (set in Render dashboard):

```env
DB_HOST=your-render-db-host
DB_NAME=mangonews
DB_USER=your-db-user
DB_PASSWORD=your-db-password
GROQ_API_KEY=your-groq-key
FAL_KEY=your-fal-ai-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# Auth & security
JWT_SECRET=your-jwt-secret                        # strong random value — see below
REFRESH_TOKEN_SECRET=your-refresh-secret          # required — independent of JWT_SECRET
NODE_ENV=production                               # enables Secure cookies, hides error details
ALLOWED_ORIGINS=https://your-frontend-url.onrender.com  # must be HTTPS in production

# Required if using Sunday Edition audio narration
UNREAL_SPEECH_API_KEY=your-key
UNREAL_SPEECH_WEBHOOK_SECRET=your-webhook-secret  # required when UNREAL_SPEECH_API_KEY is set

# Optional
FIRECRAWL_API_KEY=your-key
```

### 3. Frontend Web Service

- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `node ./dist/server/entry.mjs`

**Environment variables:**

```env
PUBLIC_API_URL=https://your-backend-url.onrender.com
```

---

## General Node.js Deployment (PM2 + Nginx)

### Backend

```bash
cd backend
npm install --production
npm install -g pm2
pm2 start src/index.js --name mango-news-backend
pm2 save
```

### Frontend

```bash
cd frontend
npm install && npm run build
pm2 start ./dist/server/entry.mjs --name mango-news-frontend
```

**Nginx reverse proxy:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Use Render's automatic SSL or Let's Encrypt for HTTPS. Ensure `PUBLIC_API_URL` uses `https://`.

> **Cross-domain cookies:** If the frontend and backend are on different domains (e.g. separate Render services), the JWT cookies are set with `SameSite=None; Secure` in production. This requires HTTPS on both ends (enforced by Render). If you consolidate both services under a single custom domain via a reverse proxy, you can switch back to `SameSite=Strict` for tighter security.

---

## Memory Optimization

For memory-constrained environments:

```bash
node --max-old-space-size=512 src/index.js
```

The backend is already optimized with:
- **Shared browser pool** — single Puppeteer instance for all scraping
- **Shared DB pool** — 10 max connections, 30s idle timeout
- **Cron job locking** — prevents overlapping scheduled tasks
- **Graceful shutdown** — `SIGTERM`/`SIGINT` handlers clean up resources

Monitor via backend logs:
```
[MEMORY] RSS: XXXMb, Heap Used: XXXMb
[BROWSER] Connected: true, PID: XXXX
```

Or query `GET /api/stats` (authenticated) for database statistics.

---

## Database Backup & Recovery

### Render Managed PostgreSQL

Render automatically creates daily backups of managed PostgreSQL databases. To access:

1. Go to your PostgreSQL dashboard on Render
2. Click **Backups** tab to see available snapshots
3. Use **Manual Backup** before destructive operations (schema changes, purges)

### Manual Backup via pg_dump

For additional safety, create manual backups before major operations:

```bash
# Full database dump (requires external hostname + SSL)
PGPASSWORD='your_password' pg_dump \
  -h dpg-XXXXX-a.ohio-postgres.render.com \
  -U mangonewsadmin -d mangonews \
  --no-owner --no-privileges \
  -F c -f mangonews_backup_$(date +%Y%m%d).dump

# Restore from backup
PGPASSWORD='your_password' pg_restore \
  -h dpg-XXXXX-a.ohio-postgres.render.com \
  -U mangonewsadmin -d mangonews \
  --no-owner --no-privileges \
  mangonews_backup_20260329.dump
```

### When to Back Up

- Before applying database migrations
- Before running article/edition purge operations
- Before rotating database credentials
- Before any schema changes

### S3 Media Storage

Generated images and audio files are stored in the `mangonewsimages` S3 bucket. S3 provides built-in durability (99.999999999%) but consider enabling:

- **S3 Versioning** — protects against accidental deletion
- **Lifecycle Rules** — auto-delete old/unused files after N days to control costs

---

## Cron Job Locking

Scheduled tasks (scraper, missing AI processor, Sunday Edition) use database-based locking via rows in the `application_settings` table. This prevents overlapping executions even if the server restarts mid-job.

Lock names: `lock_main_scraper`, `lock_missing_ai`, `lock_sunday_edition`

Stale locks (older than 2 hours) are automatically cleaned up. To manually clear a stuck lock:

```sql
DELETE FROM application_settings WHERE setting_name = 'lock_main_scraper';
```

---

## Progressive Web App (PWA)

The frontend is configured as a PWA with offline support:

### Service Worker (`frontend/public/sw.js`)

Registered in `BaseLayout.astro` on page load. Uses three caching strategies:

| Content Type | Strategy | Details |
|-------------|----------|---------|
| HTML pages | Network-first | Falls back to cached version when offline |
| Static assets (JS/CSS/images/fonts) | Cache-first | Served from cache, updated in background |
| API responses | Stale-while-revalidate | Returns cached data immediately, refreshes in background |

**Exclusions:** `/settings` pages and auth endpoints (`/me`, `/login`, `/logout`, `/refresh`) are never cached.

**Pre-cached assets:** `/logo.png`, `/favicon.ico`, `/android-chrome-192x192.png`

### Web App Manifest (`frontend/public/site.webmanifest`)

- **Name:** Mango News - Turks and Caicos
- **Start URL:** `/en/`
- **Display:** standalone (full-screen app experience)
- **Theme color:** `#FFB88C` (mango accent)
- **Icons:** 192x192 and 512x512 PNG

### Cache Versioning

To invalidate caches after a major update, increment the version strings in `sw.js`:
```javascript
const CACHE_NAME = 'mango-news-v2';    // was v1
const STATIC_CACHE = 'mango-news-static-v2';
const API_CACHE = 'mango-news-api-v2';
```
Old caches are automatically deleted on service worker activation.

---

## Emergency Alert Banner

An admin-controlled banner for hurricane warnings or other emergencies:

- **Enable:** `PUT /api/settings/emergency` with `{ "enabled": true, "text": "Hurricane warning..." }`
- **Disable:** `PUT /api/settings/emergency` with `{ "enabled": false }`
- Stored in `application_settings` table (`emergency_banner_enabled`, `emergency_banner_text`)
- Renders above the Header on all public pages
- Users can dismiss per session (persisted in sessionStorage)
- Banner is fetched on every page load via `GET /api/settings/emergency` (public, no auth)

---

## Related Documentation

- [Backend Setup](backend-setup.md) - Full environment variable reference
- [Frontend UI](frontend-ui.md) - Frontend architecture
- [Troubleshooting](troubleshooting.md) - Common deployment issues
- [Roadmap](roadmap.md) - Future development plans
