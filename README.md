# Provides a comprehensive overview of the project, setup instructions, and links to other documentation.
# Turks and Caicos News Aggregator

## Project Overview

This project aims to build a centralized platform for accessing local news from the Turks and Caicos Islands (TCI). It achieves this by automatically scraping news articles from various local TCI news websites and consolidating them into a single, organized news feed. The platform provides users with tools to filter and explore the news, while providing administrators with backend control over the data sources.

**Welcome, New Contributors!** If you're new to this project, start by reading this README thoroughly. It provides a comprehensive overview, guides you through the setup process, and points you to other important documentation files like the [Project Progress Log](./PROGRESS.md) and the [Database Schema](./db/schema.sql).

## Current Status

**Note:** This section and the "Implemented Functionality" and "Next Steps" sections should be updated regularly to reflect the current state and plan of the project. Refer to the [Project Progress Log](./PROGRESS.md) for detailed updates and task checklists.

The project has largely completed the migration of the frontend from Next.js to Astro. The new Astro frontend (`frontend/`) uses React components as Astro Islands, styled with Tailwind CSS and Shadcn UI. The backend remains Node.js with Express.js and connects to a PostgreSQL database. Significant progress has been made on both frontend migration and backend enhancements, including AI integration for summaries, tags, and images, and robust API endpoints for scraping and data management. The main news feed, article detail page, and the administrative settings page are functional in the new Astro frontend. Both the frontend and backend are configured for deployment as Web Services on Render. The project documentation, including the `README.md`, `PROGRESS.md`, and files in the `docs/` directory, has been audited and updated to reflect the current project state, with enhanced details for deployment on Render.

## Technology Stack

*   **Backend:** Node.js, Express.js, PostgreSQL
*   **Frontend:** Astro, React, TypeScript, Tailwind CSS, Shadcn UI
*   **Scraping:** Firecrawl MCP Server, Open-Source (Puppeteer)
*   **AI Summaries & Tags:** Groq SDK (LLM API Integration)
*   **AI Image Generation:** Ideogram API

## Project Structure

