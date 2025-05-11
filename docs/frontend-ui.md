Frontend UI Styling and Stack

The frontend of the mango.tc news application is being migrated to a new stack for improved performance and developer experience.

**New Frontend Stack:**

*   **Framework:** Astro
*   **UI Library:** React
*   **Styling:** Tailwind CSS
*   **Component Library:** shadcn/ui (built with Radix UI and Tailwind CSS)
*   **State Management:** React's built-in hooks (useState, useEffect) are currently used within React components (Astro Islands). Integration with TanStack Query is a potential future enhancement.
*   **Content Fetching:** Data is fetched from the backend API. The API URL is configured using environment variables.
*   **Environment Variables:** The backend API URL is configured using environment variables. An example file, `.env.example`, is provided in the `frontend` directory.
    *   Copy the example file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the newly created `.env` file and fill in the required value:
        ```env
        # Backend API URL
        PUBLIC_BACKEND_API_URL=http://localhost:3000/api
        ```
    Replace `http://localhost:3000/api` with the actual URL of your backend API.
*   **Routing:** Astro's file-based routing.

**Current Styling State:**

The migration to Tailwind CSS and shadcn/ui is in progress. Basic styling has been applied to the main components (`Header`, `NewsFeed`, `Footer`, `ArticleDetail`, `SettingsPage`) using Tailwind utility classes. shadcn/ui components, such as `Card`, are being integrated to provide a consistent and accessible UI.

The application is now styled using Tailwind CSS and leverages shadcn/ui components for a modern look and feel. Styling for article content readability and responsiveness has been added using the `article-content` class in `global.css`, with left and right padding removed for a wider content area. Text colors, including paragraph text within `.article-content` using `text-foreground` and article metadata using `text-muted-foreground`, have been reviewed and adjusted in `global.css` to ensure optimal color contrast for improved readability and accessibility in both light and dark modes. Specifically, the `--muted-foreground` color in dark mode was adjusted to improve contrast against the muted background. Additionally, the `ArticleDetail.tsx` component now processes the raw article content to split it into individual paragraphs for better structure and readability.

The source add/edit dialog in `frontend/src/components/SettingsPage.tsx` has been styled using shadcn/ui components and Tailwind CSS grid and gap utilities for improved form layout and readability. Functionality to trigger scraping for individual sources directly from the settings page has also been added. Toggles for enabling/disabling AI summary, tag, and image generation per source have been added to this modal.

A new "View Posts" button has been added to each source entry on the Settings page. Clicking this button opens a dialog displaying a list of all articles associated with that source. Within this dialog, there are buttons to delete all posts for the source and to block the source from future scraping (by setting its `is_active` status to false).

New toggles have been added to the Settings page (`frontend/src/components/SettingsPage.tsx`) to globally enable or disable AI summary, tag, and image generation during the scraping process. These settings are saved to and loaded from `localStorage`.

Further styling refinements and component integrations will continue as the migration progresses. Conditional top padding has been implemented on the newsfeed cards in `NewsFeed.tsx` to ensure no gap above the image when present, while providing padding when no image exists. The top padding was previously removed from the `Card` component to allow images to be positioned at the very top. "Share on WhatsApp" and "Share on Facebook" buttons have been added to each news feed card and at the bottom of the article detail page (`ArticleDetail.tsx`) to allow users to easily share articles.

Articles in the news feed are now grouped by publication date (Day, Month, Year) with a horizontal rule separator between each date group for improved readability and organization.

The Google AdSense script (`https://pagead2.googic.com/pagead/js/adsbygoogle.js`) has been added to the `<head>` section of the base layout (`frontend/src/layouts/BaseLayout.astro`) to enable ad display on pages using this layout, including the main news feed page.

An audit of the shadcn/ui components in `frontend/src/components/ui/` has been completed. The audited components include `button`, `card`, `chart`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `switch`, and `textarea`. A minor correction was made to `frontend/src/components/ui/chart.tsx` to use a path alias (`@/lib/utils`) for the `cn` utility function instead of a relative import.

The `ModeToggle.tsx` component handles the theme switch. It is implemented as a simple button that toggles between light and dark mode on click. The icon displayed on the button indicates the theme that will be applied when clicked: a Moon icon is shown in light mode (to switch to dark mode), and a Sun icon is shown in dark mode (to switch to light mode). This implementation was chosen to address compatibility issues with the previous dropdown menu approach on iOS Safari.

**Responsiveness:**

The application is designed to be responsive across various screen sizes using Tailwind CSS utility classes and the responsive features of shadcn/ui components.

*   **General Layout:** The main layout and card components utilize responsive grid and flexbox classes (`grid-cols-1 md:grid-cols-2`, `flex-col md:flex-row`, etc.) to adapt to different breakpoints.
*   **Settings Pages:** The `SettingsPage.tsx` component, including the main dashboard, scheduled tasks, and sources sections, employs responsive design principles. The add/edit source modal form layout has been specifically adjusted to stack form elements vertically on small screens (`grid grid-cols-1`) and transition to a multi-column grid on medium screens and above (`md:grid-cols-4`) for improved usability on mobile devices.
*   **Article Content:** The `.article-content` class in `global.css` ensures readability and responsiveness for article content, including responsive images.
*   **Source Filter Dropdown:** The source filter dropdown on the main news feed page (`frontend/src/components/IndexPage.tsx`) has been made more mobile and touch-friendly by adjusting the Popover content width to be full width on small screens and increasing the touch target area for each source item within the dropdown.
*   **Source Articles Page:** The table displaying articles on the source-specific settings page (`frontend/src/pages/settings/source/[sourceId].astro`, using the `SourceArticles.tsx` component) is made responsive using `overflow-x-auto` to enable horizontal scrolling on smaller screens. Table cell content is truncated (`max-w-xs truncate`) to manage width. The layout within the AI Summary, AI Tags, and AI Image URL cells has been adjusted to stack the input/textarea and associated button vertically on small screens (`flex flex-col`) for improved readability and usability, transitioning to a horizontal layout on medium screens and above (`md:flex-row`). Action buttons in the last column are also stacked vertically on smaller screens (`flex flex-col`) for better usability.

---

### Article Detail Page

The Article Detail page (`frontend/src/pages/article/[id].astro`) displays the full content of a selected news article. The page title is dynamically set to "mangonews - [Article Title]" by fetching the article data server-side.

### Navigation

A persistent header component (`frontend/src/components/Header.tsx`) has been added to all main pages (`/`, `/settings`, and `/article/[id]`) to provide consistent navigation. The navigation links are defined in `frontend/src/lib/nav-items.ts`.

### Settings Page

The Admin Dashboard and Source Management features have been combined into a single Settings page (`frontend/src/pages/settings.astro`), utilizing the `SettingsPage.tsx` React component. This page provides a centralized location for managing news sources and controlling scraping processes, now including visual charts for database statistics.

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
