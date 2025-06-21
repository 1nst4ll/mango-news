Frontend UI Styling and Stack

The frontend of the mango.tc news application is being migrated to a new stack for improved performance and developer experience.

**New Frontend Stack:**

*   **Framework:** Astro
*   **UI Library:** React
*   **Styling:** Tailwind CSS
*   **Component Library:** shadcn/ui (built with Radix UI and Tailwind CSS)
*   **State Management:** React's built-in hooks (useState, useEffect) are currently used within React components (Astro Islands). Integration with TanStack Query is a potential future enhancement.
*   **Content Fetching:** Data is fetched from the backend API. The API URL is configured using environment variables. The frontend uses `PUBLIC_API_URL` from `import.meta.env`. If this variable is not set, it defaults to `http://localhost:3000`.
*   **Environment Variables:** The backend API URL is configured using environment variables. An example file, `.env.example`, is provided in the `frontend` directory.
    *   Copy the example file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the newly created `.env` file and fill in the required value:
        ```env
        # Backend API URL
        PUBLIC_API_URL=http://localhost:3000
        ```
    Replace `http://localhost:3000` with the actual URL of your backend API.
*   **Routing:** Astro's file-based routing, now configured for internationalization (i18n).
*   **Internationalization (i18n):** Multilingual support is implemented using Astro's i18n features and the `useTranslations` hook. Static UI text is managed via JSON locale files located in `frontend/src/locales/`. Dynamic content from the backend (article titles, summaries, topics) is translated via AI and displayed based on the active locale. Helper functions (`getTranslatedText`, `getTranslatedTopics`) are used in `NewsFeed.tsx` to display translated content with a fallback to English if translations are not available, providing a clear message to the user.

**Current Styling State:**

The migration to Tailwind CSS and shadcn/ui is in progress. Basic styling has been applied to the main components (`Header`, `NewsFeed`, `Footer`, `ArticleDetail`, `SettingsPage`) using Tailwind utility classes. shadcn/ui components, such as `Card`, are being integrated to provide a consistent and accessible UI.

The application is now styled using Tailwind CSS and leverages shadcn/ui components for a modern look and feel. Styling for article content readability and responsiveness has been added using the `article-content` class in `global.css`, with left and right padding removed for a wider content area. Text colors, including paragraph text within `.article-content` using `text-foreground` and article metadata using `text-muted-foreground`, have been reviewed and adjusted in `global.css` to ensure optimal color contrast for improved readability and accessibility in both light and dark modes. Specifically, the `--muted-foreground` color in dark mode was adjusted to improve contrast against the muted background. Additionally, the `ArticleDetail.tsx` component now processes the raw article content to split it into individual paragraphs for better structure and readability.

**News Feed Performance:**
The main news feed (`NewsFeed.tsx`) has been heavily optimized for performance and user experience. It uses an **`IntersectionObserver`** to implement infinite scrolling, fetching articles in chunks as the user scrolls down.

Key optimizations include:
*   **Efficient Data Fetching:** The component fetches paginated data from the backend, significantly improving initial load times.
*   **`IntersectionObserver` with `rootMargin`:** To prevent the "rapid-fire" fetching issue where multiple pages are loaded at once, the `IntersectionObserver` is configured with a `rootMargin`. This ensures that the next page of articles is fetched just before the user reaches the end of the current list.
*   **Debounced Fetching:** A small delay has been added to the `IntersectionObserver` callback to prevent it from firing too frequently.
*   **Request Abortion:** A `fetchInProgressRef` and `AbortController` are used to prevent multiple concurrent API calls and to cancel pending requests if the component unmounts or the filters change.
*   **Optimized Re-renders:** A custom `useDeepCompareEffect` hook is used to prevent unnecessary re-renders when the filter props change, ensuring that the news feed only re-fetches data when the filters have actually changed.
*   **Improved Loading States:** The component now uses separate loading states for the initial page load (`initialLoading`) and subsequent infinite scroll fetches (`loading`). This provides a smoother user experience, with a prominent loader on the initial load and a more subtle one for subsequent fetches.
*   **Consolidated Data Fetching:** The fetching of news sources has been consolidated to the page level (`[lang]/index.astro`) and passed down as props to the `NewsFeed` and `Footer` components, eliminating redundant API calls.
*   **Error Handling:** The news feed now includes a "Retry" button when an API error occurs, allowing users to easily retry a failed request.

