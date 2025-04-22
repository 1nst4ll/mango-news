# Backend Setup and Configuration

This document guides you through setting up and configuring the Mango News backend.

## Prerequisites

- Node.js installed
- npm or yarn installed
- PostgreSQL database server running

## Setup Steps

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
    Ensure the `pg` package is installed for PostgreSQL connectivity.

3.  **Database Setup:**
    - Ensure your PostgreSQL database server is running.
    - The database schema is defined in `db/schema.sql`. This schema includes tables for `sources`, `articles`, `topics`, and `article_topics`. The `articles` table now includes columns for `publication_date` and `author`. Apply this schema to your PostgreSQL database. You can use the `psql` command-line tool:
      ```bash
      psql -h your_db_host -d your_db_name -U your_db_username -f ../db/schema.sql
      ```
      Replace `your_db_host`, `your_db_name`, and `your_db_username` with your PostgreSQL details. You will be prompted for the password.

4.  **Environment Variables:**
    - Create a `.env` file in the `backend` directory.
    - Add necessary environment variables for database connection and API keys:
    ```dotenv
    # Database Configuration
    DB_USER=your_db_username
    DB_HOST=your_db_host
    DB_NAME=your_db_name
    DB_PASSWORD=your_db_password
    DB_PORT=5432 # Default PostgreSQL port

    # Firecrawl API Key (if using Firecrawl scraping)
    FIRECRAWL_API_KEY=your_firecrawl_api_key

    # Add other environment variables as needed
    ```
    Replace placeholder values with your actual database credentials and API keys.

5.  **Start the Backend Server:**
    ```bash
    npm start
    # or for development with auto-restarts:
    # npm run dev
    ```
    The backend server should now be running, typically on `http://localhost:3000` (check the backend code for the exact port).

## Configuration

- **Database Configuration:** Database connection details are configured using environment variables in the `.env` file.
- **API Endpoints:** The main API endpoints are defined in `backend/src/index.js`. Refer to this file for available endpoints and their functionalities, including source management (`/api/sources`), article fetching (`/api/articles`, `/api/articles/:id`), topic fetching (`/api/topics`), triggering scrapes (`/api/scrape/run`, `/api/scrape/run/:id`), source discovery (`/api/discover-sources`), and purging articles (`/api/articles/purge`).
- **Scraping Configuration:** Scraping methods (Open Source or Firecrawl) are configured per source in the [Admin UI (Source Management section)](admin-ui.md#source-management) and stored in the database. Firecrawl requires the `FIRECRAWL_API_KEY` environment variable.

---

Next: [Scraping Methods (Open Source and Firecrawl)](scraping-methods.md)
