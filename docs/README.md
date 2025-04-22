# Mango News Documentation

Welcome to the Mango News documentation. This guide provides comprehensive information on setting up, configuring, and using the Mango News application, including details on its backend, frontend, and scraping functionalities.

## Table of Contents

- [Backend Setup and Configuration](backend-setup.md)
- [Scraping Methods (Open Source and Firecrawl)](scraping-methods.md)
- [Using CSS Selectors for Scraping](css-selectors.md)
- [Admin UI Features (Source Management and Discovery)](admin-ui.md)
- [Troubleshooting Common Issues](troubleshooting.md)

## Frontend Features

This section outlines key features and components of the Mango News frontend application.

### News Feed

The News Feed component (`frontend/src/components/NewsFeed.tsx`) displays aggregated news articles.

- **Dynamic Topic Filtering:** Articles can be filtered by topic using the Topic Filter component. The available topics are fetched dynamically from the backend API (`/api/topics`).
- **Improved Icon Display:** The news feed now uses more granular icons and visual indicators for article sources based on their category, verification status (`isVerified`), official status (`isOfficial`), and whether they are from Facebook (`isFacebook`).
- **Readability Enhancements:** Styling adjustments have been made to the article cards to improve readability, including increased spacing between elements and relaxed line height for the summary text.

### Article Detail Page

The Article Detail page (`frontend/src/app/article/[id]/page.tsx`) displays the full content of a selected news article.

- **Readability Enhancements:** Styling adjustments have been made to the article content for improved readability, including relaxed line height for the main article text and added spacing between paragraphs.
- **Clickable Source URL:** The source URL is now displayed as a clickable link.

### Topic Filter

The Topic Filter component (`frontend/src/components/TopicFilter.tsx`) allows users to select a topic to filter the news feed.

- Topics are loaded dynamically from the backend.
- Selecting a topic updates the news feed to show only articles related to that topic.

### Date Range Filter

The Date Range Filter component (`frontend/src/components/DateRangeFilter.tsx`) allows users to filter news articles by a specific date range.

### Search

Users can search for articles by title, summary, or raw content using the search bar.

---

This documentation is a work in progress. If you find any issues or have suggestions for improvement, please contribute!