The source add/edit dialog in `frontend/src/components/SettingsPage.tsx` has been styled using shadcn/ui components and Tailwind CSS grid and gap utilities for improved form layout and readability. Functionality to trigger scraping for individual sources directly from the settings page has also been added. Toggles for enabling/disabling AI summary, tag, and image generation per source have been added to this modal.

A new "View Posts" button has been added to each source entry on the Settings page. Clicking this button opens a dialog displaying a list of all articles associated with that source. Within this dialog, there are buttons to delete all posts for the source and to block the source from future scraping (by setting its `is_active` status to false).

New toggles have been added to the Settings page (`frontend/src/components/SettingsPage.tsx`) to globally enable or disable AI summary, tag, and image generation during the scraping process. These settings are saved to and loaded from `localStorage`.

Further styling refinements and component integrations will continue as the migration progresses. Conditional top padding has been implemented on the newsfeed cards in `NewsFeed.tsx` to ensure no gap above the image when present, while providing padding when no image exists. The top padding was previously removed from the `Card` component to allow images to be positioned at the very top. "Share on WhatsApp" and "Share on Facebook" buttons have been added to each news feed card and at the bottom of the article detail page (`ArticleDetail.tsx`) to allow users to easily share articles. These buttons are responsive, adjusting their size and layout on smaller screens.

Additionally, to prevent potential conflicts with component-level focus management, especially on mobile browsers like iOS Safari, the global `outline-ring/50` style previously applied to all elements (`*`) in `global.css` has been removed.

Articles in the news feed are now grouped by publication date (Day, Month, Year) with a horizontal rule separator between each date group for improved readability and organization.

The Google AdSense script (`https://pagead2.googic.com/pagead/js/adsbygoogle.js`) has been added to the `<head>` section of the base layout (`frontend/src/layouts/BaseLayout.astro`) to enable ad display on pages using this layout, including the main news feed page.

An audit of the shadcn/ui components in `frontend/src/components/ui/` has been completed. The audited components include `button`, `card`, `chart`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `switch`, and `textarea`. A minor correction was made to `frontend/src/components/ui/chart.tsx` to use a path alias (`@/lib/utils`) for the `cn` utility function instead of a relative import.

The `ModeToggle.tsx` component handles the theme switch. It is implemented as a simple button that toggles between light and dark mode on click. The icon displayed on the button indicates the theme that will be applied when clicked: a Moon icon is shown in light mode (to switch to dark mode), and a Sun icon is shown in dark mode (to switch to light mode). This implementation was chosen to address compatibility issues with the previous dropdown menu approach on iOS Safari. Similarly, the user login button (`LoginButton.tsx`) was updated from `DropdownMenu` to `Popover` to resolve similar iOS Safari compatibility issues, ensuring consistent functionality across devices. The `LanguageSwitcher.tsx` component also uses a `Popover` for language selection, displaying flag icons for each language and dynamically updating the URL to reflect the selected locale, ensuring a consistent and mobile-friendly experience.

**Responsiveness:**

The application is designed to be responsive across various screen sizes using Tailwind CSS utility classes and the responsive features of shadcn/ui components.

*   **Viewport Configuration:** The viewport meta tag in `BaseLayout.astro` has been updated to `width=device-width, initial-scale=1` to enhance consistent rendering and scaling behavior on mobile devices, particularly iOS.
*   **Mobile Browser UI Theming:** To ensure the browser's UI (like the top status bar on mobile) adapts to the application's theme, `theme-color` meta tags have been added to `frontend/src/layouts/BaseLayout.astro`. These tags specify `#ffffff` for light mode and `#000000` for dark mode, providing a more integrated visual experience on mobile devices.

