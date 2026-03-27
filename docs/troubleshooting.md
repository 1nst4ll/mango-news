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
2. **Check `article_link_template`** — may be too restrictive or not matching current URLs
3. **Test CSS selectors** in browser console on a live article page: `document.querySelector('.entry-content')`
4. **Check blacklist** — URL may be in `backend/config/blacklist.json`
5. **Review backend logs** — the scraper logs what it finds at each step
6. **Check network** — the target site may be rate-limiting or blocking headless browsers

See [CSS Selectors](css-selectors.md#debugging) for a selector debugging workflow.

### Wrong articles discovered

- Make `article_link_template` more specific (tighter regex)
- Add unwanted URL patterns to `backend/config/blacklist.json`
- Use `exclude_patterns` to strip query parameters that create URL variants

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

Clear the in-memory cache:
```bash
curl -X POST "http://localhost:3000/api/ai-service/clear-cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Then reprocess translations via the article dropdown (Rerun Translations) or bulk action.

---

## Frontend

### Page not displaying / blank screen

1. Verify the frontend server is running: `npm run dev` in `frontend/`
2. Check `PUBLIC_API_URL` in `frontend/.env` points to the running backend
3. Open browser DevTools → Console for JavaScript errors
4. Check Network tab for failed API requests

### Authentication errors — "No token provided"

1. Log in again — the token may have expired
2. Clear `localStorage` and re-login: `localStorage.clear()` in browser console
3. Verify `jwtToken` is present in `localStorage` after login

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
- Shared browser pool (single Puppeteer instance)
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
