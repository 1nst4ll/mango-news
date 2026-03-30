# Admin UI — Settings and Source Management

**Access:** `/settings` (requires login)

The Settings page is the control center for sources, scraping, AI, scheduling, Sunday Editions, and topics. It contains 7 tabs, each lazy-loaded as a separate sub-component under `components/settings/` (shared types in `settings/types.ts`).

## Overview & Stats Tab

Dashboard with KPI cards, charts, and AI coverage gauges.

### KPI Cards

| Card | Description |
|------|-------------|
| Total Articles | Aggregate article count |
| Total Sources | With active/inactive breakdown |
| Avg. per Source | Calculated average articles per source |
| Years Covered | Date range of indexed content |

### Charts

- **Articles Over Time** — gradient area chart showing yearly publication trend with year-over-year percentage change
- **Source Distribution** — donut pie chart with center total; top 4 sources shown individually, remainder grouped as "Other"
- **Articles by Source** — horizontal bar chart with inline labels, dynamically sized to fit all sources

### AI Coverage

Four radial gauge charts (one per AI feature) showing actual article coverage based on real per-article data (not source configuration):

- Summaries, Tags, Images, Translations

### Article Freshness

Four KPI cards showing article intake velocity and moderation status:

- **Last 24h** / **Last 7d** / **Last 30d** — articles added in each period
- **Blocked** — count of articles with `is_blocked = TRUE`

### Topic Distribution

Horizontal bar chart showing the top 15 topics by article count (side-by-side with source distribution).

## Scraper Controls Tab

AI toggles that apply to **manual** scraper runs (persisted to database via `application_settings`, not browser localStorage):

- Generate AI Summaries
- Generate AI Tags
- Generate AI Images
- Generate AI Translations

**Actions:**
- **Trigger Full Scraper Run** — scrapes all active sources immediately

### Emergency Banner

Admin-controlled banner management (inline in this tab):
- **Enable/Disable toggle** — controls visibility on all public pages
- **Message input** — the text displayed in the banner
- Uses `GET/PUT /api/settings/emergency` endpoints

### URL Blacklist

Manage URLs excluded from scraping. Entries are stored in the `url_blacklist` PostgreSQL table (previously a local `config/blacklist.json` file):
- **Add URL** — input + add button, with Enter key support
- **Remove URL** — hover to reveal delete button per entry
- **Count display** — shows total blacklisted URLs
- Uses `GET/POST/DELETE /api/settings/blacklist` endpoints

### Danger Zone

- **Purge All Articles** — deletes all articles (confirmation required)

## Scheduled Tasks Tab

Configure the three background cron jobs:

| Job | Default schedule | Controls |
|-----|-----------------|---------|
| Main Scraper | `0 * * * *` (hourly) | Cron expression |
| Missing AI Processor | `*/20 * * * *` | Cron expression + per-feature toggles |
| Sunday Edition | `0 0 * * 0` (Sunday midnight) | Cron expression |

The Missing AI Processor has individual toggles for summaries, tags, images, and translations. Click **Save Schedule Settings** to persist — changes take effect immediately without restart.

See [API Documentation](api-documentation.md) for the scheduler endpoints (`GET/POST /api/settings/scheduler`).

## Source Management Tab

### Cross-Source Article Search

Search bar at the top of the tab that searches articles across all sources by title or URL. Results show:
- Article title (clickable → opens on public site)
- Article ID, source name (clickable → source article page), publication date
- Blocked status badge
- External link to original source URL

Uses `GET /api/articles/admin/search?q=...` endpoint.

### Source List

Each source card shows: ID, name, URL, article count, active status, AI settings, and scraping method.

### Source Actions

| Action | Description |
|--------|-------------|
| **Scrape Now** | Trigger immediate scrape for this source |
| **Delete Articles** | Remove all articles from this source |
| **Edit** | Open configuration dialog |
| **Delete Source** | Remove source entirely |
| **View Articles** | Navigate to article management (`/settings/source/[id]`) |

### Add / Edit Source Dialog

**Basic:**
- Name, URL, Active status
- Scraping method: `opensource` (Puppeteer) or `firecrawl`

**AI Settings (per-source):**
- Enable AI Summary, Tags, Image, Translations

**Open Source Selectors** (CSS selectors for Puppeteer scraping):
- Title, Content, Date, Author, Thumbnail, Topics
- Include / Exclude selectors for content filtering

**Advanced:**
- `article_link_template` — URL regex pattern for article discovery
- `exclude_patterns` — query parameters to strip (e.g. `utm_source,fbclid`)
- `scrape_after_date` — ignore articles published before this date

See [CSS Selectors](css-selectors.md) for selector syntax and examples, and [Scraping Methods](scraping-methods.md) for how each method works.

## Sunday Editions Tab

Manages the weekly Sunday Edition digests.

### Stats Cards

| Card | Description |
|------|-------------|
| Total Editions | Aggregate count of all Sunday Editions |
| With Audio | Editions that have generated audio |
| With Image | Editions that have generated images |
| Date Range | Publication date range of all editions |