*   **General Layout:** The main layout and card components utilize responsive grid and flexbox classes (`grid-cols-1 md:grid-cols-2`, `flex-col md:flex-row`, etc.) to adapt to different breakpoints.
*   **Settings Pages:** The `SettingsPage.tsx` component, including the main dashboard, scheduled tasks, and sources sections, employs responsive design principles. The add/edit source modal form layout has been specifically adjusted to stack form elements vertically on small screens (`grid grid-cols-1`) and transition to a multi-column grid on medium screens and above (`md:grid-cols-4`) for improved usability on mobile devices.
*   **Article Content:** The `.article-content` class in `global.css` ensures readability and responsiveness for article content, including responsive images.
*   **Source Filter Dropdown:** The source filter dropdown on the main news feed page (`frontend/src/components/IndexPage.tsx`) has been made more mobile and touch-friendly by adjusting the Popover content width to be full width on small screens and increasing the touch target area for each source item within the dropdown. It also includes a search input within the popover for easier source discovery.
*   **Source Articles Page:** The table displaying articles on the source-specific settings page (`frontend/src/pages/settings/source/[sourceId].astro`, using the `SourceArticles.tsx` component) is made responsive using `overflow-x-auto` to enable horizontal scrolling on smaller screens. Table cell content is truncated (`max-w-xs truncate`) to manage width. The layout within the AI Summary, AI Tags, and AI Image URL cells has been adjusted to stack the input/textarea and associated button vertically on small screens (`flex flex-col`) for improved readability and usability, transitioning to a horizontal layout on medium screens and above (`md:flex-row`). Action buttons in the last column are also stacked vertically on smaller screens (`flex flex-col`) for better usability.
*   **Rescrape All Articles Button:** A "Rescrape All Articles" button has been added to the Source Articles page. This button allows users to trigger a re-scraping process for all articles associated with the current source, updating their content in the database. This process now uses Server-Sent Events (SSE) to provide real-time updates on the rescraping progress.
*   **Process Missing AI Data Button:** A "Missing AI Data" button has been added to the Source Articles page, allowing users to trigger the processing of missing AI summaries, tags, images, and translations for all articles within that specific source.
*   **Article Editing:** Individual articles can now be edited directly from the Source Articles page by clicking the "Edit Article" option in the article's action dropdown, which opens the `ArticleEditDialog.tsx`.
*   **Server-Side Pagination:** The data table on the Source Articles page now implements server-side pagination, improving performance by fetching articles in chunks rather than loading all articles at once.

---

### Article Detail Page

The Article Detail page (`frontend/src/pages/article/[id].astro`) displays the full content of a selected news article. The page title is dynamically set to "mangonews - [Article Title]" by fetching the article data server-side. It now supports displaying translated article content (title, summary, raw content, and topics) based on the active locale, with fallbacks to English if translations are not available.

**Enhanced Article Navigation:**
The single article page now offers multiple navigation options to improve user experience and content discovery:

*   **Previous/Next Article Buttons:** Located at the bottom of the article, these buttons allow users to navigate sequentially through articles from the list they were viewing on the main news feed. The functionality relies on the list of article IDs stored in `localStorage` by the news feed component.
*   **Social Sharing Buttons:** WhatsApp and Facebook share buttons are included at the bottom of the article content for easy sharing.
*   **Breadcrumbs:** A breadcrumb trail is displayed at the top of the page, providing clear hierarchical navigation. The structure is typically `News Feed > [Primary Topic (if available)] > Article Title`. The "News Feed" and "Primary Topic" (if present) are clickable links.
*   **"Back to News Feed" Link:** A prominent link with a back arrow icon is provided near the top of the article, offering a quick return to the main news feed.
*   **Clickable Topic Badges:** Topics associated with the article are displayed as clickable badges. Clicking a badge navigates the user to a dedicated topic feed page (`frontend/src/pages/[lang]/news/topic/[topicSlug].astro`) listing all articles related to that specific topic.
*   **Clickable Source Link:** The article's source URL is displayed and is clickable, linking directly to the original source website.
*   **"Related Articles" Section:** A section titled "Related Articles" is displayed at the bottom of the page. This section dynamically fetches and presents a list of articles that share the same primary topic as the current article, encouraging further content exploration.
*   **Styling:** The article content utilizes `prose` classes for enhanced readability, and images within the content are responsive.

---

### Topic Feed Page

The Topic Feed page (`frontend/src/pages/[lang]/news/topic/[topicSlug].astro`) displays a list of articles filtered by a specific topic. This page reuses the `NewsFeed` component to display articles and includes navigation enhancements for improved user experience.

