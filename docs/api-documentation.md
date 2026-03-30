# API Documentation

**Base URL:** `http://localhost:3000` (dev) or your deployed backend URL.

All endpoints return JSON. Errors use the shape `{ "error": "description" }`.

**Route organization:** The API is organized into route modules: `auth`, `articles`, `sources`, `scraping`, `sundayEditions`, `stats`, `settings`, `topics`, `rss`. Each module is in `backend/src/routes/`.

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
- `search` — server-side search by title (ILIKE), source URL, or exact article ID

**Response `200`:** Array of article summaries (includes `is_blocked` field). `X-Total-Count` header contains the total count.

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

### `GET /api/articles/admin/search` 🔒

Search articles across all sources (includes blocked articles). Admin only.

**Query parameters:** `q` (search term, min 2 chars), `limit` (default: `20`, max: `50`)

**Response `200`:** Array of `{ id, title, source_url, is_blocked, publication_date, source_name, source_id }`.

---

### `GET /api/articles/:id/adjacent`

Get the previous and next articles by publication date (for navigation). Public.

**Response `200`:** `{ "prev": { "id": 1, "title": "..." } | null, "next": { "id": 2, "title": "..." } | null }`

---

### `PUT /api/articles/:id/block` 🔒

Toggle block status for an article. Blocked articles are hidden from the public feed.

**Body:** `{ "blocked": true }` — set `true` to block, `false` to unblock. Defaults to `true` if omitted.

**Response `200`:** `{ "message": "Article 1 blocked successfully.", "is_blocked": true }`

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

List Sunday Editions (paginated). Public (only published editions by default).

**Query parameters:** `page` (default: `1`), `limit` (default: `15`), `include_drafts=true` (admin: include draft editions)

**Response `200`:** Array with `X-Total-Count` header. Each item: `{ id, title, summary, narration_url, image_url, publication_date, status, created_at }`.

---

### `GET /api/sunday-editions/:id`

Get a single Sunday Edition. Public.

**Response `200`:** `{ id, title, summary, narration_url, image_url, publication_date, created_at }`. `404` if not found.

---

### `PUT /api/sunday-editions/:id` 🔒

Update a Sunday Edition. Admin only.

**Body:** Any subset of `{ "title": "string", "summary": "string", "image_url": "string", "publication_date": "ISO 8601 string", "status": "draft" | "published" }`.

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

The response shape depends on the active TTS provider (configured in Settings → AI Models → TTS Settings):

**UnrealSpeech (async):**
```json
{ "message": "Audio regeneration initiated.", "task_id": "abc123" }
```
The `task_id` tracks the async job. The `narration_url` on the Sunday Edition is set when `POST /api/unreal-speech-callback` fires.

**fal.ai Gemini TTS / fal.ai MiniMax (sync):**
```json
{ "message": "Audio regeneration initiated.", "narration_url": "https://s3.../sunday-edition-uuid.mp3" }
```
Audio is generated synchronously and uploaded to S3; `narration_url` is set immediately.

---

### `POST /api/sunday-editions/purge` 🔒

Delete all Sunday Editions. Admin only.

**Response `200`:** `{ "message": "All Sunday Editions purged successfully." }`

---

### `POST /api/unreal-speech-callback`

Async callback from Unreal Speech when MP3 narration is ready. Called by Unreal Speech — not for direct client use.

Payload is validated with Zod (`TaskId: string`, `TaskStatus: completed|failed|processing|pending`). `UNREAL_SPEECH_WEBHOOK_SECRET` **must** be set in the environment; the request must include a matching `x-webhook-secret` header or it will be rejected with `401`.

---

## Topic Management

### `GET /api/admin/topics` 🔒

List all topics with article counts. Returns topics sorted alphabetically.

**Response `200`:**
```json
[{ "id": 1, "name": "Politics", "name_es": "Política", "name_ht": "Politik", "article_count": 42 }]
```

---

### `POST /api/admin/topics` 🔒

Create a new topic.

**Body:** `{ "name": "string", "name_es": "string | null", "name_ht": "string | null" }`

**Response `201`:** Created topic object. `409` if name already exists.

---

### `PUT /api/admin/topics/:id` 🔒

Update a topic's name or translations.

**Body:** Any subset of `{ "name": "string", "name_es": "string | null", "name_ht": "string | null" }`.

**Response `200`:** Updated topic object. `409` if name conflicts.

