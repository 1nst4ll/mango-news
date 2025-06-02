# News Feed Optimization Plan: Backend Pagination + Frontend Infinite Scroll

This document outlines the steps to improve the performance of the news feed by implementing backend pagination and frontend infinite scrolling.

## Current State Analysis

*   **Frontend Component:** `frontend/src/components/NewsFeed.tsx`
*   **Data Fetching:** The `NewsFeed.tsx` component currently fetches all articles from the `/api/articles` endpoint.
*   **API Call:** The API call includes `searchTerm` and `selectedSources` as query parameters but **lacks any pagination parameters** (e.g., `page`, `limit`, `offset`).
*   **Client-Side Processing:** Category filtering, grouping by date, and sorting are all performed client-side on the entire dataset received from the backend.
*   **Bottleneck:** As the number of articles grows, fetching all articles at once leads to significant performance degradation, increased load times, and higher bandwidth consumption.

## Proposed Solution: Backend Pagination + Frontend Infinite Scroll

This approach will reduce the initial load, improve responsiveness, and provide a smoother user experience for browsing large numbers of articles.

## Step-by-Step Implementation Plan

### Phase 1: Backend API Modifications (High-Level Overview)

These changes are outside the direct scope of the frontend codebase but are crucial prerequisites.

*   [ ] **Task 1: Modify `/api/articles` Endpoint to Support Pagination**
    *   [ ] **Sub-task 1.1:** Update the backend API (`backend/src/index.js` and `backend/src/scraper.js` or relevant data access layer) to accept `page` and `limit` (or `offset` and `limit`) query parameters.
    *   [ ] **Sub-task 1.2:** Implement logic to return only a subset of articles based on the provided `page` and `limit`.
    *   [ ] **Sub-task 1.3:** Include total number of pages or total articles in the API response (e.g., in a `X-Total-Count` header or a `meta` object in the JSON response) to help the frontend determine when to stop fetching.

### Phase 2: Frontend Implementation

These changes will be made within the `frontend` directory.

*   [ ] **Task 2: Update `NewsFeed.tsx` to Implement Infinite Scrolling**
    *   [ ] **Sub-task 2.1:** Introduce new state variables in `NewsFeed.tsx` for `currentPage` (default to 1) and `hasMore` (boolean, default to true).
    *   [ ] **Sub-task 2.2:** Modify the `fetchArticles` function to include `page` and `limit` parameters in the API request. A reasonable `limit` could be 10-20 articles per page initially.
    *   [ ] **Sub-task 2.3:** Adjust `fetchArticles` to *append* new articles to the existing `articles` state instead of overwriting it.
    *   [ ] **Sub-task 2.4:** Update `hasMore` state based on the backend's response (e.g., if the number of returned articles is less than the requested `limit`, set `hasMore` to `false`).
    *   [ ] **Sub-task 2.5:** Implement an Intersection Observer or a scroll event listener to detect when the user scrolls near the bottom of the `NewsFeed` component.
    *   [ ] **Sub-task 2.6:** When the bottom is reached and `hasMore` is true, increment `currentPage` and trigger `fetchArticles` again.
    *   [ ] **Sub-task 2.7:** Add a loading indicator at the bottom of the feed when `loading` is true and `articles` are already present (to distinguish from initial load).
    *   [ ] **Sub-task 2.8:** Add a "No More Articles" message when `hasMore` is false.
    *   [ ] **Sub-task 2.9:** Re-evaluate client-side filtering by `activeCategory`. Ideally, this should be handled by the backend if possible, but if not, ensure it's applied to the *appended* articles.

*   [ ] **Task 3: Refine `IndexPage.tsx` (Minor Adjustments)**
    *   [ ] **Sub-task 3.1:** Ensure `NewsFeed` component props are compatible with the new pagination logic (e.g., if `searchTerm` or `selectedSources` change, `NewsFeed` should reset `currentPage` and clear `articles` before refetching).

*   [ ] **Task 4: Update Documentation**
    *   [ ] **Sub-task 4.1:** Update `docs/frontend-ui.md` to reflect the new infinite scrolling implementation and data fetching strategy.
    *   [ ] **Sub-task 4.2:** Add a note in `PROGRESS.md` about this performance improvement.

## Testing Considerations

*   [ ] **Test 1:** Verify initial load time with a limited number of articles.
*   [ ] **Test 2:** Verify articles load correctly as the user scrolls down.
*   [ ] **Test 3:** Test with various `searchTerm` and `selectedSources` combinations to ensure pagination works with filters.
*   [ ] **Test 4:** Verify the "No More Articles" message appears correctly when all articles are loaded.
*   [ ] **Test 5:** Check responsiveness across different devices.
*   [ ] **Test 6:** Monitor network requests to ensure only paginated data is being fetched.