**Key Features:**
*   **Dynamic Routing:** The page uses dynamic routing to capture the `topicSlug` from the URL (e.g., `/en/news/topic/technology`).
*   **NewsFeed Integration:** The `NewsFeed` React component is loaded on this page, receiving the `topicSlug` as its `activeCategory` prop. This triggers the `NewsFeed` to fetch articles from the backend that are associated with the specified topic.
*   **Breadcrumbs:** A breadcrumb trail is displayed at the top of the page, providing clear hierarchical navigation. The structure is typically `News Feed > [Topic Name]`. The "News Feed" is a clickable link.
*   **"Back to News Feed" Button:** A prominent button with a back arrow icon is provided near the top of the page, offering a quick return to the main news feed.
*   **Resolved Rendering Issues:** The `NewsFeed.tsx` component was updated to resolve an infinite rendering loop that caused loading issues and console warnings on topic pages. This was fixed by ensuring the `selectedSources` prop's reference stability in `useEffect` dependencies.

### Navigation

A persistent header component (`frontend/src/components/Header.tsx`) provides consistent navigation across all main pages. The header is sticky, remaining at the top of the viewport during scrolling (`sticky top-0 z-50`).

**Desktop Navigation:**

On medium screens and larger (`md:` breakpoint and above), navigation links are displayed horizontally. The main navigation links are defined in `frontend/src/lib/nav-items.ts` and currently include:

*   Home: `https://mango.tc/`
*   Automoto: `https://mango.tc/listings/?category=automoto-en&pagination=1&sort-by=most-relevant&view=card`
*   Real Estate: `https://mango.tc/listings/?category=real-estate`
*   Jobs: `https://mango.tc/listings/?category=jobs`
*   News: `https://mangonews.onrender.com/`

The "Settings" link, Login button, and Mode Toggle are also displayed horizontally in the desktop view.

**Mobile Navigation:**

On smaller screens (below the `md:` breakpoint), the header layout changes:
*   A hamburger menu icon (`lucide-react` Menu icon) is displayed on the far left. Tapping this icon toggles a full-width dropdown menu containing only the navigation links.
*   The site logo is centered in the header.
*   The `LoginButton` and `ModeToggle` components are displayed on the far right of the header bar.

The dropdown menu (toggled by the hamburger icon):
*   Slides down from the header (`absolute top-full left-0 right-0`).
*   Lists navigation links vertically.
*   Tapping a navigation link or the close icon (`lucide-react` X icon) closes the mobile menu.
*   The Login button and Mode Toggle are now displayed directly in the mobile header bar, not within this dropdown menu.

The "Settings" link (if applicable based on login status) is part of both desktop and mobile navigation (within the dropdown for mobile). The user login/logout functionality and theme toggling are handled by the `LoginButton.tsx` and `ModeToggle.tsx` components respectively. The `LoginButton` uses a `Popover` for its dropdown menu to ensure better compatibility on iOS Safari, including an `onTouchStart` handler and corrected styling (`outline-none`) to resolve interaction issues.

### Secure Login Authorization

Secure login authorization has been implemented on the frontend to protect administrative sections like the Settings page.

**Implementation Details:**


### Settings Page

The Admin Dashboard and Source Management features have been combined into a single Settings page (`frontend/src/pages/settings.astro`), utilizing the `SettingsPage.tsx` React component. This page provides a centralized location for managing news sources and controlling scraping processes, now including visual charts for database statistics.

**Recent Enhancements:**
*   **Tabbed Interface:** The page now uses a tabbed layout (`shadcn/ui Tabs`) to organize settings into "Overview & Stats", "Global Settings & Actions", "Scheduled Tasks", and "Source Management" for improved navigation and reduced clutter.
*   **Removed "Discover New Sources":** The "Discover New Sources" functionality has been removed to streamline source management.
*   **Streamlined AI Data Processing:** The "Process Missing AI Data" section for individual sources has been simplified to a single button that triggers processing for all enabled AI features (summary, tags, image, translations) for that source.
*   **Tooltips:** The "Run Scraper" button now includes a tooltip providing a brief description of its function.
*   **Save Schedule Settings:** Functionality to save scheduled task settings (cron frequencies and AI processing toggles) has been implemented.
*   **Toast Notifications:** User feedback for various actions (e.g., triggering scrapes, purging data, adding/editing/deleting sources, saving settings) is now provided via non-intrusive toast notifications (`shadcn/ui toast`).
*   **Full shadcn/ui Utilization:** All UI elements within the Settings page are consistently built using shadcn/ui components for a cohesive and accessible design.
*   **Improved Mobile Responsiveness for Tabs:** The tab navigation on the Settings page now adapts better to smaller screens, stacking vertically on small viewports and transitioning to a multi-column grid on larger screens, ensuring usability across devices.
*   **Scheduled Translations Setting Fix:** The "Process Missing Translations" toggle in the Scheduled Tasks section can now be correctly saved and loaded from the database, ensuring its state persists across sessions.
*   **Article Management:** The "Source Articles" page (`frontend/src/pages/settings/source/[sourceId].astro`) displays articles in a data table (`shadcn/ui data-table`) defined by `frontend/src/components/columns.tsx`. This table includes sortable columns for `ID`, `Title`, `URL`, `Thumbnail`, `Publication Date`, `AI Summary`, `AI Tags`, and `AI Image`. Actions available for each article via a dropdown menu include:
    *   Copy article ID
    *   Rerun AI processing (Summary, Tags, Image, Translations)
    *   Rescrape Article
    *   Edit Article (opens `ArticleEditDialog.tsx`)
    *   Delete Article