### Actions

- **Generate New Sunday Edition** — creates a new edition from recent articles (only available in this tab)

### Search & Filter

Search bar filters editions by title, summary text, or date.

### Edition List

Each edition row shows: title, publication date, draft/published status badge, audio status, image status, and image preview (click for lightbox).

### Draft/Publish Workflow

Each edition has a clickable **Draft** / **Published** status badge. Clicking toggles between states:
- **Published** — visible on the public site
- **Draft** — hidden from public listing (admin can still preview via direct link)

Requires running the `add_status_to_sunday_editions.sql` migration to add the `status` column.

### Per-Edition Actions

| Action | Description |
|--------|-------------|
| **Edit** | Edit title and summary inline |
| **Regenerate Image** | Re-generate the edition thumbnail |
| **Regenerate Audio** | Re-generate the audio narration |
| **Draft/Publish** | Toggle visibility on public site |
| **Delete** | Remove this edition |

### Bulk Actions

- **Purge All Sunday Editions** — deletes all editions (confirmation required)

## AI Models Tab

Configure all AI model selections, per-model image parameters, system prompts, and TTS settings. The tab contains four stacked sections.

### Text Generation Models (Groq)

Four dropdowns selecting which Groq model is used for each task:

| Dropdown | Task |
|----------|------|
| Summary Model | Article summarisation |
| Translation Model | Article translation (EN→ES, EN→HT) |
| Topics / Tagging Model | AI topic classification |
| Image Prompt Optimisation Model | Prompt refinement before image generation |

Each dropdown shows the current selection and the system default below it. Available models include Llama 3.3 70B Versatile, Llama 3.1 8B Instant, Llama 3.1 70B, Llama Guard 3 8B, Gemma 2 9B, and others.

### Image Generation Model (fal.ai)

Single dropdown selecting which fal.ai model generates article and Sunday Edition images. Available models:

| Model | Provider |
|-------|----------|
| FLUX.1 Dev / Pro / Schnell / FLUX.2 Turbo | Black Forest Labs |
| FLUX Pro Ultra | Black Forest Labs |
| Imagen4 / Nano Banana 2 | Google |
| GPT Image 1.5 | OpenAI via fal.ai |
| Ideogram V3 | Ideogram |
| Recraft V3 / V4 Pro | Recraft |

Click **Save Model Settings** to persist both the Groq and image model selections at once.

### Per-Model Image Settings

Accordion with one panel per fal.ai image model. Each panel renders fields from the model's schema — only settings supported by that model are shown. Field types include dropdowns (enums), number inputs (with min/max), and toggles (booleans).

**Common settings by model type:**

| Model family | Key parameters |
|---|---|
| FLUX.1 Dev / Pro | `image_size`, `num_inference_steps`, `guidance_scale`, `output_format` |
| FLUX Pro Ultra | `aspect_ratio`, `output_format`, `raw` (boolean) |
| FLUX.2 Turbo | `image_size`, `num_inference_steps`, `output_format` |
| Imagen4 / Nano Banana 2 | `aspect_ratio`, `output_format`, `safety_filter_level` |
| GPT Image 1.5 | `size` (`1024×1024` / `1024×1536` / `1536×1024`), `quality`, `output_format` |
| Ideogram V3 | `aspect_ratio`, `style`, `output_format`, `color_palette` |
| Recraft V3 / V4 Pro | `image_size`, `style`, `output_format` |

Each accordion panel has **Save** and **Reset to Default** buttons that operate independently per model. Uses `GET/PUT /api/settings/image-settings`.

### AI Prompts

Accordion with one panel per AI system prompt. Prompts are stored in the `application_settings` table and editable without a restart.

| Prompt key | Used by |
|---|---|
| `prompt_summary` | Article summarisation |
| `prompt_topics` | Topic classification — uses `{{topics_list}}` |
| `prompt_translation` | Body translation — uses `{{language_name}}`, `{{language_guideline}}` |
| `prompt_translation_title` | Title/summary translation — same variables |
| `prompt_image` | Image prompt generation |
| `prompt_image_fallback` | Fallback prompt when Groq returns empty |
| `prompt_weekly_summary` | Sunday Edition weekly digest |
| `prompt_tts_cleanup` | Text cleanup before TTS narration |

Each panel has a monospace resizable textarea with a character counter, an **Unsaved** badge when edited, and **Save** / **Revert** buttons per prompt. Uses `GET /api/settings/prompts` and `PUT /api/settings/prompts/:key`.

### TTS Settings

Configure the text-to-speech provider and voice used for Sunday Edition audio narration.

**Provider selector:** Choose between three providers:

| Provider | Type | Notes |
|---|---|---|
| Unreal Speech | Async | MP3 delivered via webhook callback; supports bitrate, speed (−1 to 1), pitch (0.5–1.5) |
| fal.ai — Gemini TTS | Sync | Audio uploaded to S3 immediately; 30 available voices |
| fal.ai — MiniMax Speech-02 HD | Sync | Audio uploaded to S3 immediately; 17 voices, adjustable speed |

