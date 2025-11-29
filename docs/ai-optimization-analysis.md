# AI Tasks Analysis & Optimization Recommendations

## Overview

This document analyzes all AI-related tasks in the Mango News codebase and provides optimization recommendations.

## AI Services Used

| Service | Provider | Purpose | File Location |
|---------|----------|---------|---------------|
| Groq API | Groq | LLM for text generation | `scraper.js`, `sundayEditionGenerator.js` |
| Ideogram API | Ideogram | AI image generation | `sundayEditionGenerator.js` |
| Unreal Speech API | Unreal Speech | Text-to-speech narration | `sundayEditionGenerator.js` |

## AI Tasks Inventory

### 1. Summary Generation
- **Function**: [`generateAISummary()`](../backend/src/scraper.js:183)
- **Model**: `openai/gpt-oss-120b` (large model)
- **Max Tokens**: 300
- **Content Limit**: 10,000 characters
- **Purpose**: Generate SEO-optimized article summaries (max 80 words)

### 2. Topic Assignment
- **Function**: [`assignTopicsWithAI()`](../backend/src/scraper.js:222)
- **Model**: `openai/gpt-oss-20b` (small model)
- **Max Tokens**: 300
- **Content Limit**: 5,000 characters
- **Purpose**: Assign 3 topics from 31 predefined categories

### 3. Translation Generation
- **Function**: [`generateAITranslation()`](../backend/src/sundayEditionGenerator.js:238)
- **Model**: `openai/gpt-oss-20b`
- **Max Tokens**: 100-8192 (varies by type)
- **Purpose**: Translate titles, summaries, content to Spanish/Haitian Creole

### 4. Sunday Edition Summary
- **Function**: [`generateSundayEditionSummary()`](../backend/src/sundayEditionGenerator.js:57)
- **Model**: `openai/gpt-oss-20b`
- **Max Tokens**: 1200
- **Content Limit**: 80,000 characters
- **Purpose**: Generate weekly news summary (4250 characters)

### 5. Image Prompt Optimization
- **Function**: Within [`generateAIImage()`](../backend/src/sundayEditionGenerator.js:295)
- **Model**: `openai/gpt-oss-20b`
- **Max Tokens**: 200
- **Purpose**: Optimize prompts for image generation

### 6. AI Image Generation
- **Function**: [`generateAIImage()`](../backend/src/sundayEditionGenerator.js:295)
- **API**: Ideogram v3
- **Purpose**: Generate news thumbnails when none exists

### 7. Audio Narration
- **Function**: [`generateNarration()`](../backend/src/sundayEditionGenerator.js:182)
- **API**: Unreal Speech
- **Purpose**: Generate audio for Sunday Edition

## Issues Identified

### 1. Code Duplication (HIGH PRIORITY)
**Problem**: `generateAITranslation` logic exists in both `scraper.js` and `sundayEditionGenerator.js`

**Impact**: 
- Maintenance overhead
- Inconsistent updates
- Larger codebase

**Solution**: Extract to shared AI service module

### 2. Model Inconsistency (MEDIUM PRIORITY)
**Problem**: Different models used for similar tasks
- Summary: `openai/gpt-oss-120b` (120B parameters)
- Other tasks: `openai/gpt-oss-20b` (20B parameters)

**Impact**: 
- Potentially unnecessary cost for larger model
- Inconsistent quality

**Solution**: Standardize on appropriate model per task type

### 3. Sequential Processing (HIGH PRIORITY)
**Problem**: Translations processed sequentially

```javascript
// Current approach (SLOW)
title_es = await generateAITranslation(title, 'es', 'title');
summary_es = await generateAITranslation(summary, 'es', 'summary');
title_ht = await generateAITranslation(title, 'ht', 'title');
// ... more sequential calls
```

**Impact**: 6+ sequential API calls for each article

**Solution**: Use `Promise.all()` for parallel execution

### 4. No Caching (HIGH PRIORITY)
**Problem**: Topic translations regenerated repeatedly

**Impact**: 
- Redundant API calls
- Increased latency
- Higher costs

**Solution**: Cache topic translations in memory

### 5. No Rate Limiting (MEDIUM PRIORITY)
**Problem**: No built-in rate limiting for API calls

