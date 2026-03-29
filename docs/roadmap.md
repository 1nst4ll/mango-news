# Development Roadmap

## Overview

Mango News is a news aggregation platform for Turks and Caicos Islands (~45,000 residents). It scrapes local news sources, generates AI summaries/translations in 3 languages (EN/ES/HT), and produces weekly audio digests. The platform serves English, Spanish (Dominican community), and Haitian Creole speakers.

## Completed Phases

### Phase 1: Quick Wins (Completed)
- Removed hardcoded credentials, rotated DB password, scrubbed git history
- Added is_blocked filter to public articles endpoint
- Added 4 performance indexes + pg_trgm full-text search (applied to production)
- Added React ErrorBoundary wrapping all page components
- Fixed API URL inconsistency (consolidated to PUBLIC_API_URL)
- Fixed nav-items.ts hardcoded Render URLs (now relative paths)
- Fixed RSS feed hardcoded URLs (now uses SITE_URL env var)
- Removed duplicate useTranslations hook from Header.tsx
- Added loading="lazy" to all feed/article images

### Phase 2: Foundation (Completed)
- Split backend index.js (1,858->203 lines) into 8 route modules + middleware
- Database-based cron job locking (cronLock.js)
- Consolidated S3 upload into shared s3Service.js
- Consolidated schema.sql with all migrations
- Split SettingsPage (2,069 lines) into 5 lazy-loaded sub-components (chunk: 522KB->39KB)
- PWA service worker with offline caching
- Emergency/hurricane alert banner (backend + frontend)
- Updated site.webmanifest for PWA
- Backup strategy documentation

### UX/UI Refinements (Completed)
- Language switcher loading indicator
- Mobile share button truncation fix (icon-only on small screens)
- Lightbox scroll prevention
- Footer external link indicators
- Removed dead 2001 date workaround
- Dark/light mode persistence fix (no flash on load)

---

## Phase 3: Growth (Next)

### F1. WhatsApp Channel Integration — Priority: HIGH

**Context:** WhatsApp dominates Caribbean communication. Meeting users where they are instead of requiring website visits.

**Description:** Create a WhatsApp Channel that pushes daily top-5 headlines with links.

**Implementation:**
- Manual approach (easiest): Create a WhatsApp Channel, add a daily cron job that generates a formatted message (top 5 articles by publication_date), admin copies to channel
- Automated approach: Use WhatsApp Business API (costs money) or a headless WhatsApp library

**Technical notes:**
- Add a new cron job in scraper.js or a new `whatsappDigest.js` module
- Query: `SELECT title, id FROM articles WHERE publication_date >= NOW() - INTERVAL '24 hours' ORDER BY publication_date DESC LIMIT 5`
- Format with article title + `${SITE_URL}/en/article/${id}` links
- Store generated digest in application_settings for admin to copy

**Effort:** 1 week

---

### F4. Topic-Based Email Newsletter — Priority: HIGH

**Context:** TCI diaspora and expats who want to stay connected without daily visits. Resend free tier: 3,000 emails/month -- sufficient for TCI scale.

**Description:** Weekly email combining Sunday Edition summary + top articles by topic. Users subscribe with email only (no account needed).

**Implementation:**
- New `subscribers` table: `id, email, created_at, confirmed (boolean), unsubscribe_token`
- New routes: `POST /api/newsletter/subscribe`, `GET /api/newsletter/confirm/:token`, `GET /api/newsletter/unsubscribe/:token`
- Email template: HTML email with Sunday Edition summary + top 5 articles with thumbnails
- Send via Resend API (free tier: 3,000/month)
- Integrate with Sunday Edition generation -- after edition is created, also send newsletter
- Add subscribe form to footer or as a floating component

**Dependencies:** Resend account (free), subscriber table migration

**Effort:** 2 weeks

---

### Article Offline Caching — Priority: MEDIUM

**Context:** TCI internet can be spotty. The service worker (sw.js) already caches the app shell and API responses.

**Description:** Enhance the service worker to proactively cache recent article content for offline reading.

**Implementation:**
- In `sw.js`, add a background sync that fetches the latest 50 article JSONs into `API_CACHE`
- When the app loads, populate the cache with articles from the latest feed fetch
- Add an offline indicator component that shows when the user is offline
- Cache article detail pages (HTML) when visited

**Files:** `frontend/public/sw.js`

**Effort:** 1 week

---