Each provider shows only its relevant controls. Uses `GET/PUT /api/settings/tts`.

## Topics Tab

Manage the topic taxonomy used for AI-powered article classification.

### Topic Table

Searchable table showing all topics with columns: Name (EN), Spanish translation, Haitian Creole translation, article count. Missing translations shown with a warning indicator.

### Topic Actions

| Action | Description |
|--------|-------------|
| **Add Topic** | Create with name + translations (EN/ES/HT) |
| **Edit** | Update name and/or translations |
| **Merge** | Move all articles from one topic to another, then delete the source topic |
| **Delete** | Remove topic and unlink from all articles (articles not deleted) |

Uses `GET/POST/PUT/DELETE /api/admin/topics` and `POST /api/admin/topics/merge` endpoints.

---

## Emergency Banner

Admin-controlled banner that appears above the Header on all public pages. Management UI is in the **Scraper Controls** tab.

### API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/settings/emergency` | Public | Returns current banner state |
| `PUT /api/settings/emergency` | Admin | Update `enabled` (boolean) and `text` (string) |

### Behavior

- When `enabled` is `true`, a red banner displays the configured `text` above the site Header on every public page
- Users can dismiss the banner; dismiss state persists for the current session via `sessionStorage`
- Admins toggle the banner on/off and edit the text from the Settings page

---

## Component Architecture

`SettingsPage.tsx` is an orchestrator that lazy-loads 7 tab sub-components via `React.lazy()`:

| Sub-component | Path | Tab |
|---------------|------|-----|
| `OverviewStats.tsx` | `components/settings/` | Overview & Stats |
| `ScraperControls.tsx` | `components/settings/` | Scraper Controls |
| `ScheduledTasks.tsx` | `components/settings/` | Scheduled Tasks |
| `SourceManagement.tsx` | `components/settings/` | Source Management |
| `SundayEditionsAdmin.tsx` | `components/settings/` | Sunday Editions |
| `TopicManagement.tsx` | `components/settings/` | Topics |
| `AIModels.tsx` | `components/settings/` | AI Models |

The `AIModels` tab itself composes three further sub-components:

| Sub-component | Role |
|---------------|------|
| `ImageModelSettings.tsx` | Per-model image parameter editor |
| `PromptsSettings.tsx` | System prompt editor (accordion) |
| `TTSSettings.tsx` | TTS provider and voice configuration |

Shared TypeScript interfaces live in `components/settings/types.ts`. Each tab is wrapped in `React.Suspense` with a `Skeleton` fallback.

---

## Source Articles Page

**Access:** `/settings/source/[sourceId]`

Manages individual articles for a specific source.

### Navigation

- **← / →** arrows in the header step between sources by ID
- **Back to Settings** returns to the source list

### Article Table

**Server-side search** — search by title, URL, or article ID across all articles in the source (searches all pages, not just the current one).

Rows per page: 10, 20, 50, 100 — persisted to `localStorage`. Column visibility also persisted. Blocked articles show a "Blocked" badge next to their title.

| Column | Notes |
|--------|-------|
| ID | Database ID |
| Title | Clickable — opens article on site in new tab |
| URL | Original source URL |
| Thumbnail | Clickable — opens full-size lightbox |
| Publication Date | — |
| AI Summary | Generated summary text |
| AI Tags | Assigned topic names |
| AI Image | Clickable — opens full-size lightbox |

### Article Actions (row dropdown)

- **Copy ID** — copy to clipboard
- **Rerun Summary / Tags / Image / Translations** — regenerate individual AI features
- **Rescrape** — re-fetch content from source URL
- **Edit Article** — open edit dialog (see below)
- **Block / Unblock** — toggle `is_blocked` status (blocked articles hidden from public feed)
- **Delete** — remove article

### Bulk Actions

- **Rescrape All Articles** — re-scrapes every article in the source, streaming progress via SSE
- **Process Missing AI Data** — generates any missing AI content for all articles

---

## Article Edit Dialog

Full-width modal (80% viewport) for editing article content.

**Meta fields:**
- Title, Author, Publication Date, Source URL, Thumbnail URL, Topics

**Summary** — plain textarea (English only)

**Content tabs — English / Spanish / Haitian Creole:**

Each tab contains:
- Title and Summary fields (translated tabs)
- **WYSIWYG editor** (TipTap) — Bold, Italic, Strike, H2, H3, Bullet list, Ordered list, Blockquote, Link, Image, Undo/Redo
- **`</> HTML` toggle** — switches to raw HTML textarea; syncs back to WYSIWYG on toggle
- **Live preview** — renders current HTML side-by-side

---

## Related Documentation

- [Frontend UI](frontend-ui.md) - Overall frontend architecture
- [Scraping Methods](scraping-methods.md) - How each scraping method works
- [CSS Selectors](css-selectors.md) - Selector syntax and debugging
- [API Documentation](api-documentation.md) - Source and article API endpoints
- [Troubleshooting](troubleshooting.md) - Common issues with sources and scraping
