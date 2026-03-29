# API Documentation

**Base URL:** `http://localhost:3000` (dev) or your deployed backend URL.

All endpoints return JSON. Errors use the shape `{ "error": "description" }`.

**Route organization:** The API is organized into route modules: `auth`, `articles`, `sources`, `scraping`, `sundayEditions`, `stats`, `settings`, `rss`. Each module is in `backend/src/routes/`.

## Authentication

Protected endpoints use **HttpOnly cookie authentication**. On a successful login the backend sets a `jwt` cookie — the browser sends it automatically on subsequent requests. No manual `Authorization` header is needed from the browser.

**To authenticate from a browser (frontend):** use `credentials: 'include'` on every `fetch` call (the `apiFetch` wrapper in `frontend/src/lib/api.ts` does this automatically).

**To authenticate from a non-browser API client** (curl, scripts): pass the token in the `Authorization` header as a fallback:
```
Authorization: Bearer YOUR_TOKEN
```

**Login flow:**
1. `POST /api/login` — sets `jwt` (1-hour access cookie) and `jwt_refresh` (24h or 30-day refresh cookie, depending on `rememberMe`)
2. On 401, call `POST /api/refresh` to silently get a new access cookie using the refresh cookie
3. `POST /api/logout` — clears both cookies
4. `GET /api/me` — check whether the current session is valid

**Common HTTP status codes:**
- `400` — malformed request or missing/invalid fields
- `401` — no token / session expired
- `403` — valid token but insufficient permissions (wrong role)
- `404` — resource not found
- `429` — rate limit exceeded (see Rate Limiting section below)
- `500` — unexpected server error (details only visible with `NODE_ENV=development`)

---

## User Management

### `POST /api/register`

Register a new admin user. No auth required. Rate-limited to 5 attempts per 15 minutes.

**Body:** `{ "username": "email@example.com", "password": "string" }`

Password rules: minimum 12 characters, at least one lowercase letter, one uppercase letter, one number, and one special character.

**Response `201`:** `{ "message": "User registered successfully.", "user": { "id": 1, "email": "admin@example.com" } }`

**Response `400`:** Validation error — e.g. `{ "error": "Password must be at least 12 characters." }`

---

### `POST /api/login`

Login. Sets `jwt` and `jwt_refresh` HttpOnly cookies. Rate-limited to 5 failed attempts per 15 minutes.

**Body:** `{ "username": "email@example.com", "password": "string", "rememberMe": false }`

`rememberMe: true` extends the refresh cookie lifetime from 24 hours to 30 days.

**Response `200`:** `{ "message": "Login successful." }` (token is in the cookie — not the body)

---

### `POST /api/logout`

Clear both auth cookies. No auth required (safe to call even when not logged in).

**Response `200`:** `{ "message": "Logged out successfully." }`

---

### `POST /api/refresh`

Exchange the `jwt_refresh` cookie for a new 1-hour `jwt` access cookie. Called automatically by the `apiFetch` wrapper on 401 responses.

**Response `200`:** `{ "message": "Token refreshed." }`

**Response `401`:** No refresh cookie present.

**Response `403`:** Refresh token invalid or expired.

---

### `GET /api/me`

Lightweight session check — returns the current user if the `jwt` cookie is valid.

**Response `200`:** `{ "userId": 1, "email": "admin@example.com" }`

**Response `401`:** Not authenticated.

---

## Sources

### `GET /api/sources`

List all news sources. Public.

**Response `200`:** Array of source objects (see PUT body for field list).

---

### `GET /api/sources/:id`

Get a single source. Public.

**Response `200`:** Source object. `404` if not found.

---

### `POST /api/sources` 🔒

Create a new source.

**Body:**
```json
{
  "name": "string",
  "url": "string",
  "is_active": true,
  "enable_ai_summary": true,
  "enable_ai_tags": true,
  "enable_ai_image": true,
  "enable_ai_translations": true,
  "scraping_method": "opensource",
  "article_link_template": "string | null",
  "exclude_patterns": "string | null",
  "include_selectors": "string | null",
  "exclude_selectors": "string | null",
  "scrape_after_date": "ISO 8601 string | null"
}
```

**Response `201`:** Created source object.

---

### `PUT /api/sources/:id` 🔒

Update a source. All fields optional — only provided fields are updated.

**Body:** Same fields as POST, plus Open Source selector fields:
```json
{
  "os_title_selector": "string | null",
  "os_content_selector": "string | null",
  "os_date_selector": "string | null",
  "os_author_selector": "string | null",
  "os_thumbnail_selector": "string | null",
  "os_topics_selector": "string | null"
}
```