### G2. Bilingual Sunday Edition — Priority: MEDIUM

**Context:** Currently only English summary is generated. Spanish and Haitian Creole communities would benefit from translated editions.

**Description:** Add `summary_es` and `summary_ht` columns to sunday_editions table. After English generation, translate via existing aiService.js pipeline.

**Implementation:**
- Migration: `ALTER TABLE sunday_editions ADD COLUMN summary_es TEXT, ADD COLUMN summary_ht TEXT;`
- In `sundayEditionGenerator.js`, after creating English summary, call `aiService.translateContent()` for ES and HT
- Update `SundayEditionDetail.tsx` to display locale-appropriate summary based on `currentLocale`
- **Pitfall:** Sunday Edition summaries are ~4,000 chars which may exceed the 8,192 token translation limit in aiService.js. Split into sections or increase `AI_TRANSLATION_CONTENT` max tokens.

**Files:** `backend/src/sundayEditionGenerator.js`, `backend/src/services/aiService.js`, `frontend/src/components/SundayEditionDetail.tsx`

**Effort:** 1 week

---

### F7. Article Reaction Buttons — Priority: MEDIUM

**Context:** Lightweight engagement without comment moderation overhead.

**Description:** Emoji reaction buttons (Informative, Important, Concerning, Heartwarming) on articles. No login required -- rate limit by fingerprint/localStorage.

**Implementation:**
- New table: `CREATE TABLE article_reactions (id SERIAL PRIMARY KEY, article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE, reaction_type VARCHAR(20) NOT NULL, fingerprint VARCHAR(64), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`
- New endpoints: `POST /api/articles/:id/reactions` (body: `{ type, fingerprint }`), `GET /api/articles/:id/reactions` (returns counts per type)
- Frontend: Add reaction bar below article content in ArticleDetail.tsx
- Use localStorage to prevent repeat reactions from same browser

**Files:** New migration, new route handler, `frontend/src/components/ArticleDetail.tsx`

**Effort:** 3 days

---

### Topic-Based Personalization — Priority: MEDIUM

**Context:** All users see the same feed. Simple localStorage-based preferences (no backend needed).

**Description:** Let users select preferred topics. Show preferred topics first in the feed.

**Implementation:**
- Add a "Personalize" button/modal on the feed page
- Store selected topic IDs in localStorage as `preferredTopics`
- When fetching articles, if preferredTopics exist, sort preferred-topic articles first
- Show a "For You" section at the top of the feed with preferred topic articles

**Files:** `frontend/src/components/NewsFeed.tsx`, new `TopicPreferences.tsx` component

**Effort:** 1 week

---

### F5. "Island Pulse" Public Dashboard — Priority: LOW

**Context:** A public-facing dashboard showing TCI news trends. Useful for journalists, politicians, businesses.

**Description:** Public page showing: top topics this week, article volume by source, topic word cloud.

**Implementation:**
- New Astro page: `frontend/src/pages/[lang]/pulse.astro`
- Use existing `/api/stats` data (currently auth-required -- create a public version with limited data)
- New endpoint: `GET /api/pulse` (public) returning top topics, article counts, trending topics
- Reuse existing Recharts chart components from `components/charts/`

**Files:** New page, new API endpoint, reuse chart components

**Effort:** 2 weeks

---

### F8. Podcast RSS Feed for Sunday Edition — Priority: LOW

**Context:** Expose Sunday Edition audio as a podcast for Apple Podcasts, Spotify, etc.

**Description:** Dedicated RSS feed at `/api/podcast.xml` following podcast RSS spec (iTunes tags).

**Implementation:**
- New route in `routes/rss.js`: `GET /api/podcast`
- Query `sunday_editions` table for editions with `narration_url IS NOT NULL`
- Generate RSS with `<itunes:*>` tags: title, author, description, image, enclosure (MP3)
- Register with Apple Podcasts and Spotify podcast directories

**Files:** `backend/src/routes/rss.js`

**Effort:** 2 days

---

### F6. Government Gazette Integration — Priority: LOW

**Context:** TCI Government Gazette notices are critical but hard to find. Centralizing them is high-value.

**Description:** Add TCI Government Gazette as a new source using existing scraper infrastructure.

**Implementation:**
- Use source onboarding pipeline (`/api/sources/onboard`) to auto-detect selectors
- May need custom `article_link_template` for gazette notice URLs
- Tag gazette articles with a distinctive "Government Notice" topic

