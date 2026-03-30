# Troubleshooting

Common issues and solutions for Mango News. For configuration reference, see [Backend Setup](backend-setup.md) and [Deployment](deployment.md).

---

## Backend

### Server won't start

1. Check Node.js version: `node --version` — requires v18+
2. Run `npm install` in the `backend/` directory
3. Verify `backend/.env` exists with all required variables (see [Backend Setup](backend-setup.md#environment-variables))
4. Check the console output for the specific error

### Database connection failed

**Error:** `connect ECONNREFUSED` or `password authentication failed`

1. Confirm PostgreSQL is running
2. Verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env`
3. Ensure the database and user exist with correct permissions
4. Check firewall or network rules if using a remote host

### Schema errors — "relation does not exist"

The schema hasn't been applied or a migration is missing:

```bash
# Fresh install
psql -U mangoadmin -d mangonews -f db/schema.sql

# Existing database — apply missing migrations
psql -U mangoadmin -d mangonews -f db/migrations/add_translation_columns.sql
psql -U mangoadmin -d mangonews -f db/migrations/add_sunday_editions_table.sql
# apply others in db/migrations/ as needed
```

### Connection pool exhausted

**Error:** "too many connections" or slow responses under load

- The backend uses a shared pool (max 10 connections, 30s idle timeout)
- Restart the backend to release stale connections
- Check for connection leaks in any custom code added outside the pool

---

## Scraping

### No articles scraped

1. **Verify source is active** — check `is_active` flag in Source Management
2. **Check `article_link_template`** — may be too restrictive or not matching current URLs. If no template is set, the scraper uses heuristic scoring which may not find articles on all sites
3. **Test CSS selectors** in browser console on a live article page: `document.querySelector('.entry-content')`
4. **Check blacklist** — URL may be in `backend/config/blacklist.json`
5. **Review backend logs** — look for `[discovery]` log lines showing what links were found and their scores
6. **Check network** — the target site may be rate-limiting or blocking headless browsers
7. **Try the onboarding pipeline** — `node src/onboardSource.js <url>` will show what the pipeline detects and where it fails

See [CSS Selectors](css-selectors.md#debugging) for a selector debugging workflow.

### Content extracted but empty or too short

The scraper has fallback extraction — if the configured `os_content_selector` returns nothing, it tries common selectors (`.entry-content`, `.post-content`, `[itemprop="articleBody"]`, `article`, etc.). If content is still empty:

1. The site may use JS-rendered content — the scraper uses `networkidle2` but SPAs may need Firecrawl
2. The content container may use a non-standard class — inspect the page and set `os_content_selector` explicitly
3. Check if `exclude_selectors` is too broad and removing the content

### Wrong articles discovered

- Make `article_link_template` more specific — use placeholder syntax like `https://example.com/{YYYY}/{MM}/{article_slug}/`
- Add unwanted URL patterns to `backend/config/blacklist.json`
- Use `exclude_patterns` to strip query parameters that create URL variants
- The scraper auto-skips 40+ common non-article paths (`/contact`, `/about`, `/login`, etc.) — check `NON_ARTICLE_PATTERNS` in `opensourceScraper.js` if you need to add more

### Duplicate articles

The scraper deduplicates by `source_url`. Duplicates usually mean URL variants are being treated as different articles:

1. Add varying query parameters to `exclude_patterns` (e.g. `utm_source,fbclid,share`)
2. Check for URL variants (trailing slash, www vs non-www) in the database

### Old articles being scraped

Set `scrape_after_date` on the source to ignore articles published before a cutoff date.

### Article text has no paragraph breaks

**Cause:** Source uses `<div>` per paragraph or `<br><br>` instead of `<p>` tags.

The sanitizer handles this automatically (`serializeContainer` for div-based sources, pre-processing for `<br><br>` sources). If it still fails:
1. Verify `os_content_selector` targets the correct container element
2. Check the raw HTML source to confirm which pattern the site uses

### Drop-cap letter appears oversized

**Cause:** The source CMS injects a single-letter `<span class="dropcap">` that passes through sanitization.

The sanitizer strips these automatically using class-name and single-uppercase-letter heuristics. If it persists, find the drop-cap class name in the raw HTML and add it to the `DROP_CAP_CLASS` regex in `scraper.js`.

### Image captions appearing in article body

**Cause:** `<figure>`/`<figcaption>` content leaking through.

The sanitizer pre-strips all `<figure>` blocks before DOMPurify runs. If captions still appear, the source uses a non-standard caption element — add it to `SKIP_TAGS` in `scraper.js`.

### Bold headings running inline with paragraphs

**Cause:** CMS uses `<p><strong>Heading</strong></p>` instead of `<h>` tags.

The sanitizer automatically promotes `<p>` elements whose sole child is `<strong>`/`<b>` to `<h3>`. If this isn't triggering, check whether additional whitespace or sibling nodes are preventing the heuristic from matching.

---

## AI Features

### Summaries / tags / images / translations not generated

1. Verify API keys in `.env`: `GROQ_API_KEY`, `FAL_KEY`
2. Check source-level AI toggles are enabled in Source Management
3. For manual scrapes, check global AI toggles in Settings → Global Settings
4. Review backend logs for API error responses (rate limits, quota exceeded)

### Groq rate limit errors

The AI service enforces `AI_RATE_LIMIT_PER_MINUTE` (default 60) to prevent hitting Groq's limits. If you're still hitting limits:
- Lower the rate limit env var to be safe
- Check `GET /api/ai-service/stats` (authenticated) to see current request count
- Consider staggering batch processing across multiple scheduled runs

### Translations are stale or wrong

Clear the in-memory cache via the Settings page, or with curl using a saved session cookie:
```bash
# With cookie file saved from login
curl -b cookies.txt -X POST "http://localhost:3000/api/ai-service/clear-cache"

# Or with a raw token (non-browser clients)
curl -X POST "http://localhost:3000/api/ai-service/clear-cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Then reprocess translations via the article dropdown (Rerun Translations) or bulk action.

---

## Frontend

### Article pages return 500 Internal Server Error

**Cause:** The Astro SSR fetch to the backend throws an uncaught exception (network timeout, cold start, DNS failure). Unlike the homepage (which wraps SSR fetches in try-catch and loads articles client-side), the article pages previously had an unprotected `fetch()` call that crashed the entire render.

**Fix applied:** Both article pages (`article/[id].astro` and `[lang]/article/[id].astro`) now wrap the backend fetch in try-catch. If SSR fails, the page renders with generic meta tags and the `ArticleDetail` client component retries the fetch from the browser.

**If it recurs:**
1. Check Render logs for the specific SSR error
2. Verify `PUBLIC_API_URL` is set correctly in Render dashboard (must be the backend URL)
3. Check that the backend service is awake — Render free tier spins down after inactivity

### "Cannot access 'displayTitle' before initialization" (SSR)

**Cause:** React SSR evaluates `useEffect` dependency arrays eagerly, even though callbacks are not executed. If a `const` variable is used in a dependency array but declared after conditional early returns, JavaScript's Temporal Dead Zone throws a `ReferenceError`.

**Fix:** In `ArticleDetail.tsx`, `displayTitle` and `getTranslatedText` must be defined before all `useEffect` hooks. Do not move them after conditional returns.

### Page not displaying / blank screen

1. Verify the frontend server is running: `npm run dev` in `frontend/`
2. Check `PUBLIC_API_URL` in `frontend/.env` points to the running backend
3. Open browser DevTools → Console for JavaScript errors
4. Check Network tab for failed API requests

### Authentication errors — "No token provided" / redirected to homepage

Auth is cookie-based. Tokens are no longer stored in `localStorage`.

1. Log in again via the user menu — the session (cookie) may have expired
2. Check browser DevTools → Application → Cookies — look for a `jwt` cookie on the **backend** domain (e.g. `mango-news.onrender.com`), not the frontend domain
3. If the cookie exists but requests still fail, verify `ALLOWED_ORIGINS` on the backend includes your exact frontend URL (e.g. `https://mangonews.onrender.com`) and `NODE_ENV=production` is set
4. For cross-origin setups (frontend and backend on different domains), the backend must have `NODE_ENV=production` so cookies are issued with `SameSite=None; Secure` — without this, browsers will block the cookie from being sent cross-domain
5. After changing `NODE_ENV` or cookie settings, clear old cookies in DevTools → Application → Cookies → Clear All, then log in again
6. If you previously had a `jwtToken` in `localStorage`, it is no longer used — clear it with `localStorage.removeItem('jwtToken')`

### Settings page not visible after login

The Settings nav item only appears when `/api/me` returns a successful response.

1. Open DevTools → Network, filter by `api/me` — check the response status
2. A `401` means the `jwt` cookie is not being sent — see authentication errors above
3. A `404` or network error means `PUBLIC_API_URL` on the frontend is pointing to the wrong backend URL
4. After fixing, clear cookies and log in again — old `SameSite=Strict` cookies won't be sent cross-domain

### Rate limit errors — 429 Too Many Requests

- **Auth endpoints** (`/api/login`, `/api/register`): limited to 5 failed attempts per 15 minutes per IP
- **General API**: limited to 100 requests per minute per IP
- **AI/scrape endpoints** (`/api/articles/:id/process-ai`, `/api/scrape/run`, `/api/sunday-editions/generate`): limited to 20 requests per hour per IP

### Infinite scroll stops loading

1. Check browser console for API errors
2. Verify backend is responding to paginated requests: `GET /api/articles?page=2`
3. Check Network tab for failed or cancelled requests
4. Refresh the page to reset scroll state

### Theme toggle not working (iOS Safari)

The theme switcher uses a simple button (not a dropdown) for iOS Safari compatibility. If it's unresponsive:
```javascript
localStorage.removeItem('theme');
location.reload();
```

---

## Memory and Performance

### Backend restarts / OOM crashes

The backend includes several memory optimizations already:
- Shared browser pool (single Puppeteer instance) with configurable resource blocking
- Images, fonts, stylesheets, and media blocked by default during scraping to reduce memory
- Shared DB connection pool
- Cron job locking prevents overlapping scheduled tasks
- Graceful shutdown handlers on `SIGTERM`/`SIGINT`

If still crashing:
1. Set a heap limit: `node --max-old-space-size=512 src/index.js`
2. Watch `[MEMORY]` log lines for RSS/heap trends
3. Check Render logs for OOM signals
4. Ensure no custom code is creating additional browser or DB connections

---

## Deployment

### Render restarts frequently

1. Check memory — add `--max-old-space-size=512` to the start command
2. Review Render logs for the crash reason (OOM, uncaught exception, timeout)
3. Verify all required environment variables are set in the Render dashboard
4. Confirm graceful shutdown is working (look for `[SHUTDOWN]` log entries)

### Frontend build fails on Render

1. Check for TypeScript errors: `npm run build` locally first
2. Ensure all dependencies are in `package.json` (not just `devDependencies` if needed at runtime)
3. Clear the Render build cache and retry
4. Verify Node.js version compatibility (v18+)

---

## Related Documentation

- [Backend Setup](backend-setup.md) - Configuration reference
- [Scraping Methods](scraping-methods.md) - Scraper internals
- [CSS Selectors](css-selectors.md) - Selector debugging
- [Deployment](deployment.md) - Production setup
- [AI Optimization Analysis](ai-optimization-analysis.md) - AI monitoring endpoints