**Response `200`:** Updated source object. `404` if not found.

---

### `DELETE /api/sources/:id` 🔒

Delete a source.

**Response `204`:** No content. `404` if not found.

---

### `GET /api/sources/:sourceId/articles`

Articles for a specific source, with pagination and AI-status filtering.

**Query parameters:**
- `page` (default: `1`), `limit` (default: `15`, max: `100`)
- `sortBy` (default: `publication_date`) — allowed values: `id`, `title`, `publication_date`, `created_at`
- `sortOrder` (`ASC`|`DESC`, default: `DESC`)
- `filterByAiStatus`: `missing_summary`, `missing_tags`, `missing_image`, `missing_translations`, `has_summary`, `has_tags`, `has_image`, `has_translations`

**Response `200`:** Array of article summaries. `X-Total-Count` header contains the total count.

---

### `POST /api/sources/:sourceId/reprocess-topics` 🔒

Re-translate all topic assignments for a source's articles.

**Response `200`:** `{ "message": "...", "processedCount": 42, "errorCount": 0 }`

---

### `GET /api/sources/:sourceId/rescrape-stream` 🔒

Re-scrape all articles for a source, streaming progress as Server-Sent Events.

**Response `200` (SSE stream):** Events with `{ "status": "info"|"success"|"error"|"complete", "message": "..." }`

---

### `POST /api/sources/:sourceId/rescrape` 🔒

Re-scrape all articles for a source (non-streaming).

**Response `200`:** `{ "message": "...", "articlesRescraped": 42, "errorCount": 0 }`

---

## Articles

### `GET /api/articles`

List articles with pagination and filtering. Public. Blocked articles (`is_blocked = TRUE`) are always excluded from results.

**Query parameters:**
- `page` (default: `1`), `limit` (default: `15`)
- `topic` — comma-separated topic names
- `source_ids` — comma-separated source IDs (e.g. `1,3,5`)
- `startDate`, `endDate` — ISO 8601 date strings
- `searchTerm` — full-text search using trigram similarity (`%` operator) on titles for fuzzy matching, plus `ILIKE` on content. Requires the `pg_trgm` PostgreSQL extension.

**Response `200`:** Array of article objects with `X-Total-Count` header.

**Article object shape:**
```json
{
  "id": 1,
  "title": "string",
  "source_url": "string",
  "thumbnail_url": "string | null",
  "ai_image_path": "string | null",
  "publication_date": "string",
  "raw_content": "string",
  "summary": "string | null",
  "is_blocked": false,
  "source_id": 1,
  "author": "string | null",
  "title_es": "string | null",
  "summary_es": "string | null",
  "raw_content_es": "string | null",
  "title_ht": "string | null",
  "summary_ht": "string | null",
  "raw_content_ht": "string | null",
  "topics": ["string"],
  "topics_es": ["string"],
  "topics_ht": ["string"]
}
```

---

### `GET /api/articles/:id`

Get a single article. Public.

**Response `200`:** Article object (same shape as above). `404` if not found.

---

### `PUT /api/articles/:id` 🔒

Update article fields. All body fields optional.

**Body:** Any subset of article fields including `title`, `author`, `publication_date`, `raw_content`, `summary`, `thumbnail_url`, `topics`, `source_url`, `title_es`, `summary_es`, `raw_content_es`, `topics_es`, `title_ht`, `summary_ht`, `raw_content_ht`, `topics_ht`.

**Response `200`:** Updated article object.

---

### `DELETE /api/articles/:id` 🔒

Delete an article and its topic links.

**Response `204`:** No content.

---

### `PUT /api/articles/:id/block` 🔒

Block an article from appearing in the public feed.

**Response `200`:** `{ "message": "Article 1 blocked successfully." }`

---

### `POST /api/articles/:articleId/process-ai` 🔒

Trigger a single AI feature for one article.

**Body:** `{ "featureType": "summary" | "tags" | "image" | "translations" }`

**Response `200`:** `{ "message": "AI processing completed for article ID 1, feature summary." }`

---

### `POST /api/articles/:articleId/rescrape` 🔒

Re-fetch content for a single article from its source URL.

**Response `200`:** `{ "message": "Article 1 rescraped successfully." }`

---

### `POST /api/articles/purge` 🔒

Delete all articles, topics, and topic links. Resets the article ID sequence.

**Response `200`:** `{ "message": "All articles, topics, and article links purged successfully." }`

---

### `POST /api/articles/purge/:sourceId` 🔒

Delete all articles for a specific source.

