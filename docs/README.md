# Mango News Documentation

Welcome to the Mango News documentation. This guide provides comprehensive information on setting up, configuring, and using the Mango News application, including details on its backend, frontend, and scraping functionalities.

## Table of Contents

- [Backend Setup and Configuration](backend-setup.md)
- [Scraping Methods (Open Source and Firecrawl)](scraping-methods.md)
- [Using CSS Selectors for Scraping](css-selectors.md)
- [Admin UI Features (Source Management and Discovery)](admin-ui.md)
- [Troubleshooting Common Issues](troubleshooting.md)

## Scraping Enhancements

- **AI Topic Assignment:** Integrated AI using the Groq SDK in `backend/src/scraper.js` to analyze article content and assign 2-3 relevant topics from a predefined list of 30 general topics. This ensures consistent tagging across articles.
- **AI Summary Generation:** Enhanced the AI summary generation in `backend/src/scraper.js` to be optimized for SEO by focusing on key information and incorporating relevant keywords.
- **Relative Date Parsing:** Implemented logic in `backend/src/scraper.js` to parse relative date formats (e.g., "x days ago", "x hours ago") and convert them to absolute timestamps for accurate storage and display.

## Frontend Features

This section outlines key features and components of the Mango News frontend application.

### News Feed

The News Feed component (`frontend/src/components/NewsFeed.tsx`) displays aggregated news articles.

- **Dynamic Topic Filtering:** Articles can be filtered by topic using the Topic Filter component. The available topics are fetched dynamically from the backend API (`/api/topics`).
- **Improved Icon Display:** The news feed now uses more granular icons and visual indicators for article sources based on their category, verification status (`isVerified`), official status (`isOfficial`), and whether they are from Facebook (`isFacebook`).
- **Readability Enhancements:** Styling adjustments have been made to the article cards to improve readability, including increased spacing between elements and relaxed line height for the summary text.
- **Topic Tag Overlay Fix:** Resolved an issue where topic tags were not displayed as an overlay on the article thumbnail by adjusting the positioning and stacking context in `NewsFeed.tsx`.
- **Summary Truncation:** The article summary is now truncated to a maximum of 60 words, ensuring it does not cut off mid-sentence.

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

### Styling and Branding

The application uses the following fonts and color palette:

**Website:**
*   **Font:** Manrope
*   **Colors:**
    *   Orange: `#FF7F50`
    *   Turquoise: `#13C3D1`
    *   Black (for headings): `#080808`
    *   Gray: `#5A6773`
    *   Light gray: `#F8F9FA`

**Logo:**
*   **Font:** Uni Neue
*   **Text color:** `#FF7F50`

---

This documentation is a work in progress. If you find any issues or have suggestions for improvement, please contribute!
