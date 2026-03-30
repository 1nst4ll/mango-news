# Sunday Edition

A weekly AI-generated news digest with audio narration, published every Sunday as a special post in the main feed.

## How It Works

Every Sunday at midnight (configurable), the system:

1. Collects all articles published in the past 7 days
2. Generates a CNN anchor-style summary via Groq (configurable model, configurable prompt)
3. Generates audio narration via the active TTS provider (configured in Settings → AI Models → TTS Settings)
4. Generates a header image via the configured fal.ai image model
5. Saves the result to the `sunday_editions` table

Audio generation behaviour depends on the provider:
- **Unreal Speech** — async. Unreal Speech calls back to `POST /api/unreal-speech-callback` when the MP3 is ready, which then sets `narration_url`.
- **fal.ai Gemini TTS / MiniMax** — sync. Audio is uploaded to S3 immediately and `narration_url` is set before the record is saved.

## Database Schema

```sql
CREATE TABLE sunday_editions (
    id                    SERIAL PRIMARY KEY,
    title                 VARCHAR(255) NOT NULL,
    summary               TEXT,
    narration_url         TEXT,            -- S3 URL to MP3 (set via callback)
    image_url             TEXT,            -- S3 URL to header image
    publication_date      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    unreal_speech_task_id VARCHAR(255),    -- used to match async callback
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## Backend Implementation

**File:** `backend/src/sundayEditionGenerator.js`

```
createSundayEdition()
├── fetchWeeklyArticles()            — query past 7 days of articles
├── generateSundayEditionSummary()   — Groq (model from AI Models settings)
├── generateSundayEditionImage()     — fal.ai (model from AI Models settings) → S3
├── generateNarration()              — dispatches to active TTS provider
│   ├── _generateNarrationUnrealSpeech()  — async, returns { type: 'task', id }
│   ├── _generateNarrationFalGemini()     — sync, returns { type: 'url', url }
│   └── _generateNarrationFalMinimax()    — sync, returns { type: 'url', url }
└── INSERT into sunday_editions
```

**Required environment variables:**
```env
UNREAL_SPEECH_API_KEY=your_key   # required if using Unreal Speech provider
FAL_KEY=your_key                 # required if using fal.ai TTS providers
```

## TTS Providers

TTS provider and settings are configured in Settings → AI Models → TTS Settings. The active provider is stored in `application_settings` and loaded into memory at startup.

### Unreal Speech (async)

- Calls the Unreal Speech REST API with the cleaned narration text
- Returns a `task_id` — the record is saved with `narration_url = NULL` and `unreal_speech_task_id` set
- Unreal Speech POSTs to `POST /api/unreal-speech-callback` when the MP3 is ready, which sets `narration_url`
- Configurable: **voice** (Scarlett, Dan, Liv, Will, Amy, Josh), **bitrate** (64k–320k), **speed** (−1 to 1), **pitch** (0.5–1.5)

### fal.ai — Gemini TTS (sync)

- Calls `fal-ai/gemini-tts` via `@fal-ai/client`
- Audio binary is downloaded and uploaded to S3; `narration_url` is set immediately
- Configurable: **voice** (30 options including Aoede, Charon, Fenrir, Kore, and others)

### fal.ai — MiniMax Speech-02 HD (sync)

- Calls `fal-ai/minimax/speech-02-hd` via `@fal-ai/client`
- Audio binary is downloaded and uploaded to S3; `narration_url` is set immediately
- Configurable: **voice** (17 options including English_Graceful_Lady, English_ReporterMale), **speed** (0.5–2.0)

## Schedule

Configured in Settings → Scheduled Tasks → **Sunday Edition Schedule**.

Default: `0 0 * * 0` (Sunday at midnight). Includes a lock to prevent overlapping runs.

## API Endpoints

**Generate manually** (authenticated):
```http
POST /api/sunday-editions/generate
Authorization: Bearer YOUR_TOKEN
```
Response: `{ "message": "Sunday Edition created successfully.", "id": 1 }`

**List editions** (paginated, public):
```http
GET /api/sunday-editions?page=1&limit=15
```
Returns array with `X-Total-Count` header.

**Get single edition** (public):
```http
GET /api/sunday-editions/:id
```
```json
{
  "id": 1,
  "title": "Mango News Sunday Edition - March 24, 2026",
  "summary": "This week in TCI...",
  "narration_url": "https://s3.../sunday-edition-uuid.mp3",
  "image_url": "https://s3.../sunday-edition-image.png",
  "publication_date": "2026-03-24T00:00:00Z"
}
```

**Regenerate audio** (authenticated):
```http
POST /api/sunday-editions/:id/regenerate-audio
Authorization: Bearer YOUR_TOKEN
```
Response shape depends on the active TTS provider. Unreal Speech returns `{ "task_id": "..." }`; fal.ai providers return `{ "narration_url": "https://..." }`.

**Audio callback** (called by Unreal Speech — not for client use):
```http
POST /api/unreal-speech-callback
```

## Frontend Display

### Feed Page

Sunday Editions appear in the main news feed alongside regular articles with a distinct **"Sunday Edition"** badge, audio player, and AI-generated image. The badge is a clickable `<a>` link to the Sunday Edition listing page (`/${locale}/sunday-edition`); `e.stopPropagation()` prevents it from also triggering the card's detail-page navigation.

The **Sources filter** on the feed page includes a "Sunday Edition" entry (special ID `0`). This controls visibility:

| Filter state | What is shown |
|---|---|
| Nothing selected | All articles + all Sunday Editions |
| Only "Sunday Edition" checked | Sunday Editions only |
| "Sunday Edition" + other sources | Articles from those sources + Sunday Editions |
| Other sources only (no Sunday Edition) | Articles from those sources only |

The special ID `0` is stripped from `source_ids` before sending to the backend API so it never reaches the database query.

### Listing Page

**`/[lang]/sunday-edition`** — `frontend/src/pages/[lang]/sunday-edition/index.astro`

Displays all Sunday Editions in a card grid. Fetches editions and sources server-side in the Astro frontmatter (parallel `Promise.all`). Rendered by `SundayEditionList.tsx`.

### Detail Page

**`/[lang]/sunday-edition/[id]`** — `frontend/src/components/SundayEditionDetail.tsx`

- Breadcrumb trail: **News Feed › Sunday Edition › [Title]**
- Back to News Feed button (`ChevronLeft` icon, links to `/${currentLocale}/`)
- Large image header
- Audio player (`frontend/src/components/ui/AudioPlayer.tsx`) with play/pause/seek
- Full summary text
- Publication date and sharing buttons (WhatsApp, Facebook)
- Footer News Sources section populated (sources fetched server-side in `[id].astro`)

The `sunday_edition` key in each locale file provides the translated badge label and navigation text.

### Navbar

"Sunday Edition" is linked in the main navigation bar (`frontend/src/lib/nav-items.ts`), pointing to `/sunday-edition`.

## Admin Management

The Settings page has a dedicated **Sunday Editions** tab (5th tab) with:

- **Stats cards** — total editions, with audio, with image, date range
- **Generate** — manual trigger button
- **Edition list** — title, publication date, audio status, image preview
- **Per-edition actions:**
  - Edit title and summary
  - Regenerate image (`POST /api/sunday-editions/:id/regenerate-image`)
  - Regenerate audio (`POST /api/sunday-editions/:id/regenerate-audio`)
  - Delete single edition
- **Purge all** — delete all editions

## Manual Trigger

From the Settings page or via curl:

```bash
curl -b cookies.txt -X POST "http://localhost:3000/api/sunday-editions/generate"
```

## Future: Bilingual Editions

Planned enhancement: add `summary_es` and `summary_ht` columns to the `sunday_editions` table and translate via the existing `aiService.js` pipeline. See [Roadmap](roadmap.md#g2-bilingual-sunday-edition) for details.

## Related Documentation

- [Backend Setup](backend-setup.md) - Environment variables and AI service config
- [AI Optimization Analysis](ai-optimization-analysis.md) - Weekly summary generation details
- [API Documentation](api-documentation.md) - Full endpoint reference
- [Admin UI](admin-ui.md) - Schedule configuration
