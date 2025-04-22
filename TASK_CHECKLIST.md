# Task Checklist: Source Discovery and Open-Source Scraping

This document outlines the completed and remaining tasks for implementing the source discovery feature and integrating an open-source scraping method.

## Completed Tasks:

- [x] Database Schema Update: Added `scraping_method` column to the `sources` table (`db/schema.sql`).
- [x] Frontend UI Update (`frontend/src/app/admin/sources/page.tsx`):
    - [x] Modified `Source` interface to include `scraping_method`.
    - [x] Updated component state (`newSource`, `editingSource`) to include `scraping_method`.
    - [x] Added a dropdown for selecting the scraping method in the Add/Edit Source modal.
    - [x] Updated `handleAddSource` and `handleEditSource` to send `scraping_method` to the backend.
- [x] Backend API Update (`backend/src/index.js`):
    - [x] Modified `/api/sources` GET endpoint to include `scraping_method`.
    - [x] Updated `/api/sources` POST endpoint to accept and insert `scraping_method`.
    - [x] Updated `/api/sources/:id` PUT endpoint to accept and update `scraping_method`.
    - [x] Added a basic `/api/discover-sources` GET endpoint calling a placeholder discovery function.
- [x] Open-Source Scraper File (`backend/src/opensourceScraper.js`):
    - [x] Created the file.
    - [x] Included a basic `scrapeArticle` function using Puppeteer.
    - [x] Included a basic `discoverArticleUrls` function using Puppeteer with simple link heuristics.
    - [x] Exported `scrapeArticle` and `discoverArticleUrls`.
- [x] Main Scraper Logic Update (`backend/src/scraper.js`):
    - [x] Imported open-source scraper functions.
    - [x] Modified `scrapeArticlePage` to use the selected scraping method.
    - [x] Modified `runScraper` and `runScraperForSource` to use the selected discovery method.
- [x] Updated PROGRESS.md: Documented the completed steps.

## Remaining Tasks:

- [x] Implement Further Accessibility Enhancements (Frontend):
    - [x] Conduct a comprehensive accessibility review and address identified issues.
- [x] Refine Responsive Design (Frontend):
    - [x] Test and refine responsiveness on various devices.
- [x] Add Detailed Documentation (`/docs` folder):
    - [x] Create comprehensive documentation for setup, scraping methods, and UI features.
- [x] Final Review and Cleanup:
    - [x] Review codebase for TODOs, bugs, and optimizations.
