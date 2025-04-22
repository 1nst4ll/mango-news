# Turks and Caicos News Aggregator

## Project Overview

This project aims to build a centralized platform for accessing local news from the Turks and Caicos Islands (TCI). It achieves this by automatically scraping news articles from various local TCI news websites and consolidating them into a single, organized news feed. The platform provides users with tools to filter and explore the news, while providing administrators with backend control over the data sources.

**Welcome, New Contributors!** If you're new to this project, start by reading this README thoroughly. It provides a comprehensive overview, guides you through the setup process, and points you to other important documentation files like the [Project Progress Log](./PROGRESS.md) and the [Database Schema](./db/schema.sql).

## Current Status

**Note:** This section and the "Implemented Functionality" and "Next Steps" sections should be updated regularly to reflect the current state and plan of the project. Refer to the [Project Progress Log](./PROGRESS.md) for detailed updates and task checklists.

The initial project structure has been set up, and core components for the backend API and frontend UI have been created. The frontend has been migrated to Next.js with React, Tailwind CSS, Lucide React, and Shadcn UI, and uses the App Router for navigation. The backend uses Node.js with Express.js and connects to a PostgreSQL database. The article detail page and the administrative interface for managing sources have been implemented.

## Technology Stack

*   **Backend:** Node.js, Express.js, PostgreSQL
*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Lucide React, Shadcn UI
*   **Scraping:** Firecrawl MCP Server, Open-Source (Puppeteer)
*   **AI Summaries:** LLM API Integration (pending)

## Project Structure

```
/
├── backend/                  # Backend application code
│   ├── package.json          # Backend dependencies (Node.js, Express, pg)
│   └── src/
│       ├── index.js          # Main backend application file (API routes)
│       └── scraper.js        # Logic for scraping (integration with Firecrawl MCP outlined)
├── db/                       # Database related files
│   └── schema.sql            # PostgreSQL database schema definition - see [Database Schema](./db/schema.sql) for details
├── frontend/                 # Frontend application code (Next.js)
│   ├── public/               # Static assets
│   ├── src/                  # Frontend source files
│   │   ├── app/              # App Router pages and layout
│   │   │   ├── article/[id]/ # Article detail page
│   │   │   │   └── page.tsx
│   │   │   ├── admin/        # Admin dashboard page
│   │   │   │   ├── sources/  # Source management page
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css   # Global styles (Tailwind)
│   │   │   └── layout.tsx    # Root layout
│   │   │   └── page.tsx      # Home page (News Feed)
│   │   ├── components/       # Reusable React components
│   │   │   └── ui/           # Shadcn UI components
│   │   │       └── button.tsx
│   │   │   ├── ArticleDetail.tsx # Component to display a single news article (used in app/article/[id]/page.tsx)
│   │   │   ├── DateRangeFilter.tsx # Component for filtering news by date range (used in app/page.tsx)
│   │   │   ├── NewsFeed.tsx    # Component to display news articles (used in app/page.tsx)
│   │   │   ├── SourceManagement.tsx # Component for managing sources (used in app/admin/sources/page.tsx)
│   │   │   └── TopicFilter.tsx # Component for filtering news by topic (used in app/page.tsx)
│   │   └── lib/              # Utility functions
│   │       └── utils.ts      # Shadcn UI utils
│   ├── .gitignore
│   ├── components.json       # Shadcn UI configuration
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── package.json          # Frontend dependencies (Next.js, React, Tailwind, Lucide, Shadcn)
│   ├── postcss.config.mjs
│   ├── README.md
│   └── tsconfig.json         # TypeScript configuration for the frontend
├── frontend_bak/             # Backup of the previous frontend
├── .gitignore
├── PROGRESS.md               # Project progress log - see [Project Progress Log](./PROGRESS.md) for details
└── README.md                 # Project overview and main documentation
```
This structure separates the backend, database, and frontend concerns into distinct directories. The `frontend` directory now follows the Next.js App Router convention.

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
*   **Scraping Logic (`backend/src/scraper.js`):**
    *   Implemented logic to fetch active sources from the database.
    *   Uses Firecrawl's `extract` format on source main pages to discover article links.
    *   Scrapes individual article pages using Firecrawl's `scrapeUrl` with `onlyMainContent: true`.
    *   Includes post-processing logic to clean up unwanted header/footer text and related article links from the scraped markdown content.
    *   Integrated Groq SDK for AI summary generation with content truncation to avoid API limits.
    *   Includes basic scheduling using `node-cron`.
*   **Frontend UI (`frontend/`):**
    *   The frontend has been migrated to Next.js with React, Tailwind CSS, Lucide React, and Shadcn UI, providing a modern and type-safe development environment.
    *   Uses the Next.js App Router for navigation.
    *   The main news feed is located at `/` (`frontend/src/app/page.tsx`).
    *   Article details are at `/article/[id]` (`frontend/src/app/article/[id]/page.tsx`).
    *   The admin dashboard is at `/admin` (`frontend/src/app/admin/page.tsx`).
    *   Source management is at `/admin/sources` (`frontend/src/app/admin/sources/page.tsx`).
    *   Core components (`NewsFeed`, `TopicFilter`, `DateRangeFilter`, `ArticleDetail`, `AdminDashboard`, `SourceManagement`) have been adapted and placed in the `frontend/src/components/` directory.
    *   Basic styling is applied using Tailwind CSS.

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
4.  **Frontend Setup:**
    *   Navigate to the `frontend` directory in your terminal: `cd frontend`
    *   Install frontend dependencies: `npm install`
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
*   **Start Frontend:** Open a separate terminal, navigate to the `frontend` directory, and run:
    ```bash
    npm run dev
    ```
    The frontend development server will start, usually on `http://localhost:3000` (Next.js default). Open this URL in your web browser to access the news aggregator UI.

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
