# Deployment Guide

Mango News is deployed on **[Render](https://render.com)**:

- **Backend** — Render Web Service (Node.js), `backend/` root directory
- **Frontend** — Render Web Service (Node.js SSR), `frontend/` root directory
- **Database** — Render Managed PostgreSQL

---

## Local Development

### Prerequisites

- Node.js v18+
- PostgreSQL running locally (or a remote dev database)
- All API keys (see [Backend Setup](backend-setup.md))

### 1. Clone and install

```bash
git clone https://github.com/your-org/mango-news.git
cd mango-news
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env   # then fill in your credentials
npm install
```

Minimum `.env` for local dev:

```env
# Database (local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mangonews
DB_USER=postgres
DB_PASSWORD=your_local_password

# Required API keys
GROQ_API_KEY=your_groq_key
FAL_KEY=your_fal_ai_key
JWT_SECRET=any_random_string_for_dev

# AWS S3 (required for image uploads)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

# Optional
FIRECRAWL_API_KEY=your_firecrawl_key
UNREAL_SPEECH_API_KEY=your_unreal_key
```

### 3. Apply database schema

```bash
cd ../db
psql -U postgres -d mangonews -f schema.sql
# For existing databases, also run migrations:
psql -U postgres -d mangonews -f migrations/add_translation_columns.sql
psql -U postgres -d mangonews -f migrations/add_sunday_editions_table.sql
```

### 4. Configure frontend

```bash
cd ../frontend
cp .env.example .env
```

Set the backend URL in `frontend/.env`:

```env
PUBLIC_API_URL=http://localhost:3000
```

Install dependencies:

```bash
npm install
```

### 5. Run both servers

In two separate terminals:

```bash
# Terminal 1 — backend (hot reload via nodemon)
cd backend
npm run dev   # http://localhost:3000

# Terminal 2 — frontend (Astro dev server)
cd frontend
npm run dev   # http://localhost:4321
```

### 6. Create your admin account

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

Then log in via the frontend at `http://localhost:4321/admin` or use the token from `POST /api/login`.

---

## Production Deployment (Render)

## Database Deployment

1. **Create PostgreSQL Database**
   - Use a managed service (Render PostgreSQL, AWS RDS, etc.)
   - Note credentials: host, database name, user, password

2. **Apply Schema**
   ```bash
   psql -h your-host -U your-user -d your-db -f db/schema.sql
   ```

3. **Run Migrations** (for existing databases)
   ```bash
   psql -h your-host -U your-user -d your-db -f db/migrations/add_translation_columns.sql
   psql -h your-host -U your-user -d your-db -f db/migrations/add_sunday_editions_table.sql
   ```

## Render Deployment

### Backend (Web Service)

1. **Create New Web Service** in Render Dashboard
2. **Connect Repository** - Link your Git repo
3. **Configuration:**
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`

4. **Environment Variables:**
   ```
   DB_HOST=your-db-host
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
   FIRECRAWL_API_KEY=your-firecrawl-key  # Optional
   UNREAL_SPEECH_API_KEY=your-key        # Optional, for Sunday Edition
   ```

5. **Deploy** - Render builds and deploys automatically

### Frontend (Web Service)

1. **Create New Web Service** in Render Dashboard
2. **Connect Repository** - Same Git repo
3. **Configuration:**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node ./dist/server/entry.mjs`

4. **Environment Variables:**
   ```
   PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```

5. **Deploy**

## General Node.js Deployment

### Backend

```bash
cd backend
npm install --production
```

**Start with PM2 (recommended):**
```bash
npm install -g pm2
pm2 start src/index.js --name mango-news-backend
pm2 save
```

**Configure reverse proxy** (Nginx example):
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

### Frontend

```bash
cd frontend
npm install
npm run build
```

**Start the SSR server:**
```bash
HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

**PM2 configuration:**
```bash
pm2 start ./dist/server/entry.mjs --name mango-news-frontend
```

## Memory Optimization

For memory-constrained environments, limit Node.js heap:

```bash
node --max-old-space-size=512 src/index.js
```

The backend includes:
- **Shared browser pool** - Single Puppeteer instance for all scraping
- **Connection pooling** - Shared PostgreSQL connections
- **Graceful shutdown** - Proper resource cleanup on SIGTERM/SIGINT
- **Cron job locking** - Prevents overlapping scheduled tasks

## Health Monitoring

The backend logs memory usage periodically:
```
[MEMORY] RSS: XXXMb, Heap Used: XXXMb
[BROWSER] Connected: true, PID: XXXX
```

Use `/api/stats` (authenticated) for database statistics.

## SSL/HTTPS

For production:
- Use Render's automatic SSL
- Or configure Let's Encrypt with your reverse proxy
- Ensure `PUBLIC_API_URL` uses `https://`

## Related Documentation

- [Backend Setup](backend-setup.md) - Full backend configuration
- [Frontend UI](frontend-ui.md) - Frontend architecture
- [Troubleshooting](troubleshooting.md) - Common deployment issues