**Response `200`:** `{ "message": "...", "articlesDeleted": 42 }`

---

## Topics

### `GET /api/topics`

List distinct topics. Supports the same filters as `GET /api/articles` to return only topics present in the filtered article set. Public.

**Query parameters:** `searchTerm`, `startDate`, `endDate`, `sources` (comma-separated source names)

**Response `200`:**
```json
[{ "id": 1, "name": "Politics", "name_es": "Política", "name_ht": "Politik" }]
```

---

## Source Onboarding

### `POST /api/sources/onboard` 🔒

Automated source onboarding — analyzes a news page URL, detects CMS type, proposes selectors, validates extraction, and optionally saves the source.

**Body:**
```json
{
  "url": "https://example.com/news/",
  "name": "Example News",
  "saveToDB": false
}
```

**Response `200`:**
```json
{
  "sourceUrl": "https://example.com/news/",
  "steps": {
    "fetchSource": { "success": true, "siteName": "Example News", "articleLinksFound": 15 },
    "fetchArticle": { "success": true, "url": "https://example.com/news/article-1" },
    "detectSelectors": { "success": true, "selectors": { "os_title_selector": "h1.entry-title", "..." : "..." } },
    "validate": { "success": true, "fieldResults": { "title": "OK", "content": "OK (450 words)" } },
    "crossValidate": { "success": true }
  },
  "proposedConfig": {
    "name": "Example News",
    "url": "https://example.com/news/",
    "scraping_method": "opensource",
    "os_title_selector": "h1.entry-title",
    "os_content_selector": ".entry-content",
    "article_link_template": "https://example.com/{YYYY}/{MM}/{article_slug}/",
    "_cms_detected": "wordpress"
  },
  "validation": { "valid": true, "issues": [] },
  "saved": false,
  "errors": []
}
```

Set `saveToDB: true` to save the source configuration to the database. Dry run (default) returns the proposed config without saving.

---

## Scraping

### `POST /api/scrape/run/:id` 🔒

Scrape a single source.

**Body:**
```json
{
  "enableGlobalAiSummary": false,
  "enableGlobalAiTags": false,
  "enableGlobalAiImage": false,
  "enableGlobalAiTranslations": false
}
```

**Response `200`:** `{ "message": "Scraping triggered for Source Name", "linksFound": 12, "articlesAdded": 3 }`

---

### `POST /api/scrape/run` 🔒

Full scraper run — all active sources. Same body as single-source scrape.

**Response `200`:** `{ "message": "Full scraper run triggered successfully. Check backend logs for progress." }`

---

### `POST /api/process-missing-ai/:sourceId` 🔒

Process missing AI data for all articles in a source.

**Body:** `{ "featureType": "summary" | "tags" | "image" | "translations" }`

**Response `200`:** `{ "message": "...", "processedCount": 10, "errorCount": 0 }`

---

## Sunday Editions

### `POST /api/sunday-editions/generate` 🔒

Manually trigger Sunday Edition generation.

**Response `200`:** `{ "message": "Sunday Edition created successfully.", "id": 1 }`

---

### `GET /api/sunday-editions`

List Sunday Editions (paginated). Public.

**Query parameters:** `page` (default: `1`), `limit` (default: `15`)

**Response `200`:** Array with `X-Total-Count` header. Each item: `{ id, title, summary, narration_url, image_url, publication_date, created_at }`.

---

### `GET /api/sunday-editions/:id`

Get a single Sunday Edition. Public.

**Response `200`:** `{ id, title, summary, narration_url, image_url, publication_date, created_at }`. `404` if not found.

---

### `PUT /api/sunday-editions/:id` 🔒

Update a Sunday Edition. Admin only.

**Body:** Any subset of `{ "title": "string", "summary": "string", "image_url": "string", "publication_date": "ISO 8601 string" }`.

**Response `200`:** Updated Sunday Edition object.

---

### `DELETE /api/sunday-editions/:id` 🔒

Delete a Sunday Edition. Admin only.

**Response `204`:** No content.

---

### `POST /api/sunday-editions/:id/regenerate-image` 🔒

Regenerate the AI image for a Sunday Edition. Admin only. Rate-limited by the expensive limiter (20 requests/hour).

**Response `200`:** `{ "message": "Image regenerated successfully.", "image_url": "https://..." }`

---

### `POST /api/sunday-editions/:id/regenerate-audio` 🔒

Regenerate the audio narration for a Sunday Edition. Admin only. Rate-limited by the expensive limiter (20 requests/hour).

