# Frontend UI Styling (Refactoring in Progress)

This document previously outlined the styling and UI design principles using Tailwind CSS and Shadcn UI. These frameworks have been removed to prepare the frontend for refactoring with a new styling approach.

The current state of the frontend files (`frontend/src/app/page.tsx`, `frontend/src/app/article/[id]/page.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/components/footer.tsx`, `frontend/src/components/NewsFeed.tsx`, and `frontend/src/app/globals.css`) has been stripped of layout and styling classes to display plain content.

**Previous Technologies Used (Removed):**

*   Tailwind CSS
*   Shadcn UI
*   `clsx`
*   `tw-animate-css`

**Files Modified:**

*   `frontend/package.json` (removed `clsx`)
*   `frontend/src/app/globals.css` (removed Tailwind and `tw-animate-css` imports)
*   `frontend/src/app/page.tsx` (removed layout/styling classes)
*   `frontend/src/app/article/[id]/page.tsx` (removed layout/styling classes and `prose`)
*   `frontend/src/components/Header.tsx` (removed styling classes)
*   `frontend/src/components/footer.tsx` (removed styling classes)
*   `frontend/src/components/NewsFeed.tsx` (removed styling classes and Shadcn UI imports/usage)

The frontend is now ready for the implementation of a new styling framework.