```text
.
|   .gitignore              # Specifies intentionally untracked files that Git should ignore.
|   PROGRESS.md             # Tracks project development progress and completed tasks.
|   README.md               # Provides a comprehensive overview of the project.
|
+---backend                 # Contains the backend Node.js application.
|   |   .env                # Environment variables for the backend (local configuration).
|   |   .env.example        # Example environment variables for the backend.
|   |   .env.render         # Environment variables for Render deployment.
|   |   .puppeteerrc.cjs    # Configuration file for Puppeteer.
|   |   package.json        # Lists backend dependencies and scripts.
|   |
|   \---src                 # Backend source code files.
|           index.js          # Main entry point for the backend application.
|           opensourceScraper.js # Logic for the open-source scraping method.
|           scraper.js        # Main scraping logic, including AI integration and scheduling.
|
+---db                      # Database related files.
|       local_sources_data.csv # Local data for news sources (potentially for initial seeding).
|       schema.sql          # Defines the database schema.
|
+---docs                    # Project documentation files.
|       admin-ui.md         # Documents the features and usage of the admin UI.
|       backend-setup.md    # Details backend setup and configuration.
|       css-selectors.md    # Provides guidance on using CSS selectors for scraping.
|       deployment.md       # Provides instructions for deploying the application.
|       frontend-ui.md      # Describes the frontend UI styling and stack.
|       README.md           # Index and overview of documentation files.
|       scraping-methods.md # Explains the different scraping methods used.
|       troubleshooting.md  # Lists common issues and their solutions.
|
\---frontend                # Contains the frontend Astro application.
    |   .env                # Environment variables for the frontend (local configuration).
    |   .env.example        # Example environment variables for the frontend.
    |   astro.config.mjs    # Configuration file for the Astro project.
    |   components.json     # Configuration for Shadcn UI components.
    |   package.json        # Lists frontend dependencies and scripts.
    |   README.md           # README file for the frontend project.
    |   tsconfig.json       # TypeScript configuration for the frontend.
    |
    +---public              # Static assets served directly.
    |       favicon.svg       # Website favicon.
    |       file.svg          # SVG icon.
    |       globe.svg         # SVG icon.
    |       logo.png          # Project logo image.
    |       window.svg        # SVG icon.
    |
    \---src                 # Frontend source code files.
        +---assets            # Static assets used in components.
        |       astro.svg         # Astro logo SVG.
        |       background.svg    # Background SVG image.
        |
        +---components        # Reusable UI components (React and Astro Islands).
        |   |   ArticleDetail.tsx # React component for displaying article details.
        |   |   footer.tsx        # React component for the website footer.
        |   |   Header.tsx        # React component for the website header.
        |   |   IndexPage.tsx     # React component for the main news feed page.
        |   |   ModeToggle.tsx    # React component for theme switching.
        |   |   NewsFeed.tsx      # React component for displaying the news feed.
        |   |   SettingsPage.tsx  # React component for the settings/admin page.
        |   |   Welcome.astro     # Example Astro component.
        |   |
        |   +---charts          # Chart components.
        |   |       ArticlesPerSourceBarChart.tsx # Bar chart for articles per source.
        |   |       ArticlesPerYearAreaChart.tsx # Area chart for articles per year.
        |   |
        |   \---ui              # Shadcn UI components.
        |           button.tsx        # Button component.
        |           calendar.tsx      # Calendar component.
        |           card.tsx          # Card component.
        |           chart.tsx         # Chart component wrapper.
        |           checkbox.tsx      # Checkbox component.
        |           DatePickerWithRange.tsx # Date picker component with range selection.
        |           dialog.tsx        # Dialog component.
        |           dropdown-menu.tsx # Dropdown menu component.
        |           input.tsx         # Input component.
        |           label.tsx         # Label component.
        |           popover.tsx       # Popover component.
        |           select.tsx        # Select component.
        |           switch.tsx        # Switch component.
        |           textarea.tsx      # Textarea component.
        |
        +---layouts           # Astro layout components.
        |       BaseLayout.astro  # Base layout with header and footer.
        |       Layout.astro      # Basic layout.
        |
        +---lib               # Utility functions and libraries.
        |       nav-items.ts      # Defines navigation items.
        |       utils.ts          # Utility functions (e.g., for Tailwind CSS).
        |
        +---pages             # Astro pages (file-based routing).
        |   |   index.astro       # Main index page (news feed).
        |   |   settings.astro    # Settings/admin page.
        |   |
        |   \---article         # Dynamic route for individual articles.
        |           [id].astro      # Displays a single article by ID.
        |
        \---styles            # Global styles.
                global.css        # Global CSS styles, including Tailwind imports.
```
This structure separates the backend, database, and frontend concerns into distinct directories. The `frontend` directory now primarily contains the Astro-based frontend project. Any remaining legacy Next.js files are intended for removal.

## Implemented Functionality

