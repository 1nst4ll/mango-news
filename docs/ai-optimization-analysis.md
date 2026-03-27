# AI Tasks Analysis & Optimization

## Overview

This document describes the AI services used in Mango News, the optimizations applied, and the current architecture.

## AI Services Used

| Service | Provider | Purpose | File |
| ------- | -------- | ------- | ---- |
| Groq API (Llama) | Groq | Summaries, topics, translations, weekly summary | `services/aiService.js` |
| fal.ai (FLUX.2 Turbo) | fal.ai | AI image generation for thumbnails | `sundayEditionGenerator.js` |
| Unreal Speech API | Unreal Speech | Text-to-speech narration for Sunday Edition | `sundayEditionGenerator.js` |

## AI Tasks

### 1. Summary Generation

- **Function:** `aiService.generateSummary()`
- **Purpose:** SEO-optimized article summary, max 80–100 words
- **Input limit:** 10,000 characters

### 2. Topic Assignment

- **Function:** `aiService.assignTopics()`
- **Purpose:** Assign 3 topics from 31 predefined categories
- **Input limit:** 5,000 characters

### 3. Translation

- **Function:** `aiService.translateText()` / `aiService.translateBatch()`
- **Purpose:** Translate title, summary, and body to Spanish and Haitian Creole
- **Processing:** All 6 translations run in parallel via `translateBatch()`

### 4. Sunday Edition Summary

- **Function:** `aiService.generateWeeklySummary()`
- **Purpose:** Weekly broadcast-ready news digest (4,000–4,200 chars)
- **Input limit:** 80,000 characters

### 5. Image Prompt Optimization

- **Function:** `aiService.optimizeImagePrompt()`
- **Purpose:** Generate a structured visual prompt for fal.ai from article content

### 6. AI Image Generation

- **Function:** `generateAIImage()` in `sundayEditionGenerator.js`
- **API:** fal.ai FLUX.2 Turbo
- **Trigger:** Only when no thumbnail URL exists for an article

### 7. Audio Narration

- **Function:** `generateNarration()` in `sundayEditionGenerator.js`
- **API:** Unreal Speech
- **Purpose:** MP3 audio for Sunday Edition

## Architecture

All Groq-based AI functions are consolidated in a single centralized service:

```text
backend/src/services/
└── aiService.js   # Groq client, caching, retry, rate limiting, batch translation
```

`scraper.js` and `sundayEditionGenerator.js` call `aiService` — no direct Groq calls outside of it.

## Optimizations Implemented

### 1. Centralized AI Service (resolved)

All AI functions extracted from `scraper.js` and `sundayEditionGenerator.js` into `aiService.js`. Eliminates duplication and ensures consistent retry/caching behaviour across all callers.

### 2. Parallel Translation (resolved)

All 6 translations (title/summary/content × ES/HT) are dispatched in a single `translateBatch()` call using `Promise.all()` internally. Previously sequential — ~80% latency reduction for the translation step.

### 3. Topic Translation Caching (resolved)

Topic translations are pre-computed and cached in memory. Repeated scrapes of articles with the same topics skip AI calls entirely.

### 4. Retry Logic with Exponential Backoff (resolved)

All AI calls retry up to 3 times with exponential backoff on transient failures.

### 5. Rate Limiting (resolved)

`aiService` enforces a per-minute request cap to avoid hitting Groq API limits during batch processing.

### 6. Batch Topic DB Lookup (resolved)

Topic existence checks use `SELECT ... WHERE name = ANY($1)` — one query per article instead of one query per topic. Previously N sequential round-trips per article.

### 7. Batch `article_topics` Insert (resolved)

All topic associations for an article are written in a single `INSERT ... VALUES (...),(...)` statement with `ON CONFLICT DO NOTHING`. Previously one `INSERT` per topic per article.

### 8. Single JSDOM Instance in Sanitizer (resolved)

`sanitizeHtml()` previously created two JSDOM instances (one for DOMPurify, one for content parsing). Now uses a single instance for both, halving DOM allocation overhead per article.

### 9. Dead Code Removal (resolved)

`scrapeSource()` — a legacy function that was defined but never called — has been removed.

### 10. Set-Based Container Tag Lookup (resolved)

Container tag detection in the HTML serializer (`div`, `section`, `article`, etc.) uses a `Set` for O(1) lookup instead of an array `.includes()` call on every DOM node.

## HTML Sanitization Pipeline

See [Scraping Methods — HTML Sanitization Pipeline](scraping-methods.md#html-sanitization-pipeline) for the full breakdown of how raw scraped HTML is cleaned and structured.

## Monitoring Endpoints

### GET `/api/ai-service/stats` _(authenticated)_

Returns current cache size, rate limit state, and model configuration.

```json
{
  "cache": { "size": 42 },
  "rateLimit": { "currentCount": 15, "limit": 60, "resetInMs": 45000 },
  "config": {
    "models": { "SUMMARY": "...", "TRANSLATION": "...", "TOPICS": "..." },
    "maxRetries": 3,
    "cacheTtlMs": 86400000,
    "rateLimitPerMinute": 60
  }
}
```

### POST `/api/ai-service/clear-cache` _(authenticated)_

Clears the in-memory translation cache.

```json
{ "message": "AI service cache cleared successfully." }
```

## Environment Variables

```env
# Required
GROQ_API_KEY=your_groq_key
FAL_KEY=your_fal_ai_key

# Optional tuning (with defaults)
AI_CACHE_MAX_SIZE=1000
AI_MAX_RETRIES=3
AI_RETRY_DELAY=1000
AI_CACHE_TTL=86400000
AI_RATE_LIMIT_PER_MINUTE=60
```

## Related Files

- [`backend/src/services/aiService.js`](../backend/src/services/aiService.js) - Centralized AI service
- [`backend/src/scraper.js`](../backend/src/scraper.js) - Scraping with AI integration
- [`backend/src/sundayEditionGenerator.js`](../backend/src/sundayEditionGenerator.js) - Sunday Edition
- [`docs/multilingual-support.md`](multilingual-support.md) - Translation documentation
- [`docs/scraping-methods.md`](scraping-methods.md) - Scraper configuration and HTML pipeline

## Version History

| Date | Change |
| ---- | ------ |
| 2026-03-26 | Batch topic DB lookup, batch article_topics insert, single JSDOM instance, dead code removal, Set-based container lookup |
| 2025-11-30 | Centralized AI service, parallel translation, topic caching, retry logic, rate limiting |
