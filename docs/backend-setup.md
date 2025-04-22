# Backend Setup and Configuration

This document guides you through setting up and configuring the Mango News backend.

## Prerequisites

- Node.js installed
- npm or yarn installed
- A database system (e.g., SQLite, PostgreSQL, MySQL)

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

3.  **Database Setup:**
    - Ensure your database server is running.
    - Update the database connection configuration in `backend/src/index.js` (or a dedicated configuration file if one exists) to match your database credentials and settings.
    - Run the database schema migration to create the necessary tables:
      ```bash
      # Depending on your database library and setup, this command may vary.
      # Refer to your database library's documentation for specific instructions.
      # Example (using a hypothetical migration tool):
      # npm run migrate up
      ```
      *Note: The current schema is defined in `db/schema.sql`.*

4.  **Environment Variables:**
    - Create a `.env` file in the `backend` directory.
    - Add necessary environment variables, such as database connection strings, API keys (e.g., for Firecrawl if used), and any other configuration settings your backend requires.
    ```dotenv
    # Example .env file
    DATABASE_URL=your_database_connection_string
    FIRECRAWL_API_KEY=your_firecrawl_api_key # If using Firecrawl
    # Add other environment variables as needed
    ```

5.  **Start the Backend Server:**
    ```bash
    npm start
    # or
    yarn start
    ```
    The backend server should now be running, typically on `http://localhost:3000` (check the backend code for the exact port).

## Configuration

- **Database Configuration:** Modify the database connection details directly in the backend code or through environment variables as implemented.
- **API Endpoints:** The main API endpoints are defined in `backend/src/index.js`. Refer to this file for available endpoints and their functionalities.
- **Scraping Configuration:** Scraping-specific configurations, such as default scraping methods or API keys, are handled within the backend code and potentially through environment variables.

---

Next: [Scraping Methods (Open Source and Firecrawl)](scraping-methods.md)
