# Sunday Edition

A weekly AI-generated news digest with audio narration, published every Sunday as a special post in the main feed.

## How It Works

Every Sunday at midnight (configurable), the system:

1. Collects all articles published in the past 7 days
2. Generates a CNN anchor-style summary via Groq (up to 2,900 characters)
3. Sends the text to Unreal Speech API for MP3 narration (async)
4. Generates a header image via fal.ai FLUX.2 Turbo
5. Saves the result to the `sunday_editions` table

The audio generation is asynchronous — Unreal Speech calls back to `POST /api/unreal-speech-callback` when the MP3 is ready, which updates the record with the `narration_url`.

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
├── generateSundayEditionSummary()   — Groq Llama 3.3 70B (aiService)
├── generateSundayEditionImage()     — fal.ai FLUX.2 Turbo → S3
├── generateNarration()              — Unreal Speech API (async)
└── INSERT into sunday_editions
```

**Required environment variable:**
```env
UNREAL_SPEECH_API_KEY=your_key   # omit to skip audio narration
```

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

**Audio callback** (called by Unreal Speech):
```http
POST /api/unreal-speech-callback
```

## Frontend Display

Sunday Editions appear in the main news feed alongside regular articles with a distinct **"Sunday Edition"** badge, audio player, and AI-generated image.

**Dedicated page:** `/[lang]/sunday-edition/[id]`
- Large image header
- Audio player (`frontend/src/components/ui/AudioPlayer.tsx`) with play/pause/seek
- Full summary text
- Publication date and sharing buttons

The `sunday_edition` key in each locale file provides the translated badge label.

## Manual Trigger

From the Settings page or via curl:

```bash
curl -X POST "http://localhost:3000/api/sunday-editions/generate" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Related Documentation

- [Backend Setup](backend-setup.md) - Environment variables and AI service config
- [AI Optimization Analysis](ai-optimization-analysis.md) - Weekly summary generation details
- [API Documentation](api-documentation.md) - Full endpoint reference
- [Admin UI](admin-ui.md) - Schedule configuration
