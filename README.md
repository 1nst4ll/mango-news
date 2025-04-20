# Turks and Caicos News Aggregator

## Project Overview

This project aims to build a centralized platform for accessing local news from the Turks and Caicos Islands (TCI). It achieves this by automatically scraping news articles from various local TCI news websites and consolidating them into a single, organized news feed. The platform provides users with tools to filter and explore the news, while providing administrators with backend control over the data sources.

**Welcome, New Contributors!** If you're new to this project, start by reading this README thoroughly. It provides a comprehensive overview, guides you through the setup process, and points you to other important documentation files like the [Project Progress Log](./PROGRESS.md) and the [Database Schema](./db/schema.sql).

## Current Status

**Note:** This section and the "Implemented Functionality" and "Next Steps" sections should be updated regularly to reflect the current state and plan of the project. Refer to the [Project Progress Log](./PROGRESS.md) for detailed updates and task checklists.

The initial project structure has been set up, and core components for the backend API and frontend UI have been created. The frontend uses Vite with React and TypeScript, styled with Tailwind CSS and DaisyUI. The backend uses Node.js with Express.js and connects to a PostgreSQL database.

## Technology Stack

*   **Backend:** Node.js, Express.js, PostgreSQL
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, DaisyUI
*   **Scraping:** Firecrawl MCP Server (integration pending)
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
├── frontend/                 # Frontend application code
│   ├── index.html            # Frontend entry point (HTML)
│   ├── package.json          # Frontend dependencies (React, Vite, TypeScript, Tailwind, DaisyUI)
│   ├── postcss.config.js     # PostCSS configuration for Tailwind
│   ├── tailwind.config.js    # Tailwind CSS configuration with DaisyUI plugin
│   ├── tsconfig.json         # TypeScript configuration for the frontend
│   ├── vite.config.ts        # Vite build tool configuration
│   └── src/                  # Frontend source files
│       ├── App.tsx           # Main frontend application component (React + TypeScript)
│       ├── index.css         # Tailwind CSS directives and global styles
│       ├── main.tsx          # Frontend entry point (renders App component)
│       └── components/       # Reusable React components
│           ├── NewsFeed.tsx    # Component to display news articles
│           └── TopicFilter.tsx # Component for filtering news by topic
└── README.md                 # Project overview and main documentation
```
This structure separates the backend, database, and frontend concerns into distinct directories.

## Implemented Functionality

*   **Database Schema:** The database schema is defined in [`db/schema.sql`](./db/schema.sql), including tables for `sources`, `articles`, ``topics`, and `article_topics` to store news data and relationships.
*   **Backend API (`backend/src/index.js`):**
    *   Configured connection to the PostgreSQL database using the provided credentials.
    *   Implemented REST API endpoints for managing news sources:
        *   `GET /api/sources`: Retrieve a list of all news sources.
        *   `POST /api/sources`: Add a new news source.
        *   `PUT /api/sources/:id`: Update an existing news source.
        *   `DELETE /api/sources/:id`: Remove a news source.
    *   Implemented an API endpoint for fetching news articles:
        *   `GET /api/articles`: Retrieve a list of articles, with basic filtering by topic supported via query parameters (`?topic=`).
    *   Implemented an API endpoint for fetching available topics:
        *   `GET /api/topics`: Retrieve a list of all topics.
*   **Scraping Logic (`backend/src/scraper.js`):**
    *   The basic structure for the news scraping process is outlined.
    *   Includes logic to fetch active sources from the database.
    *   Contains placeholder functions (`triggerScrapeTool`, `processScrapedData`, `generateAISummary`) indicating where integration with the Firecrawl MCP server and an LLM for AI summaries will be implemented. **Note:** Actual integration requires specific API or client library details for the Firecrawl MCP server and the chosen LLM, which are currently pending.
