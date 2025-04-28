# Turks and Caicos News Aggregator

## Project Overview

This project aims to build a centralized platform for accessing local news from the Turks and Caicos Islands (TCI). It achieves this by automatically scraping news articles from various local TCI news websites and consolidating them into a single, organized news feed. The platform provides users with tools to filter and explore the news, while providing administrators with backend control over the data sources.

**Welcome, New Contributors!** If you're new to this project, start by reading this README thoroughly. It provides a comprehensive overview, guides you through the setup process, and points you to other important documentation files like the [Project Progress Log](./PROGRESS.md) and the [Database Schema](./db/schema.sql).

## Current Status

**Note:** This section and the "Implemented Functionality" and "Next Steps" sections should be updated regularly to reflect the current state and plan of the project. Refer to the [Project Progress Log](./PROGRESS.md) for detailed updates and task checklists.

The project has largely completed the migration of the frontend from Next.js to Astro. The new Astro frontend (`frontend/`) uses React components as Astro Islands, styled with Tailwind CSS and Shadcn UI. The backend remains Node.js with Express.js and connects to a PostgreSQL database. Significant progress has been made on both frontend migration and backend enhancements, including AI integration for summaries, tags, and images, and robust API endpoints for scraping and data management. The main news feed, article detail page, and the administrative settings page are functional in the new Astro frontend.

## Technology Stack

*   **Backend:** Node.js, Express.js, PostgreSQL
*   **Frontend:** Astro, React, TypeScript, Tailwind CSS, Shadcn UI
*   **Scraping:** Firecrawl MCP Server, Open-Source (Puppeteer)
*   **AI Summaries & Tags:** Groq SDK (LLM API Integration)
*   **AI Image Generation:** Ideogram API

## Project Structure

```
/
├── backend/                  # Backend application code
│   ├── package.json          # Backend dependencies (Node.js, Express, pg)
│   └── src/
│       ├── index.js          # Main backend application file (API routes)
│       ├── opensourceScraper.js # Open-source scraping logic (Puppeteer)
│       └── scraper.js        # Logic for scraping (integration with Firecrawl MCP and open-source)
├── db/                       # Database related files
│   └── schema.sql            # PostgreSQL database schema definition - see [Database Schema](./db/schema.sql) for details
├── docs/                     # Project documentation files
│   ├── README.md             # Main documentation index
│   ├── backend-setup.md      # Backend setup and configuration guide
│   ├── scraping-methods.md   # Details on scraping methods
│   ├── css-selectors.md      # Guide to using CSS selectors
│   ├── admin-ui.md           # Documentation for Admin UI features
│   └── troubleshooting.md    # Troubleshooting common issues
├── frontend/                 # Frontend application code (Mixed Next.js and Astro during migration)
│   ├── .gitignore
│   ├── package.json          # Frontend dependencies (Astro, React, Tailwind, Shadcn, Next.js)
│   ├── README.md
│   ├── astro.config.mjs      # Astro configuration
│   ├── components.json       # Shadcn UI configuration
│   ├── tsconfig.json         # TypeScript configuration for the frontend
│   ├── public/               # Static assets
│   │   ├── favicon.svg
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── logo.png
│   │   └── window.svg
│   └── src/                  # Frontend source files (Mixed Next.js and Astro)
│       ├── assets/           # Astro assets
│       │   ├── astro.svg
│       │   └── background.svg
│       ├── components/       # Reusable React components (migrated)
│       │   ├── ui/           # Shadcn UI components
│       │   │   ├── button.tsx
│       │   │   ├── calendar.tsx
│       │   │   ├── card.tsx
│       │   │   ├── chart.tsx
│       │   │   ├── checkbox.tsx
│       │   │   ├── DatePickerWithRange.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── dropdown-menu.tsx
│       │   │   ├── input.tsx
│       │   │   ├── label.tsx
│       │   │   ├── popover.tsx
│       │   │   ├── select.tsx
│       │   │   ├── switch.tsx
│       │   │   └── textarea.tsx
│       │   ├── ArticleDetail.tsx
│       │   ├── Footer.tsx
│       │   ├── Header.tsx
│       │   ├── IndexPage.tsx
│       │   ├── ModeToggle.tsx
│       │   ├── NewsFeed.tsx
│       │   ├── SettingsPage.tsx
│       │   └── Welcome.astro
│       │   └── charts/
│       │       ├── ArticlesPerSourceBarChart.tsx
│       │       └── ArticlesPerYearAreaChart.tsx
│       ├── layouts/          # Astro layouts
│       │   ├── BaseLayout.astro # Base layout for pages
│       │   └── Layout.astro
│       ├── lib/              # Utility functions
│       │   ├── nav-items.ts
│       │   └── utils.ts      # Shadcn UI utils
│       ├── pages/            # Astro pages (file-based routing)
│       │   ├── index.astro   # Home page (News Feed)
│       │   ├── settings.astro # Settings/Admin page
│       │   └── article/      # Article detail pages
│       │       └── [id].astro
│       └── styles/           # Global styles (Tailwind)
│           └── global.css
├── .gitignore
├── package.json              # Root package.json (if any workspace setup)
├── PROGRESS.md               # Project progress log - see [Project Progress Log](./PROGRESS.md) for details
└── README.md                 # This file
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
*   **Database Name:** `hoffma24_mangonews`
*   **Username:** `hoffma24_mangoadmin`
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
