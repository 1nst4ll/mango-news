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

AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

# Optional
FIRECRAWL_API_KEY=your_key
UNREAL_SPEECH_API_KEY=your_key
```

### Run

```bash
# Terminal 1 — backend (nodemon hot reload)
cd backend && npm run dev   # http://localhost:3000

# Terminal 2 — frontend (Astro dev server)
cd frontend && npm run dev  # http://localhost:4321
```

### Create your admin account

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
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
JWT_SECRET=your-jwt-secret
FIRECRAWL_API_KEY=your-key   # optional
UNREAL_SPEECH_API_KEY=your-key  # optional, Sunday Edition audio
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

## Related Documentation

- [Backend Setup](backend-setup.md) - Full environment variable reference
- [Frontend UI](frontend-ui.md) - Frontend architecture
- [Troubleshooting](troubleshooting.md) - Common deployment issues
