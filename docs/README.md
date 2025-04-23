# Mango News Documentation

Welcome to the Mango News documentation. This guide provides comprehensive information on setting up, configuring, and using the Mango News application, including details on its backend, frontend, and scraping functionalities.

## Table of Contents

- [Backend Setup and Configuration](backend-setup.md)
- [Scraping Methods (Open Source and Firecrawl)](scraping-methods.md)
- [Using CSS Selectors for Scraping](css-selectors.md)
- [Settings Page (Admin Controls and Source Management)](admin-ui.md)
- [Troubleshooting Common Issues](troubleshooting.md)
- [Frontend UI Styling](frontend-ui.md)

## Backend API Endpoints

This section details the available API endpoints provided by the backend server.

### GET /api/sources

Retrieves a list of all news sources.

### POST /api/sources

Adds a new news source.

### PUT /api/sources/:id

Updates an existing news source by ID.

### DELETE /api/sources/:id

Deletes a news source by ID.

### GET /api/topics

Retrieves a list of all topics.

### GET /api/articles

Retrieves a list of all articles. Supports filtering by `topic`, `startDate`, and `endDate` query parameters.

### GET /api/articles/:id

Retrieves a single article by ID.

### POST /api/scrape/run/:id

Triggers the scraper for a specific source by ID.

### POST /api/scrape/run

Triggers a full scraper run for all active sources.

### GET /api/discover-sources

Initiates a basic source discovery process (currently uses opensourceScraper).

### POST /api/articles/purge

Deletes all articles, topics, and article links from the database.

### GET /api/stats

Retrieves database statistics, including total article count, total source count, article count per source, and article count per year.

**Response Example:**

```json
{
  "totalArticles": 1500,
  "totalSources": 10,
  "articlesPerSource": [
    {
      "source_name": "Source A",
      "article_count": 500
    },
    {
      "source_name": "Source B",
      "article_count": 300
    },
    // ... more sources
  ],
  "articlesPerYear": [
    {
      "year": 2023,
      "article_count": 800
    },
    {
      "year": 2024,
      "article_count": 700
    }
    // ... more years
  ]
}
```

## Scraping Enhancements

- **AI Topic Assignment:** Integrated AI using the Groq SDK in `backend/src/scraper.js` to analyze article content and assign exactly 3 relevant topics from a predefined list of 31 general topics (including Sport). This ensures consistent tagging across articles.
- **AI Summary Generation:** Enhanced the AI summary generation in `backend/src/scraper.js` to be optimized for SEO by focusing on key information and incorporating relevant keywords.
- **Relative Date Parsing:** Implemented logic in `backend/src/scraper.js` to parse relative date formats (e.g., "x days ago", "x hours ago") and convert them to absolute timestamps for accurate storage and display.

## Frontend Features

This section outlines key features and components of the Mango News frontend application.

### News Feed

The News Feed component (`frontend/src/components/NewsFeed.tsx`) displays aggregated news articles.

- **Dynamic Topic Filtering:** Articles can be filtered by topic. The available topics are fetched dynamically from the backend API (`/api/topics`).

### Article Detail Page

The Article Detail page (`frontend/src/app/article/[id]/page.tsx`) displays the full content of a selected news article.

### Navigation

A persistent header component (`frontend/src/components/Header.tsx`) has been added to all main pages (`/`, `/settings`, and `/article/[id]`) to provide consistent navigation. The navigation links are defined in `frontend/src/lib/nav-items.ts`.

### Settings Page

The Admin Dashboard and Source Management features have been combined into a single Settings page (`frontend/src/app/settings/page.tsx`). This page provides a centralized location for managing news sources and controlling scraping processes.

### Styling and Branding

All styling has been removed from the application. The frontend is currently unstyled, relying on default browser rendering.

---

This documentation is a work in progress. If you find any issues or have suggestions for improvement, please contribute!
