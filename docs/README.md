# Mango News Documentation

Welcome to the Mango News documentation. This guide provides comprehensive information on setting up, configuring, and using the Mango News application, including details on its backend, frontend, and scraping functionalities.

## Table of Contents

- [Backend Setup and Configuration](backend-setup.md)
- [Scraping Methods (Open Source and Firecrawl)](scraping-methods.md)
- [Using CSS Selectors for Scraping](css-selectors.md)
- [Admin UI Features (Source Management and Discovery)](admin-ui.md)
- [Troubleshooting Common Issues](troubleshooting.md)

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

### Styling and Branding

All styling has been removed from the application. The frontend is currently unstyled, relying on default browser rendering.

---

This documentation is a work in progress. If you find any issues or have suggestions for improvement, please contribute!