**Effort:** 1 week (depends on gazette website structure)

---

### Basic Test Suite — Priority: LOW

**Context:** Zero test coverage currently. Critical paths should have basic tests.

**Description:** Add tests for backend API endpoints and critical frontend components.

**Implementation:**
- Backend: Use Jest + supertest for API endpoint testing
- Test auth flow (register, login, refresh, me, logout)
- Test article CRUD (create via scraper, read, update, delete, block)
- Test rate limiting behavior
- Frontend: Use Vitest + React Testing Library for component tests
- Test ErrorBoundary render + retry
- Test NewsFeed loading/error/empty states

**Effort:** 2 weeks

---

## Phase 4: Scale (Future)

### H1. Cross-Platform News Widget for Mango Jobs

**Context:** Mango Jobs (at `d:\ClaudeMCP\!projects\mango-jobs`) is a separate Next.js app in the mango.tc ecosystem.

**Description:** When Mango Jobs company pages mention a company also in the news, show a "Recent News" widget.

**Implementation:**
- Extend existing widgets in `widgets/` directory to accept `?company=` parameter
- Filter articles by company name mention in title or content
- Embed via iframe or script tag on Mango Jobs company pages

**Effort:** 2 weeks

---

### H3. Unified mango.tc Search

**Description:** Single search bar on mango.tc returning results across news, jobs, vehicles, real estate.

**Implementation:** Each platform exposes `/api/search?q=` -- thin aggregator on main mango.tc domain merges and ranks results.

**Effort:** 3 weeks

---

### C6. Backend TypeScript Migration

**Description:** Gradual migration of backend JavaScript to TypeScript for type safety.

**Implementation:**
- Add `tsconfig.json` with `allowJs: true, checkJs: true` for gradual adoption
- Convert file-by-file starting with `db.js`, `middleware/auth.js`, `cronLock.js`
- Add type definitions for database query results

**Effort:** 4 weeks (gradual)

---

### H4. Shared Authentication Across Platforms

**Description:** SSO between Mango News, Mango Jobs, and mango.tc.

**Implementation:** Either shared JWT secret across platforms or OAuth2 provider on main mango.tc domain.

**Effort:** 3 weeks

---

### H5. mango.tc Weekly Ecosystem Newsletter

**Description:** Combine Sunday Edition + "Top jobs this week" + "Featured listings" from other platforms into a unified weekly digest.

**Implementation:** Each platform provides `/api/weekly-highlights` endpoint. Newsletter service aggregates.

**Effort:** 2 weeks

---

### Web Push Notifications for Breaking News

**Context:** TCI is hurricane-prone. Breaking news alerts are high value.

**Description:** Web Push API (browser-native, free) for breaking news alerts.

**Implementation:**
- Service worker already exists (`sw.js`) -- add push event listener
- New `push_subscriptions` table
- Admin UI: "Send Push Notification" button with title + body
- Backend: Use `web-push` npm package

**Effort:** 2 weeks

---

### Advanced AI Features

**Description:** Sentiment analysis on articles, automatic story threading (grouping related articles across sources/days).

**Implementation:**
- Add `sentiment` column to articles table (positive/negative/neutral + score)
- Add `story_thread_id` column for grouping related articles
- Run sentiment analysis via Groq after summarization
- Story threading via embedding similarity (would need a vector DB or simple keyword overlap)

**Effort:** 3 weeks

---

### User Accounts with Saved Articles

**Description:** Public user accounts (not just admin) with saved articles, reading history, topic preferences.

**Implementation:**
- New `user_preferences` table, `saved_articles` table
- New auth endpoints for public registration (currently admin-only)
- Frontend: Save button on articles, reading history page, preferences page

**Effort:** 4 weeks

---

### Comment System with Moderation

**Description:** Comments on articles with admin moderation queue.

**Implementation:**
- New `comments` table (article_id, user_id, content, status: pending/approved/rejected, created_at)
- Admin moderation queue in SettingsPage
- Frontend: Comment form + display below article content
- Anti-spam: rate limiting, basic content filtering

**Effort:** 4 weeks

---

### Performance Monitoring

**Description:** Add error tracking and performance monitoring.

**Implementation:**
- Sentry free tier (5K errors/month) or Render built-in metrics
- Frontend: Sentry React SDK for error tracking
- Backend: Sentry Node SDK for API error tracking
- Custom dashboards for article count trends, scraper health, AI service performance

**Effort:** 1 week