*   **Database Schema:** The database schema is defined in [`db/schema.sql`](./db/schema.sql), including tables for `sources`, `articles`, `topics`, and `article_topics`. The `sources` table includes fields for `article_link_template` and `exclude_patterns` to control URL discovery and filtering, and `scraping_method` to specify the scraping engine.
*   **Backend API (`backend/src/index.js`):**
    *   Configured connection to the PostgreSQL database.
    *   Implemented REST API endpoints for managing news sources (`GET`, `POST`, `PUT`, `DELETE /api/sources`, `GET /api/sources/:id`).
    *   Implemented API endpoints for fetching news articles (`GET /api/articles` with filtering), fetching a single article (`GET /api/articles/:id`), and fetching available topics (`GET /api/topics`).
    *   Added endpoints to trigger scraper runs (`POST /api/scrape/run` for all sources, `POST /api/scrape/run/:sourceId` for a specific source). These endpoints accept optional parameters to override global AI settings.
    *   Added an endpoint to discover sources (`GET /api/discover-sources`).
    *   Added endpoints to purge articles (`POST /api/articles/purge` for all, `POST /api/articles/purge/:sourceId` for a source).
    *   Added an endpoint to get database statistics (`GET /api/stats`).
    *   Implemented PostgreSQL database persistence for sources, articles, and topics.
    *   Added support for defining article link templates and exclusion patterns per source.
    *   Implemented logic to select the appropriate scraping method (Firecrawl or open-source) based on the source's configuration.
    *   Integrated AI using Groq SDK for **AI Topic Assignment** (assigning exactly 3 relevant topics) and **AI Summary Generation** (optimized for SEO).
    *   Implemented **AI Image Generation** using the Ideogram API when no thumbnail is found.
    *   Implemented logic to parse **Relative Date Formats** (e.g., "x days ago") into absolute timestamps.
    *   Implemented global toggles for AI summary, tag, and image generation in the scraper.
*   **Frontend UI (`frontend/` - Astro):**
    *   The frontend has been migrated to Astro with React, Tailwind CSS, and Shadcn UI.
    *   Uses Astro's file-based routing (`src/pages/`).
    *   The main news feed page (`src/pages/index.astro`) is functional, displaying articles and including components for topic filtering, date range filtering, search, and category tabs.
    *   The article detail page (`src/pages/article/[id].astro`) is functional, displaying full article content.
    *   The settings/admin page (`src/pages/settings.astro`) is functional, combining the Admin Dashboard and Source Management features. It includes database statistics display (with charts), buttons to trigger scraping/purging, source discovery, and a comprehensive interface for adding/editing sources (including fields for scraping method, link template, exclude patterns, and AI toggles for summary, tags, and images).
    *   Core React components (`Header`, `NewsFeed`, `Footer`, `ArticleDetail`, `SettingsPage`, charts) have been migrated and adapted for Astro Islands, styled with Tailwind CSS and integrated with Shadcn UI components.
    *   A base Astro layout (`src/layouts/BaseLayout.astro`) is used.
    *   Static assets are located in `public/`.
    *   A persistent header with navigation links (`src/lib/nav-items.ts`) and a theme switcher is present across main pages.
    *   A comprehensive footer component is included.
    *   NewsFeed cards display images, topics, and source type indicators.
    *   Improved loading and empty states styling.
    *   Frontend logic for Source Discovery is implemented and functional.
    *   Frontend styling is consistent with the defined aesthetic, leveraging the configured color palette and typography.
    *   Traces of the old Next.js framework have been removed from the Astro frontend codebase.

## Database Details

*   **Type:** PostgreSQL
*   **Host:** `localhost`
*   **Database Name:** `mangonews`
*   **Username:** `mangoadmin`
*   **Password:** `See backend/.env`

## Setup Instructions

To get the project up and running on your local machine, follow these steps:

1.  **Clone the repository:** `git clone <repository_url>` (Replace `<repository_url>` with the actual repository URL)
2.  **Database Setup:**
    *   Ensure you have access to the PostgreSQL database using the details provided above.
    *   Apply the schema defined in [`db/schema.sql`](./db/schema.sql) to your database.
3.  **Backend Setup:**
    *   Navigate to the `backend` directory in your terminal: `cd backend`
    *   Install backend dependencies: `npm install`
    *   Copy the example environment file: `cp .env.example .env`
    *   Edit the newly created `.env` file and fill in your database credentials and API keys.
    *   Ensure the database connection details are correctly set in the `backend/.env` file. The application code should prioritize environment variables for database connection.
4.  **Frontend Setup (Astro):**
    *   Navigate to the `frontend` directory in your terminal: `cd frontend`
    *   Install frontend dependencies: `npm install`
    *   Copy the example environment file: `cp .env.example .env`
    *   Edit the newly created `.env` file and fill in the `PUBLIC_BACKEND_API_URL`. (Shadcn UI components are already included in the repository, initialization is not typically needed after cloning).
