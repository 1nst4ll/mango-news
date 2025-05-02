# Backend Setup and Configuration

This document guides you through setting up and configuring the backend for the Mango News application.

## Prerequisites

*   Node.js and npm installed.
*   Access to a PostgreSQL database.
*   A Groq API key for AI features (summaries and topic assignment).

## Database Setup

The backend connects to a PostgreSQL database.

1.  **Database Details:**
    *   **Type:** PostgreSQL
    *   **Host:** For local development, use `localhost`. For production, this will be your database server address (e.g., `news.hoffmanntci.com`).
    *   **Database Name:** `hoffma24_mangonews`
    *   **Username:** `hoffma24_mangoadmin`
    *   **Password:** This should be stored securely in your backend's `.env` file.

2.  **Apply Schema:** Apply the database schema defined in [`../db/schema.sql`](../db/schema.sql) to your PostgreSQL database.

## Backend Configuration

1.  **Navigate to Backend Directory:** Open your terminal and change to the backend directory:
    ```bash
    cd backend
    ```

2.  **Install Dependencies:** Install the required Node.js packages:
    ```bash
    npm install
    ```

3.  **Environment Variables:** Environment variables are used to configure the backend, especially for sensitive information like database credentials and API keys. An example file, `.env.example`, is provided in the `backend` directory.
    *   Copy the example file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the newly created `.env` file and fill in the required values:
        ```env
        # Database Configuration
        DB_HOST=localhost
        DB_NAME=hoffma24_mangonews
        DB_USER=hoffma24_mangoadmin
        DB_PASSWORD=your_database_password

        # API Keys
        GROQ_API_KEY=your_groq_api_key
        IDEOGRAM_API_KEY=your_ideogram_api_key

        # Firecrawl API Key (if needed directly by backend, otherwise handled by MCP)
        # FIRECRAWL_API_KEY=your_firecrawl_api_key
        ```
    Replace the placeholder values (`your_database_password`, `your_groq_api_key`, `your_ideogram_api_key`) with your actual credentials and keys.

4.  **Database Connection in Code:** The database connection details are configured in `backend/src/index.js` and `backend/src/scraper.js`. These files are configured to read the database password and other sensitive details from environment variables (e.g., using `process.env.DB_PASSWORD`, `process.env.DB_HOST`).

## Running the Backend

You can run the backend server in different modes:

*   **Production Mode:**
    ```bash
    npm start
    ```
    This will start the backend server, typically listening on port 3000.

*   **Development Mode:**
    ```bash
    npm run dev
    ```
    This mode uses `nodemon` to automatically restart the server whenever code changes are detected, which is convenient for development.

The backend API will be accessible at the address and port it is configured to listen on (defaulting to `http://localhost:3000` for local development).

## Further Documentation

*   [Server Deployment Instructions](../deployment.md)
*   [Scraping Methods (Open Source and Firecrawl)](./scraping-methods.md)
*   [Using CSS Selectors for Scraping](css-selectors.md)
*   [Settings Page (Admin Controls and Source Management)](admin-ui.md)
*   [Troubleshooting Common Issues](troubleshooting.md)

## Processing Missing AI Data

A new function, `processMissingAiForSource`, has been added to `backend/src/scraper.js`. This function allows you to process existing articles for a specific source and generate/assign missing AI-generated data (summary, tags, or image) based on the source's AI settings.

This functionality is exposed via a new API endpoint:

### `POST /api/process-missing-ai/:sourceId`

This endpoint triggers the `processMissingAiForSource` function for the specified source.

*   **URL Parameters:**
    *   `:sourceId` (required): The ID of the source for which to process missing AI data.
*   **Request Body:**
    *   `featureType` (required): A string specifying which type of AI data to process. Must be one of:
        *   `"summary"`: Process articles missing an AI summary.
        *   `"tags"`: Process articles missing AI-assigned tags.
        *   `"image"`: Process articles missing an AI-generated image (thumbnail).
*   **Response:**
    *   Returns a JSON object indicating the success or failure of the operation, along with counts of processed articles and errors.

**Example Usage (using `curl`):**

```bash
curl -X POST http://localhost:3000/api/process-missing-ai/123 \
-H "Content-Type: application/json" \
-d '{"featureType": "tags"}'
```

(Replace `123` with the actual source ID and `http://localhost:3000` with your backend URL if not running locally.)
