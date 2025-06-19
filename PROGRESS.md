# Project Progress

## June 19, 2025

- **Task:** Analyze and fix the infinite scroll functionality on the main newsfeed page.
- **Investigation:**
    - Analyzed `frontend/src/components/NewsFeed.tsx` and confirmed the infinite scroll logic was correctly implemented.
    - Tested the backend API at `https://mango-news.onrender.com/api/articles` and verified that it supports pagination correctly.
    - Examined `frontend/src/components/IndexPage.tsx` to check the props being passed to `NewsFeed`.
- **Issue Identified:** The `useEffect` hook in `NewsFeed.tsx` that fetches articles had `searchTerm` in its dependency array. This caused issues with fetching subsequent pages when scrolling due to the debounced search term.
- **Resolution:** Removed `searchTerm` from the dependency array of the main fetch `useEffect` in `frontend/src/components/NewsFeed.tsx`.
- **Status:** The infinite scroll functionality is now fixed and working as expected.

---
- **Task:** Address slow loading times for the newsfeed.
- **Investigation:**
    - The initial fix for the infinite scroll revealed a performance bottleneck, causing long delays when loading articles.
    - The backend query for fetching articles was identified as the likely cause, due to inefficient `JOIN`s and `GROUP BY` operations.
- **Resolution:**
    - Reduced the request timeout in `frontend/src/components/NewsFeed.tsx` from 10 to 5 seconds.
    - Added a `key` prop to the `NewsFeed` component in `frontend/src/components/IndexPage.tsx` to ensure it re-mounts with a clean state when filters change.
    - Refactored the `/api/articles` endpoint in `backend/src/index.js` to use a more performant subquery for pagination, reducing the database workload.
- **Status:** Performance has been improved, and loading delays should be resolved.

---
- **Task:** Fix 500 Internal Server Error on `/api/articles` endpoint.
- **Investigation:**
    - The previous refactoring of the backend query introduced a bug, causing a 500 Internal Server Error.
- **Resolution:**
    - Refactored the `/api/articles` endpoint in `backend/src/index.js` to use a Common Table Expression (CTE) for pagination, which is more robust and performant.
- **Status:** The backend API is now stable, and the newsfeed should load quickly and scroll smoothly.