5.  **Firecrawl MCP Server:**
    *   Ensure the Firecrawl MCP server is running and accessible. The backend will need to communicate with it for scraping. Configure the `FIRECRAWL_API_KEY` in `backend/.env`. Specific integration steps are outlined in the [Scraping Methods documentation](./docs/scraping-methods.md).
6.  **LLM API (Groq):**
    *   Ensure you have a Groq API key and configure it in the backend environment variables (`backend/.env`). Details on AI integration are in the [Scraping Methods documentation](./docs/scraping-methods.md).

## Running the Project

*   **Start Backend:** Open a terminal, navigate to the `backend` directory, and run:
    ```bash
    npm start
    # or for development with auto-restarts:
    # npm run dev
    ```
    The backend API will typically run on `http://localhost:3000`.
*   **Start Frontend (Astro):** Open a separate terminal, navigate to the `frontend` directory, and run:
    ```bash
    npm run dev
    ```
    The Astro frontend development server will start, usually on `http://localhost:4321` (Astro default). Open this URL in your web browser to access the news aggregator UI.

## How to Contribute

We welcome contributions to the Turks and Caicos News Aggregator project!

1.  **Understand the Project:** Start by reading this `README.md` for a high-level overview and the [Project Progress Log](./PROGRESS.md) for detailed status, completed tasks, and the development plan. Review the [Database Schema](./db/schema.sql) to understand the data structure. Explore the documentation files in the `docs/` directory for more specific information.
2.  **Find a Task:** Look at the "Pending Tasks Checklist" and "Detailed Steps for Pending Tasks" in the [Project Progress Log](./PROGRESS.md) to find a task to work on.
3.  **Set up Your Environment:** Follow the "Setup Instructions" in this README to get the project running locally.
4.  **Implement Your Changes:** Write code to complete your chosen task.
5.  **Update Documentation:** **Crucially, update the `README.md`, `PROGRESS.md`, and any relevant files in the `docs/` directory to reflect your completed work.** Mark tasks as completed in the checklists, update the "Implemented Functionality" and "Next Steps" sections, and add a new entry to the "Project Progress Log" with the details of your contribution. Follow the "Documentation Guidelines" to ensure consistency and cross-referencing.
6.  **Submit a Pull Request:** (Instructions for submitting pull requests will be added later - standard Git workflow applies).

By following these steps and keeping the documentation updated, you help ensure the project remains maintainable and easy for others to contribute to.

## Documentation Guidelines

This project includes multiple documentation files to provide comprehensive information. To ensure consistency and avoid repetition, please follow these guidelines:

*   **README.md:** Provides a high-level overview of the project, its purpose, technology stack, and basic setup/running instructions. It should be the starting point for anyone new to the project.
*   **PROGRESS.md:** Tracks the development progress with a detailed log of completed tasks, pending tasks (checklists), project phases, and detailed steps for the current phase. This file is for tracking development progress over time.
*   **db/schema.sql:** Contains the detailed database schema definition.
*   **docs/README.md:** Provides an index and brief overview of the documentation files within the `docs/` directory.
*   **docs/backend-setup.md:** Details backend setup, configuration, and environment variables.
*   **docs/scraping-methods.md:** Explains the different scraping methods used (Firecrawl and open-source) and their configuration, including AI integration details.
*   **docs/css-selectors.md:** Provides guidance on identifying and using CSS selectors for scraping.
*   **docs/admin-ui.md:** Documents the features and usage of the combined Admin Dashboard and Source Management page.
*   **docs/troubleshooting.md:** Lists common issues and their solutions.
*   **docs/deployment.md:** Provides instructions for deploying the application.

When updating documentation, use cross-referencing links (e.g., `[Link Text](./path/to/file)`) to refer to related information in other files instead of repeating content. Ensure each file focuses on its specific purpose as outlined above.

## License

(License information will be added later)
