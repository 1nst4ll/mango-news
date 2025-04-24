# Turks and Caicos News Aggregator

## Project Overview

This project aims to build a centralized platform for accessing local news from the Turks and Caicos Islands (TCI). It achieves this by automatically scraping news articles from various local TCI news websites and consolidating them into a single, organized news feed. The platform provides users with tools to filter and explore the news, while providing administrators with backend control over the data sources.

**Welcome, New Contributors!** If you're new to this project, start by reading this README thoroughly. It provides a comprehensive overview, guides you through the setup process, and points you to other important documentation files like the [Project Progress Log](./PROGRESS.md) and the [Database Schema](./db/schema.sql).

## Current Status

**Note:** This section and the "Implemented Functionality" and "Next Steps" sections should be updated regularly to reflect the current state and plan of the project. Refer to the [Project Progress Log](./PROGRESS.md) for detailed updates and task checklists.

The project is currently undergoing a migration of the frontend from Next.js to Astro. The new Astro frontend project structure has been set up, and core components are being migrated and restyled using React, Tailwind CSS, and Shadcn UI. The backend remains Node.js with Express.js and connects to a PostgreSQL database. The article detail page and the administrative interface for managing sources are being migrated.

## Technology Stack

*   **Backend:** Node.js, Express.js, PostgreSQL
*   **Frontend:** Astro, React, TypeScript, Tailwind CSS, Shadcn UI
*   **Scraping:** Firecrawl MCP Server, Open-Source (Puppeteer)
*   **AI Summaries:** LLM API Integration (pending)

## Project Structure

```
/
├── backend/                  # Backend application code
│   ├── package.json          # Backend dependencies (Node.js, Express, pg)
│   └── src/
│       ├── index.js          # Main backend application file (API routes)
│       ├── opensourceScraper.js # Open-source scraping logic (Puppeteer)
│       └── scraper.js        # Logic for scraping (integration with Firecrawl MCP outlined)
├── db/                       # Database related files
│   └── schema.sql            # PostgreSQL database schema definition - see [Database Schema](./db/schema.sql) for details
├── docs/                     # Project documentation files
│   ├── README.md             # Main documentation index
│   ├── backend-setup.md      # Backend setup and configuration guide
│   ├── scraping-methods.md   # Details on scraping methods
│   ├── css-selectors.md      # Guide to using CSS selectors
│   ├── admin-ui.md           # Documentation for Admin UI features
│   └── troubleshooting.md    # Troubleshooting common issues
├── astro-frontend/           # New Frontend application code (Astro)
│   ├── .gitignore
│   ├── astro.config.mjs      # Astro configuration
│   ├── components.json       # Shadcn UI configuration
│   ├── package.json          # Frontend dependencies (Astro, React, Tailwind, Shadcn)
│   ├── README.md
│   ├── tsconfig.json         # TypeScript configuration for the frontend
│   ├── public/               # Static assets
│   │   └── ... (migrated assets)
│   └── src/                  # Frontend source files
│       ├── assets/           # Astro assets
│       ├── components/       # Reusable React components (migrated)
│       │   ├── ui/           # Shadcn UI components
│       │   │   └── ... (added components)
│       │   └── ... (migrated components like Header, NewsFeed, Footer, ArticleDetail, SettingsPage)
│       ├── layouts/          # Astro layouts
│       │   └── BaseLayout.astro # Base layout for pages
│       ├── lib/              # Utility functions
│       │   └── utils.ts      # Shadcn UI utils
│       ├── pages/            # Astro pages (file-based routing)
│       │   ├── index.astro   # Home page (News Feed)
│       │   ├── article/      # Article detail pages
│       │   │   └── [id].astro
│       │   └── settings.astro # Settings/Admin page
│       └── styles/           # Global styles (Tailwind)
│           └── global.css
├── frontend/                 # Old Frontend application code (Next.js) - Will be removed after migration
│   └── ... (existing Next.js files)
├── .gitignore
└── PROGRESS.md               # Project progress log - see [Project Progress Log](./PROGRESS.md) for details
```
This structure separates the backend, database, and frontend concerns into distinct directories. The `astro-frontend` directory now contains the new Astro-based frontend project. The old `frontend` directory is kept for reference during the migration and will be removed later.

## Implemented Functionality