---

### `DELETE /api/admin/topics/:id` 🔒

Delete a topic and remove all article associations (articles are not deleted).

**Response `200`:** `{ "message": "Topic \"Politics\" deleted." }`

---

### `POST /api/admin/topics/merge` 🔒

Merge one topic into another — moves all article associations from source to target (deduplicates), then deletes the source topic. Transactional.

**Body:** `{ "sourceId": 1, "targetId": 2 }`

**Response `200`:** `{ "message": "Topic \"Sport\" merged successfully." }`

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
  "main_scraper_enabled": true,
  "missing_ai_enabled": true,
  "sunday_edition_enabled": true,
  "enable_scheduled_missing_summary": true,
  "enable_scheduled_missing_tags": true,
  "enable_scheduled_missing_image": true,
  "enable_scheduled_missing_translations": true,
  "enable_manual_ai_summary": true,
  "enable_manual_ai_tags": true,
  "enable_manual_ai_image": true,
  "enable_manual_ai_translations": true
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

### `GET /api/settings/blacklist` 🔒

Get the current URL blacklist (URLs excluded from scraping). Backed by the `url_blacklist` PostgreSQL table.

**Response `200`:** Array of URL strings.

---

### `POST /api/settings/blacklist` 🔒

Add a URL to the blacklist. Stored in the `url_blacklist` table.

**Body:** `{ "url": "https://example.com/page-to-exclude" }`

**Response `200`:** `{ "message": "URL added to blacklist.", "count": 28 }`. `409` if already blacklisted.

---

### `DELETE /api/settings/blacklist` 🔒

Remove a URL from the blacklist.

**Body:** `{ "url": "https://example.com/page-to-exclude" }`

**Response `200`:** `{ "message": "URL removed from blacklist.", "count": 27 }`. `404` if not found.

---

### `GET /api/settings/ai-models` 🔒

Get AI model configuration — current selections, defaults, and available options.

**Response `200`:**
```json
{
  "current": {
    "SUMMARY": "llama-3.3-70b-versatile",
    "TRANSLATION": "llama-3.3-70b-versatile",
    "TOPICS": "llama-3.3-70b-versatile",
    "PROMPT_OPTIMIZATION": "llama-3.3-70b-versatile",
    "IMAGE": "fal-ai/flux/dev"
  },
  "defaults": {
    "SUMMARY": "llama-3.3-70b-versatile",
    "TRANSLATION": "llama-3.3-70b-versatile",
    "TOPICS": "llama-3.3-70b-versatile",
    "PROMPT_OPTIMIZATION": "llama-3.3-70b-versatile",
    "IMAGE": "fal-ai/flux/dev"
  },
  "options": {
    "groq": [
      { "id": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B Versatile" },
      { "id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B Instant" }
    ],
    "image": [
      { "id": "fal-ai/flux/dev", "label": "FLUX.1 Dev" },
      { "id": "fal-ai/ideogram/v3", "label": "Ideogram V3" }
    ]
  }
}
```

---

### `PUT /api/settings/ai-models` 🔒

Update AI model selections. All fields optional. Persisted to `application_settings` table and reloaded into the in-memory cache immediately.

**Body:**
```json
{
  "summary": "llama-3.3-70b-versatile",
  "translation": "llama-3.3-70b-versatile",
  "topics": "llama-3.1-8b-instant",
  "prompt": "llama-3.3-70b-versatile",
  "image": "fal-ai/ideogram/v3"
}
```

**Response `200`:** `{ "message": "AI model settings saved." }`

---

### `GET /api/settings/image-settings` 🔒

Get per-model image generation parameters and the field schema for each model.

**Response `200`:**
```json
{
  "settings": {
    "fal-ai/flux/dev": { "image_size": "landscape_4_3", "num_inference_steps": 28, "guidance_scale": 3.5, "output_format": "jpeg" },
    "fal-ai/ideogram/v3": { "aspect_ratio": "16:9", "style": "REALISTIC", "output_format": "jpeg" }
  },
  "schemas": {
    "fal-ai/flux/dev": [
      { "key": "image_size", "label": "Image Size", "type": "select", "options": ["square_hd", "landscape_4_3", "landscape_16_9", ...] },
      { "key": "num_inference_steps", "label": "Inference Steps", "type": "number", "min": 1, "max": 50 }
    ],
    "fal-ai/ideogram/v3": [
      { "key": "aspect_ratio", "label": "Aspect Ratio", "type": "select", "options": ["1:1", "16:9", "4:3", ...] },
      { "key": "style", "label": "Style", "type": "select", "options": ["AUTO", "REALISTIC", "DESIGN", "ANIME"] }
    ]
  }
}
```