*   **Frontend UI (`frontend/src/`):**
    *   The frontend is set up using Vite, React, and TypeScript, providing a modern and type-safe development environment.
    *   Tailwind CSS and DaisyUI are configured for streamlined styling.
    *   `App.tsx`: The main application component that orchestrates the display of the news feed and filtering options.
    *   `NewsFeed.tsx`: A component responsible for fetching news articles from the backend API and rendering them in a list. It updates automatically when the selected topic changes.
    *   `TopicFilter.tsx`: A component that fetches available topics from the backend and provides a dropdown menu for users to filter the news feed by topic.

## Database Details

*   **Type:** PostgreSQL
*   **Host:** `news.hoffmanntci.com`
*   **Database Name:** `hoffma24_mangonews`
*   **Username:** `mango_admin`
*   **Password:** `o2,TC2Kz08pU`

## Setup Instructions

To get the project up and running on your local machine, follow these steps:

1.  **Clone the repository:** (Instructions will be added later - replace with actual clone command)
2.  **Database Setup:**
    *   Ensure you have access to the PostgreSQL database using the details provided above.
    *   Apply the schema defined in [`db/schema.sql`](./db/schema.sql) to your database. You can typically do this using a PostgreSQL client or command-line tools.
3.  **Backend Setup:**
    *   Navigate to the `backend` directory in your terminal: `cd backend`
    *   Install backend dependencies: `npm install`
    *   Ensure the database connection details in `backend/src/index.js` and `backend/src/scraper.js` are correct (currently set to `news.hoffmanntci.com`). You might consider using environment variables for sensitive information like database credentials in a production environment.
4.  **Frontend Setup:**
    *   Navigate to the `frontend` directory in your terminal: `cd frontend`
    *   Install frontend dependencies: `npm install`
    *   Tailwind CSS and DaisyUI are already configured based on `tailwind.config.js` and `postcss.config.js`.
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
    The frontend development server will start, usually on `http://localhost:5173`. Open this URL in your web browser to access the news aggregator UI.

## How to Contribute

We welcome contributions to the Turks and Caicos News Aggregator project!

1.  **Understand the Project:** Start by reading this `README.md` for a high-level overview and the [Project Progress Log](./PROGRESS.md) for detailed status, completed tasks, and the development plan. Review the [Database Schema](./db/schema.sql) to understand the data structure.
2.  **Find a Task:** Look at the "Pending Tasks Checklist" and "Detailed Steps for Pending Tasks" in the [Project Progress Log](./PROGRESS.md) to find a task to work on.
3.  **Set up Your Environment:** Follow the "Setup Instructions" in this README to get the project running locally.
4.  **Implement Your Changes:** Write code to complete your chosen task.
5.  **Test Your Changes:** Ensure your changes work as expected and don't introduce new issues.
6.  **Update Documentation:** **Crucially, update the `README.md` and `PROGRESS.md` files to reflect your completed work.** Mark tasks as completed in the checklists, update the "Implemented Functionality" and "Next Steps" sections, and add a new entry to the "Project Progress Log" with the details of your contribution. Follow the "Documentation Guidelines" to ensure consistency and cross-referencing.
7.  **Submit a Pull Request:** (Instructions for submitting pull requests will be added later - standard Git workflow applies).

By following these steps and keeping the documentation updated, you help ensure the project remains maintainable and easy for others to contribute to.

## Documentation Guidelines

This project includes multiple documentation files to provide comprehensive information. To ensure consistency and avoid repetition, please follow these guidelines:

*   **README.md:** Provides a high-level overview of the project, its purpose, technology stack, and basic setup/running instructions. It should be the starting point for anyone new to the project.
*   **PROGRESS.md:** Tracks the development progress with a detailed log of completed tasks, pending tasks (checklists), project phases, and detailed steps for the current phase. This file is for tracking development progress over time.
*   **db/schema.sql:** Contains the detailed database schema definition.

When updating documentation, use cross-referencing links (e.g., `[Link Text](./path/to/file)`) to refer to related information in other files instead of repeating content. Ensure each file focuses on its specific purpose as outlined above.

## License

(License information will be added later)