*   **Database Schema:** The database schema is defined in [`db/schema.sql`](./db/schema.sql), including tables for `sources`, `articles`, ``topics`, and `article_topics` to store news data and relationships.
*   **Backend API (`backend/src/index.js`):**
    *   Configured connection to the PostgreSQL database using the details provided in the "Database Details" section.
    *   Implemented REST API endpoints for managing news sources:
        *   `GET /api/sources`: Retrieve a list of all news sources.
        *   `POST /api/sources`: Add a new news source.
        *   `PUT /api/sources/:id`: Update an existing news source.
        *   `DELETE /api/sources/:id`: Remove a news source.
    *   Implemented an API endpoint for fetching news articles:
        *   `GET /api/articles`: Retrieve a list of articles, with filtering by topic, start date, and end date supported via query parameters (`?topic=`, `?startDate=`, `?endDate=`).
    *   Implemented an API endpoint for fetching a single article by ID:
        *   `GET /api/articles/:id`: Retrieve a single article by its ID.
    *   Implemented an API endpoint for fetching available topics:
        *   `GET /api/topics`: Retrieve a list of all topics.
    *   Added endpoint `POST /api/scrape/run` to trigger a full scrape of all active sources.
    *   Added endpoint `POST /api/scrape/run/:sourceId` to trigger a scrape for a specific source.
    *   Added endpoint `POST /api/articles/purge` to delete all articles, topics, and article links from the database.
    *   Implemented PostgreSQL database persistence for sources, replacing the in-memory data store.
    *   Added API endpoints for triggering a full scraper run (`POST /api/scrape/run`) and purging articles (`POST /api/articles/purge`).
*   **Frontend UI (`astro-frontend/`):**
    *   The frontend is being migrated to Astro with React, Tailwind CSS, and Shadcn UI, providing a modern and type-safe development environment.
    *   Uses Astro's file-based routing.
    *   The main news feed page (`src/pages/index.astro`) has been created and includes the migrated `NewsFeed` React component as a client-side island.
    *   The article detail page (`src/pages/article/[id].astro`) has been created with dynamic routing and includes the migrated `ArticleDetail` React component as a client-side island.
    *   The settings/admin page (`src/pages/settings.astro`) has been created and includes the migrated `SettingsPage` React component as a client-side island.
    *   Core React components (`Header`, `NewsFeed`, `Footer`, `ArticleDetail`, `SettingsPage`) have been copied and are being adapted for the Astro environment and restyled with Tailwind CSS and Shadcn UI.
    *   A base Astro layout (`src/layouts/BaseLayout.astro`) has been created.
    *   Static assets from the old frontend have been copied.

## Database Details

*   **Type:** PostgreSQL
*   **Host:** `localhost`
*   **Database Name:** `hoffma24_mangonews`
*   **Username:** `hoffma24_mangoadmin`
*   **Password:** `your_password`

## Setup Instructions

To get the project up and running on your local machine, follow these steps:

1.  **Clone the repository:** (Instructions will be added later - replace with actual clone command)
2.  **Database Setup:**
    *   Ensure you have access to the PostgreSQL database using the details provided above.
    *   The schema defined in [`db/schema.sql`](./db/schema.sql) has been applied to the database.
3.  **Backend Setup:**
    *   Navigate to the `backend` directory in your terminal: `cd backend`
    *   Install backend dependencies: `npm install`
    *   Ensure the database connection details in `backend/src/index.js` and `backend/src/scraper.js` are correct (currently set to `news.hoffmanntci.com`). You might consider using environment variables for sensitive information like database credentials in a production environment.
4.  **Frontend Setup (Astro):**
    *   Navigate to the `astro-frontend` directory in your terminal: `cd astro-frontend`
    *   Install frontend dependencies: `npm install`
    *   Initialize shadcn/ui by running `npx shadcn@latest init` and following the prompts.
5.  **Firecrawl MCP Server:**
    *   Ensure the Firecrawl MCP server is running and accessible. The backend will need to communicate with it for scraping. Specific integration steps are pending.
6.  **LLM API:**
    *   Integration with an LLM for AI summaries is pending. You will need to choose an LLM provider and configure the backend to interact with its API.

## Running the Project

*   **Start Backend:** Open a terminal, navigate to the `backend` directory, and run:
    ```bash
    npm start
    # or for development with auto-restarts:
    # npm run dev
    ```
    The backend API will typically run on `http://localhost:3000`.
*   **Start Frontend (Astro):** Open a separate terminal, navigate to the `astro-frontend` directory, and run:
    ```bash
    npm run dev
    ```
    The Astro frontend development server will start, usually on `http://localhost:4321` (Astro default). Open this URL in your web browser to access the news aggregator UI.

## How to Contribute

We welcome contributions to the Turks and Caicos News Aggregator project!

1.  **Understand the Project:** Start by reading this `README.md` for a high-level overview and the [Project Progress Log](./PROGRESS.md) for detailed status, completed tasks, and the development plan. Review the [Database Schema](./db/schema.sql) to understand the data structure.
2.  **Find a Task:** Look at the "Pending Tasks Checklist" and "Detailed Steps for Pending Tasks" in the [Project Progress Log](./PROGRESS.md) to find a task to work on.
3.  **Set up Your Environment:** Follow the "Setup Instructions" in this README to get the project running locally.
4.  **Implement Your Changes:** Write code to complete your chosen task.
5.  **Update Documentation:** **Crucially, update the `README.md` and `PROGRESS.md` files to reflect your completed work.** Mark tasks as completed in the checklists, update the "Implemented Functionality" and "Next Steps" sections, and add a new entry to the "Project Progress Log" with the details of your contribution. Follow the "Documentation Guidelines" to ensure consistency and cross-referencing.
6.  **Submit a Pull Request:** (Instructions for submitting pull requests will be added later - standard Git workflow applies).

By following these steps and keeping the documentation updated, you help ensure the project remains maintainable and easy for others to contribute to.

## Documentation Guidelines

This project includes multiple documentation files to provide comprehensive information. To ensure consistency and avoid repetition, please follow these guidelines:

*   **README.md:** Provides a high-level overview of the project, its purpose, technology stack, and basic setup/running instructions. It should be the starting point for anyone new to the project.
*   **PROGRESS.md:** Tracks the development progress with a detailed log of completed tasks, pending tasks (checklists), project phases, and detailed steps for the current phase. This file is for tracking development progress over time.
*   **db/schema.sql:** Contains the detailed database schema definition.

When updating documentation, use cross-referencing links (e.g., `[Link Text](./path/to/file)`) to refer to related information in other files instead of repeating content. Ensure each file focuses on its specific purpose as outlined above.

## License

(License information will be added later)