*   **Article Edit Dialog:** The `ArticleEditDialog.tsx` component provides a form for editing individual article details, including translated fields for title, summary, raw content, and topics in Spanish and Haitian Creole.
*   **Source Configuration Enhancements:** The add/edit source modal now includes an `Accordion` for "Open Source Selectors" to better organize scraping configuration. New fields have been added for `article_link_template`, `exclude_patterns`, and `scrape_after_date` to provide more granular control over source scraping. Additionally, a toggle for `enable_ai_translations` has been added to control AI translation generation per source.

---

### Social Sharing (Open Graph Meta Tags)

To enhance how links to the application appear when shared on social media platforms like Facebook, dynamic Open Graph (OG) meta tags have been implemented. These tags provide structured information about the page content, such as the title, description, image, and URL.

**Implementation Details:**

*   The `frontend/src/layouts/BaseLayout.astro` component has been updated to accept and render dynamic OG tags. It now accepts `title`, `description`, `ogImageUrl`, `ogUrl`, and `ogType` props.
*   **Article Pages (`frontend/src/pages/article/[id].astro`):**
    *   `og:title`: Set to the article's title.
    *   `og:description`: Set to the article's summary or the first 160 characters of its content.
    *   `og:image`: Set to the article's `image_url` if available.
    *   `og:url`: Set to the canonical URL of the article page.
    *   `og:type`: Set to `"article"`.
*   **Index Page (`frontend/src/pages/index.astro`):**
    *   `og:title`: Set to "mango.tc news - Latest Headlines".
    *   `og:description`: Set to a general site description.
    *   `og:image`: Set to `/logo.png`.
    *   `og:url`: Set to the homepage URL.
    *   `og:type`: Set to `"website"`.
*   **Settings Page (`frontend/src/pages/settings.astro`):**
    *   `og:title`: Set to "mango.tc news - Settings".
    *   `og:description`: Set to a brief description of the settings page.
    *   `og:image`: Set to `/logo.png`.
    *   `og:url`: Set to the settings page URL.
    *   `og:type`: Set to `"website"`.
*   **Source Articles Page (`frontend/src/pages/settings/source/[sourceId].astro`):**
    *   `og:title`: Set to "mango.tc news - Articles for Source [sourceId]".
    *   `og:description`: Set to a generic description for the source articles page.
    *   `og:image`: Set to `/logo.png`.
    *   `og:url`: Set to the source articles page URL.
    *   `og:type`: Set to `"website"`.

This setup ensures that when links are shared, they are presented with relevant information, improving user engagement and click-through rates from social platforms. Facebook's in-app browser will typically be used by default when these links are opened from within the Facebook mobile app.

---

### RSS Feed

An RSS feed is available for users who wish to subscribe to news updates using an RSS reader.

**Implementation Details:**

*   **Feed URL:** The RSS feed is accessible at `/api/rss` (relative to the backend API URL, e.g., `http://your-backend-domain.com/api/rss`).
*   **Generation:** The feed is generated directly by the backend application (`backend/src/index.js`). It fetches the latest articles from the database and formats them into RSS XML.
*   **Content:** The feed includes the article title, publication date, a summary (with an image if available), and a direct link to the article page on the frontend website.
*   **Navigation:** A link to the RSS feed ("RSS Feed"), accompanied by an RSS icon (from `lucide-react`), has been added to the main navigation bar in the header (`frontend/src/components/Header.tsx` via `frontend/src/lib/nav-items.ts`). The link points to `/api/rss`, which will be resolved relative to the backend API URL configured for the frontend.

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
