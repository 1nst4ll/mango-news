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

- **Dynamic Topic Filtering:** Articles can be filtered by topic using the Topic Filter component. The available topics are fetched dynamically from the backend API (`/api/topics`).
- **Improved Icon Display:** The news feed now uses more granular icons and visual indicators for article sources based on their category, verification status (`isVerified`), official status (`isOfficial`), and whether they are from Facebook (`isFacebook`).
- **Readability Enhancements:** Styling adjustments have been made to the article cards to improve readability, including increased spacing between elements and relaxed line height for the summary text.
- **Topic Tag Overlay Fix:** Resolved an issue where topic tags were not displayed as an overlay on the article thumbnail by adjusting the positioning and stacking context in `NewsFeed.tsx`.
- **Summary Truncation:** The article summary is now truncated to a maximum of 60 words, ensuring it does not cut off mid-sentence.
- **Bold Summary Text:** AI summaries in the news feed now render text enclosed in markdown bold syntax (`**text**`) as bold.

### Article Detail Page

The Article Detail page (`frontend/src/app/article/[id]/page.tsx`) displays the full content of a selected news article.

- **Readability Enhancements:** Styling adjustments have been made to the article content for improved readability, including relaxed line height for the main article text and added spacing between paragraphs.
- **Clickable Source URL:** The source URL is now displayed as a clickable link.

### Filter Panel

The Filter Panel (`frontend/src/components/FilterPanel.tsx`) consolidates search and filtering controls for the news feed. It includes:

-   **Search Input:** Allows users to search articles by title, summary, or raw content.
-   **Topic Filter:** A multi-select dropdown (`frontend/src/components/TopicFilter.tsx`) allowing users to filter by multiple topics. Topics are loaded dynamically from the backend.
-   **Date Range Filter:** Allows users to filter articles by a specific date range using start and end date inputs (`frontend/src/components/DateRangeFilter.tsx`).
-   **Source Filter:** A multi-select dropdown (`frontend/src/components/SourceFilter.tsx`) allowing users to filter by multiple news sources. Sources are assumed to be loaded dynamically from a backend API endpoint (`/api/sources`).
-   **Apply and Clear Buttons:** Buttons to apply the selected filters or clear all filter criteria.

Filtering is applied to the news feed by passing the selected criteria from the Filter Panel to the News Feed component, which then includes these criteria in the backend API request for articles.

### Sidebar

A new collapsible and themeable sidebar component has been added to the application layout (`frontend/src/app/layout.tsx`). The sidebar structure is defined in `frontend/src/components/app-sidebar.tsx` and utilizes components from `@/components/ui/sidebar`. It provides navigation and will be further customized to include application-specific menus and controls.

### News Feed

The News Feed component (`frontend/src/components/NewsFeed.tsx`) displays aggregated news articles based on the selected filters from the Filter Panel and the active category tab.

-   Articles are fetched from the backend API (`/api/articles`) with query parameters for search term, selected topics, selected sources, and date range.
-   Improved Icon Display: The news feed now uses more granular icons and visual indicators for article sources based on their category, verification status (`isVerified`), official status (`isOfficial`), and whether they are from Facebook (`isFacebook`).
-   Readability Enhancements: Styling adjustments have been made to the article cards to improve readability, including increased spacing between elements and relaxed line height for the summary text.
-   Topic Tag Overlay Fix: Resolved an issue where topic tags were not displayed as an overlay on the article thumbnail by adjusting the positioning and stacking context in `NewsFeed.tsx`.
-   Summary Truncation: The article summary is now truncated to a maximum of 60 words, ensuring it does not cut off mid-sentence.
-   Bold Summary Text: AI summaries in the news feed now render text enclosed in markdown bold syntax (`**text**`) as bold.

### Article Detail Page

The Article Detail page (`frontend/src/app/article/[id]/page.tsx`) displays the full content of a selected news article.

-   Readability Enhancements: Styling adjustments have been made to the article content for improved readability, including relaxed line height for the main article text and added spacing between paragraphs.
-   Clickable Source URL: The source URL is now displayed as a clickable link.

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
