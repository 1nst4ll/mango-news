# Frontend UI Styling

This document outlines the styling and UI design principles applied to the frontend of the Turks and Caicos News Aggregator, focusing on the main news feed and article detail pages.

## Technologies Used

*   **Tailwind CSS:** Used for utility-first styling, enabling rapid UI development and consistent design.
*   **Shadcn UI:** Provides pre-built, accessible UI components that are easily customizable with Tailwind.
*   **Custom Fonts:**
    *   **Heading Font:** 'Playfair Display', serif
    *   **Body Font:** 'Roboto', sans-serif
    *   **Fallback Sans-serif:** 'Inter', sans-serif
    *   **Fallback Serif:** 'Merriweather', serif
*   **Custom Color Palette:** (Defined in `frontend/tailwind.config.ts`)
    *   `brandPrimary`: #0056b3
    *   `brandSecondary`: #007bff
    *   `brandAccent`: #28a745
    *   `brandDark`: #343a40
    *   `brandLight`: #f8f9fa
    *   `brandInfo`: #17a2b8
    *   `brandWarning`: #ffc107
    *   `brandDanger`: #dc3545
    *   `brandSuccess`: #28a745

## News Feed Page (`frontend/src/app/page.tsx`)

The main news feed page utilizes a responsive grid layout to display news articles. Each article is presented within a Shadcn `Card` component, providing a structured and visually appealing container.

*   **Layout:** Articles are displayed in a grid with varying columns based on screen size (2 columns on medium screens, 3 columns on large screens and above).
*   **Article Card:**
    *   Uses the `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` components from Shadcn UI.
    *   Article titles use the custom `font-heading` class.
    *   Article summaries use the custom `font-body` class.
    *   Source links and "Read More" links use the `text-brandPrimary` color.
    *   Thumbnails are displayed with a fixed height and object-cover to maintain aspect ratio within the card.

## Article Detail Page (`frontend/src/app/article/[id]/page.tsx`)

The article detail page focuses on presenting the full article content in a clean and readable format.

*   **Layout:** The content is centered on the page with horizontal padding.
*   **Typography:**
    *   The article title uses the custom `font-heading` class and a large font size (`text-4xl`).
    *   Article metadata (source, author, dates) uses a smaller font size (`text-sm`) and muted foreground color (`text-muted-foreground`).
    *   The main article content is wrapped in an `<article>` tag with Tailwind's `prose` class applied, which provides sensible typography defaults for headings, paragraphs, lists, etc. The `lg:prose-xl` class increases the text size on larger screens.
    *   The custom `font-body` class is applied to the container of the raw content to ensure the body font is used.
*   **Images:** Article thumbnail images are displayed responsively with rounded corners and margin below.

## Custom Icons

(Details on custom icon integration will be added here once implemented.)

## Accessibility

Efforts have been made to ensure the UI is accessible, including:

*   Using semantic HTML.
*   Ensuring sufficient color contrast (based on the defined color palette).
*   Implementing basic responsiveness for different screen sizes.

Further accessibility improvements will be documented here as they are implemented.
