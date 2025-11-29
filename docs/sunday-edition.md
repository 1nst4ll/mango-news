# Sunday Edition Feature

The Sunday Edition is a weekly AI-generated news summary with audio narration.

## Overview

Every Sunday, the system automatically:

1. Collects all articles from the past week
2. Generates a CNN anchor-style summary (up to 2900 characters)
3. Creates an audio narration using Unreal Speech API
4. Generates a relevant AI image
5. Publishes as a special post in the news feed

## Database Schema

```sql
CREATE TABLE sunday_editions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    narration_url TEXT,
    image_url TEXT,
    publication_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unreal_speech_task_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Backend Implementation

### Key File

[`backend/src/sundayEditionGenerator.js`](../backend/src/sundayEditionGenerator.js)

### Generation Process

```javascript
createSundayEdition()
├── fetchWeeklyArticles()      // Get week's articles
├── generateSundayEditionSummary()  // LLM summarization
├── generateNarration()        // Unreal Speech API
├── generateSundayEditionImage()    // Ideogram API
└── Save to database
```

### Environment Variables

```env
UNREAL_SPEECH_API_KEY=your_unreal_speech_key
```

## API Endpoints

### Generate Sunday Edition

```http
POST /api/sunday-editions/generate
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "message": "Sunday Edition created successfully.",
  "id": 1
}
```

### List Sunday Editions

```http
GET /api/sunday-editions?page=1&limit=15
```

**Response Headers:**
- `X-Total-Count`: Total editions count

### Get Single Edition

```http
GET /api/sunday-editions/:id
```

**Response:**
```json
{
  "id": 1,
  "title": "Mango News Sunday Edition - November 24, 2024",
  "summary": "This week in TCI news...",
  "narration_url": "https://s3.../sunday-edition-uuid.mp3",
  "image_url": "https://s3.../sunday-edition-image.png",
  "publication_date": "2024-11-24T00:00:00Z"
}
```

### Unreal Speech Callback

```http
POST /api/unreal-speech-callback
```

Handles async audio generation completion from Unreal Speech API.

## Scheduled Generation

Configure in Settings → Scheduled Tasks:

- **Sunday Edition Schedule**: Cron expression (default: `0 0 * * 0` - Sunday midnight)

The job includes locking to prevent overlapping executions.

## Frontend Display

### News Feed Integration

Sunday Editions appear in the main feed alongside regular articles:
- Distinct card design with "Sunday Edition" badge
- Audio player for narration
- AI-generated image
- Social sharing buttons

### Dedicated Page

`/[lang]/sunday-edition/[id]` displays full edition:
- Large image header
- Audio player with playback controls
- Full summary text
- Publication date

### Audio Player Component

[`frontend/src/components/ui/AudioPlayer.tsx`](../frontend/src/components/ui/AudioPlayer.tsx)

## Translations

The `sunday_edition` key in locale files provides translations for the badge label.

## Manual Triggering

From Settings page or via API:

```bash
curl -X POST "http://localhost:3000/api/sunday-editions/generate" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Related Documentation

- [Backend Setup](backend-setup.md) - Environment configuration
- [API Documentation](api-documentation.md) - Full endpoint reference
- [Admin UI](admin-ui.md) - Schedule configuration