**Response `200`:** `{ "message": "Audio regeneration initiated.", "task_id": "string" }`

The audio is generated asynchronously via Unreal Speech. The `task_id` can be used to track progress. The `narration_url` on the Sunday Edition will be updated when the callback is received.

---

### `POST /api/sunday-editions/purge` 🔒

Delete all Sunday Editions. Admin only.

**Response `200`:** `{ "message": "All Sunday Editions purged successfully." }`

---

### `POST /api/unreal-speech-callback`

Async callback from Unreal Speech when MP3 narration is ready. Called by Unreal Speech — not for direct client use.

Payload is validated with Zod (`TaskId: string`, `TaskStatus: completed|failed|processing|pending`). `UNREAL_SPEECH_WEBHOOK_SECRET` **must** be set in the environment; the request must include a matching `x-webhook-secret` header or it will be rejected with `401`.

---

## Settings

### `GET /api/settings/scheduler` 🔒

Get current cron schedules and feature toggles.

**Response `200`:**
```json
{
  "main_scraper_frequency": "0 * * * *",
  "missing_ai_frequency": "*/20 * * * *",
  "sunday_edition_frequency": "0 0 * * 0",
  "enable_scheduled_missing_summary": true,
  "enable_scheduled_missing_tags": true,
  "enable_scheduled_missing_image": true,
  "enable_scheduled_missing_translations": true
}
```

---

### `POST /api/settings/scheduler` 🔒

Save cron schedules and feature toggles. Takes effect immediately without restart.

**Body:** Same shape as GET response.

**Response `200`:** `{ "message": "Scheduler settings saved successfully." }`

---

### `GET /api/settings/emergency`

Get the current emergency banner settings. **Public** (no auth required) — called by the EmergencyBanner frontend component on every page load.

**Response `200`:**
```json
{
  "enabled": false,
  "text": "Hurricane warning: Stay safe and follow official guidance."
}
```

---

### `PUT /api/settings/emergency` 🔒

Update emergency banner settings. Admin only. Values are stored in the `application_settings` table.

**Body:** `{ "enabled": true, "text": "Hurricane warning: seek shelter immediately." }` — both fields optional.

**Response `200`:** `{ "message": "Emergency settings updated successfully." }`

---

## Statistics

### `GET /api/stats` 🔒

Database statistics for the admin dashboard.

**Response `200`:**
```json
{
  "totalArticles": 1234,
  "totalSources": 8,
  "articlesPerSource": [{ "source_name": "string", "article_count": 150 }],
  "articlesPerYear": [{ "year": 2025, "article_count": 800 }]
}
```

---

## AI Service Monitoring

### `GET /api/ai-service/stats` 🔒

Cache size, rate limit state, and model configuration. See [AI Optimization Analysis](ai-optimization-analysis.md#monitoring).

### `POST /api/ai-service/clear-cache` 🔒

Clear the in-memory translation cache.

**Response `200`:** `{ "message": "AI service cache cleared successfully." }`

---

## RSS Feed

### `GET /api/rss`

RSS feed of the latest 20 articles. Public.

**Response `200`:** `application/rss+xml` — each item includes title, link (to frontend article page), `pubDate`, description (AI summary + image), `guid` (original source URL), author (source name).

Article links in the feed use the `SITE_URL` environment variable (default: `https://mango.tc`).

---

## Rate Limiting

Three tiers of rate limiting are applied via `express-rate-limit`:

| Tier | Limit | Applies to |
|---|---|---|
| **General** | 100 requests / minute | All endpoints |
| **Auth** | 5 failed attempts / 15 minutes | `POST /api/login`, `POST /api/register` only |
| **Expensive** | 20 requests / hour | AI processing, scraping, Sunday Edition generation and regeneration |

When a limit is exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header.

---

## Notes

- Pagination: default page size is `15`, maximum is `100`, for articles and Sunday Editions
- `X-Total-Count` response header on all paginated endpoints contains the total matching count (as a string)
- 🔒 = requires authentication (browser: `jwt` cookie sent automatically; API clients: `Authorization: Bearer TOKEN` header)
- Article search uses the `pg_trgm` PostgreSQL extension for fuzzy matching on titles
- Blocked articles (`is_blocked = TRUE`) are excluded from all public article endpoints

## Related Documentation

- [Backend Setup](backend-setup.md) - Authentication setup and environment variables
- [Admin UI](admin-ui.md) - Frontend controls that call these endpoints
- [AI Optimization Analysis](ai-optimization-analysis.md) - AI monitoring endpoints detail
- [Multilingual Support](multilingual-support.md) - Translation field reference
