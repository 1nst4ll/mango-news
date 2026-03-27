# AI Optimization Analysis

Documents the AI services used, the optimizations implemented, and how to monitor and tune the AI layer.

## AI Services

| Service | Provider | Used for |
|---|---|---|
| Groq API (Llama) | Groq | Summaries, topic classification, translations, weekly digest |
| fal.ai FLUX.2 Turbo | fal.ai | Article thumbnail and Sunday Edition image generation |
| Unreal Speech | Unreal Speech | Sunday Edition MP3 narration (async) |

All Groq-based operations are centralized in `backend/src/services/aiService.js`. `scraper.js` and `sundayEditionGenerator.js` call this service — no direct Groq calls outside it.

## AI Tasks

### Per-article (triggered during scraping)

| Task | Function | Model | Input limit |
|---|---|---|---|
| Summary | `generateSummary(content)` | Llama 3.3 70B | 10,000 chars |
| Topic classification | `assignTopics(content)` | Llama 3.1 8B | 5,000 chars |
| Translation (×6) | `translateBatch(items, lang)` | Llama 3.3 70B | — |
| Image prompt | `optimizeImagePrompt(content, title)` | Llama 3.3 70B | — |
| Image generation | `generateAIImage()` | fal.ai FLUX.2 Turbo | — |

### Sunday Edition (weekly)

| Task | Function | Details |
|---|---|---|
| Weekly digest | `generateWeeklySummary(articles)` | 4,000–4,200 chars, 80K char input limit |
| Audio narration | `generateNarration()` | Unreal Speech, async MP3 via S3 |
| Header image | `generateSundayEditionImage()` | fal.ai FLUX.2 Turbo |

## Optimizations

### 1. Centralized AI service

All AI functions extracted from `scraper.js` and `sundayEditionGenerator.js` into `aiService.js`. Eliminates duplication and ensures consistent retry/caching behaviour across all callers.

### 2. Parallel translation

All 6 translations (title/summary/content × ES/HT) dispatched in a single `translateBatch()` call using `Promise.all()`. Previously sequential — approximately 80% latency reduction for the translation step.

### 3. Topic translation caching

Topic name translations (31 predefined topics) are computed once and cached in memory. Repeated scrapes of articles with the same topics skip AI calls entirely.

### 4. Retry with exponential backoff

All AI calls retry up to `AI_MAX_RETRIES` times (default 3) on transient failures, with delay doubling each attempt starting at `AI_RETRY_DELAY` ms (default 1000).

### 5. Rate limiting

`aiService` tracks requests per minute and enforces a cap (`AI_RATE_LIMIT_PER_MINUTE`, default 60) to prevent Groq API throttling during batch processing.

### 6. Batch topic DB lookup

Topic existence checks use `SELECT ... WHERE name = ANY($1)` — one query per article instead of one query per topic name.

### 7. Batch article_topics insert

All topic associations for an article are written in a single `INSERT ... VALUES (...),(...)` with `ON CONFLICT DO NOTHING`.

### 8. Single JSDOM instance in sanitizer

`sanitizeHtml()` previously created two JSDOM instances (one for DOMPurify, one for parsing). Now uses one instance for both, halving DOM allocation overhead per article.

### 9. Set-based container tag lookup

Container tag detection in the HTML serializer uses a `Set` for O(1) lookup instead of `Array.includes()` on every DOM node.

## Monitoring

### `GET /api/ai-service/stats` _(authenticated)_

Returns current cache size, rate limit state, and active model configuration:

```json
{
  "cache": { "size": 42, "sampleKeys": ["topic:Politics:es", "..."] },
  "rateLimit": { "currentCount": 15, "limit": 60, "resetInMs": 45000 },
  "config": {
    "models": {
      "SUMMARY": "llama-3.3-70b-versatile",
      "TRANSLATION": "llama-3.3-70b-versatile",
      "TOPICS": "llama-3.1-8b-instant",
      "PROMPT_OPTIMIZATION": "llama-3.3-70b-versatile"
    },
    "maxRetries": 3,
    "cacheTtlMs": 86400000,
    "rateLimitPerMinute": 60
  }
}
```

### `POST /api/ai-service/clear-cache` _(authenticated)_

Clears the in-memory translation cache. Use when topic translations need to be regenerated.

## Tuning via Environment Variables

All optional — defaults shown:

```env
AI_SUMMARY_MODEL=llama-3.3-70b-versatile
AI_TRANSLATION_MODEL=llama-3.3-70b-versatile
AI_TOPICS_MODEL=llama-3.1-8b-instant
AI_PROMPT_MODEL=llama-3.3-70b-versatile

AI_MAX_RETRIES=3
AI_RETRY_DELAY=1000          # ms, doubles each retry

AI_CACHE_TTL=86400000        # 24 hours
AI_CACHE_MAX_SIZE=1000       # LRU eviction above this

AI_RATE_LIMIT_PER_MINUTE=60
```

## Version History

| Date | Change |
|---|---|
| 2026-03-26 | Batch topic DB lookup, batch article_topics insert, single JSDOM instance, dead code removal, Set-based container lookup |
| 2025-11-30 | Centralized AI service, parallel translation, topic caching, retry logic, rate limiting |

## Related Documentation

- [Backend Setup](backend-setup.md) - Environment variables and AI service methods
- [Scraping Methods](scraping-methods.md) - HTML sanitization pipeline and AI toggle logic
- [Sunday Edition](sunday-edition.md) - Weekly summary and audio generation
- [Multilingual Support](multilingual-support.md) - Translation architecture
