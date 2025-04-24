# Frontend UI Styling and Stack

The frontend of the Mango News application is being migrated to a new stack for improved performance and developer experience.

**New Frontend Stack:**

*   **Framework:** Astro
*   **UI Library:** React
*   **Styling:** Tailwind CSS
*   **Component Library:** shadcn/ui (built with Radix UI and Tailwind CSS)
*   **State Management:** React's built-in hooks (useState, useEffect) are currently used within React components (Astro Islands). Integration with TanStack Query is a potential future enhancement.
*   **Content Fetching:** Data is fetched from the local backend API (`http://localhost:3000`).
*   **Routing:** Astro's file-based routing.

**Current Styling State:**

The migration to Tailwind CSS and shadcn/ui is in progress. Basic styling has been applied to the main components (`Header`, `NewsFeed`, `Footer`, `ArticleDetail`, `SettingsPage`) using Tailwind utility classes. shadcn/ui components, such as `Card`, are being integrated to provide a consistent and accessible UI.

The application is now styled using Tailwind CSS and leverages shadcn/ui components for a modern look and feel. Styling for article content readability and responsiveness has been added using the `article-content` class in `global.css`, with left and right padding removed for a wider content area. Text colors, including paragraph text within `.article-content` using `text-foreground` and article metadata using `text-muted-foreground`, have been reviewed and adjusted in `global.css` to ensure optimal color contrast for improved readability and accessibility in both light and dark modes. Specifically, the `--muted-foreground` color in dark mode was adjusted to improve contrast against the muted background. Additionally, the `ArticleDetail.tsx` component now processes the raw article content to split it into individual paragraphs for better structure and readability.

The source add/edit dialog in `frontend/src/components/SettingsPage.tsx` has been styled using shadcn/ui components and Tailwind CSS grid and gap utilities for improved form layout and readability. Functionality to trigger scraping for individual sources directly from the settings page has also been added.

Further styling refinements and component integrations will continue as the migration progresses.

An audit of the shadcn/ui components in `frontend/src/components/ui/` has been completed. The audited components include `button`, `calendar`, `card`, `chart`, `checkbox`, `DatePickerWithRange`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `switch`, and `textarea`. The implementations generally follow shadcn/ui documentation and best practices. A minor correction was made to `frontend/src/components/ui/chart.tsx` to use a path alias (`@/lib/utils`) for the `cn` utility function instead of a relative import.