**Impact**: Risk of hitting API rate limits during batch processing

**Solution**: Implement request queue with rate limiting

### 6. Missing Retry Logic (MEDIUM PRIORITY)
**Problem**: AI calls fail silently without retry

**Impact**: Lost data when transient errors occur

**Solution**: Implement exponential backoff retry

### 7. Inefficient Token Usage (LOW PRIORITY)
**Problem**: Hardcoded token limits not optimized per task

**Solution**: Dynamic token allocation based on input length

## Performance Metrics (Estimated)

| Current State | Optimized State | Improvement |
|---------------|-----------------|-------------|
| 6 sequential translation calls | 6 parallel calls | ~80% faster |
| No topic caching | Cached topics | 100% reduction for repeats |
| No retry logic | 3 retries with backoff | Higher success rate |

## Implementation Plan

### Phase 1: Create Shared AI Service Module
1. Create `backend/src/services/aiService.js`
2. Extract all AI functions
3. Add caching layer
4. Add retry logic

### Phase 2: Optimize Translation
1. Implement parallel translation
2. Cache topic translations
3. Add rate limiting

### Phase 3: Monitoring
1. Add timing metrics
2. Log API usage
3. Track success/failure rates

## Recommended Architecture

```
backend/src/services/
├── aiService.js      # Core AI service with caching & retry
├── groqClient.js     # Groq API wrapper
├── ideogramClient.js # Ideogram API wrapper
└── speechClient.js   # Unreal Speech API wrapper
```

## Configuration Recommendations

```env
# AI Service Configuration
AI_SUMMARY_MODEL=openai/gpt-oss-20b
AI_TRANSLATION_MODEL=openai/gpt-oss-20b
AI_MAX_RETRIES=3
AI_RETRY_DELAY=1000
AI_CACHE_TTL=86400000  # 24 hours
AI_RATE_LIMIT_PER_MINUTE=60
```

## API Endpoints for Monitoring

### Get AI Service Statistics

```http
GET /api/ai-service/stats
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "cache": {
    "size": 42,
    "sampleKeys": ["translation:es:title:...", "translation:ht:summary:..."]
  },
  "rateLimit": {
    "currentCount": 15,
    "limit": 60,
    "resetInMs": 45000
  },
  "config": {
    "models": {
      "SUMMARY": "openai/gpt-oss-20b",
      "TRANSLATION": "openai/gpt-oss-20b",
      "TOPICS": "openai/gpt-oss-20b",
      "PROMPT_OPTIMIZATION": "openai/gpt-oss-20b"
    },
    "maxRetries": 3,
    "cacheTtlMs": 86400000,
    "rateLimitPerMinute": 60
  }
}
```

### Clear AI Service Cache

```http
POST /api/ai-service/clear-cache
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "message": "AI service cache cleared successfully."
}
```

## Implementation Summary

### Changes Made

1. **Created centralized AI service** ([`backend/src/services/aiService.js`](../backend/src/services/aiService.js))
   - Consolidated all AI-related functions
   - Added caching layer for translations
   - Implemented retry logic with exponential backoff
   - Added rate limiting
   - Enabled parallel batch translation

2. **Updated scraper.js**
   - Refactored to use centralized AI service
   - Parallel translation processing (~80% faster)
   - Cached topic translations

3. **Updated sundayEditionGenerator.js**
   - Refactored to use centralized AI service
   - Removed duplicate translation code
   - Simplified image prompt optimization

4. **Added monitoring endpoints**
   - GET `/api/ai-service/stats` - View cache and rate limit status
   - POST `/api/ai-service/clear-cache` - Clear translation cache

## Related Files

- [`backend/src/services/aiService.js`](../backend/src/services/aiService.js) - Centralized AI service (NEW)
- [`backend/src/scraper.js`](../backend/src/scraper.js) - Main scraping with AI integration
- [`backend/src/sundayEditionGenerator.js`](../backend/src/sundayEditionGenerator.js) - Sunday Edition AI features
- [`docs/multilingual-support.md`](multilingual-support.md) - Translation documentation
- [`docs/scraping-methods.md`](scraping-methods.md) - AI feature toggles