---

### `PUT /api/settings/image-settings` 🔒

Save per-model image generation parameters. Persisted to `application_settings` and reloaded immediately.

**Body:**
```json
{
  "modelId": "fal-ai/flux/dev",
  "settings": { "image_size": "landscape_16_9", "num_inference_steps": 28, "output_format": "jpeg" }
}
```

**Response `200`:** `{ "message": "Image settings saved for fal-ai/flux/dev." }`

---

### `GET /api/settings/tts` 🔒

Get TTS (text-to-speech) configuration for Sunday Edition audio narration.

**Response `200`:**
```json
{
  "current": {
    "provider": "unrealspeech",
    "unrealspeech_voice_id": "Scarlett",
    "unrealspeech_bitrate": "192k",
    "unrealspeech_speed": 0,
    "unrealspeech_pitch": 1,
    "fal_gemini_voice": "Aoede",
    "fal_minimax_voice": "English_Graceful_Lady",
    "fal_minimax_speed": 1.0
  },
  "defaults": { "...same keys with default values..." },
  "options": {
    "providers": [
      { "id": "unrealspeech", "label": "Unreal Speech" },
      { "id": "fal-gemini", "label": "fal.ai — Gemini TTS" },
      { "id": "fal-minimax", "label": "fal.ai — MiniMax Speech-02 HD" }
    ],
    "unrealspeech_voices": ["Scarlett", "Dan", "Liv", "Will", "Amy", "Josh"],
    "unrealspeech_bitrates": ["64k", "128k", "192k", "256k", "320k"],
    "fal_gemini_voices": ["Aoede", "Charon", "Fenrir", ...],
    "fal_minimax_voices": ["English_Graceful_Lady", "English_ReporterMale", ...]
  }
}
```

---

### `PUT /api/settings/tts` 🔒

Update TTS settings. All fields optional. Persisted to `application_settings` and reloaded immediately.

**Body:**
```json
{
  "provider": "fal-gemini",
  "fal_gemini_voice": "Aoede"
}
```

**Response `200`:** `{ "message": "TTS settings saved." }`

---

### `GET /api/settings/prompts` 🔒

Get all AI system prompts and their metadata (label + description with template variable hints).

**Response `200`:**
```json
{
  "prompts": {
    "prompt_summary": "You are a news summarizer...",
    "prompt_topics": "You are a news topic classifier...",
    "prompt_translation": "You are a professional translator...",
    "prompt_translation_title": "Translate the following headline...",
    "prompt_image": "You are an AI image prompt engineer...",
    "prompt_image_fallback": "A photorealistic news photograph...",
    "prompt_weekly_summary": "You are a CNN news anchor...",
    "prompt_tts_cleanup": "Clean up the following text for TTS..."
  },
  "meta": {
    "prompt_summary": { "label": "Article Summary", "description": "No template variables." },
    "prompt_topics": { "label": "Topic Classification", "description": "Uses {{topics_list}} — replaced with the current topic list." },
    "prompt_translation": { "label": "Article Translation", "description": "Uses {{language_name}} and {{language_guideline}}." }
  }
}
```

---

### `PUT /api/settings/prompts/:key` 🔒

Update a single AI system prompt. Persisted to `application_settings` and reloaded immediately.

**URL param:** `key` — one of the prompt keys (e.g. `prompt_summary`, `prompt_topics`, `prompt_translation`).

**Body:** `{ "value": "Updated prompt text..." }`

**Response `200`:** `{ "message": "Prompt saved: prompt_summary." }`. `400` if key is invalid.

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
  "articlesPerYear": [{ "year": 2025, "article_count": 800 }],
  "sundayEditionStats": { "total": 10, "withAudio": 8, "withImage": 10, "oldest": "...", "newest": "..." },
  "aiCoverage": { "withSummary": 1100, "withTags": 950, "withImage": 800, "withTranslations": 700, "total": 1234 },
  "topicStats": [{ "name": "Politics", "article_count": 150 }],
  "freshness": { "last24h": 5, "last7d": 35, "last30d": 120, "blockedCount": 3 }
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
