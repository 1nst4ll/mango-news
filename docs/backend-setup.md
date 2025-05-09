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
    *   **Database Name:** `mangonews`
    *   **Username:** `mangoadmin`
    *   **Password:** This should be stored securely in your backend's `.env` file.

2.  **Apply Schema:** Apply the database schema defined in [`../db/schema.sql`](../db/schema.sql) to your PostgreSQL database.

3.  **`sources` Table:** The `sources` table stores information about each news source. A new column, `scrape_after_date`, has been added to this table.
    *   **`scrape_after_date` (TIMESTAMP WITH TIME ZONE):** This optional field allows you to specify a date. When set for a source, the scraper will only add articles published on or after this date. Articles published before this date will be ignored. This is useful for preventing the scraping of very old articles.

## Backend Configuration

1.  **Navigate to Backend Directory:** Open your terminal and change to the backend directory:
    ```bash
    cd backend
    ```

2.  **Install Dependencies:** Install the required Node.js packages:
    ```bash
    npm install aws-sdk uuid
    ```
    This installs the core backend dependencies, plus `aws-sdk` for S3 integration and `uuid` for generating unique filenames.

3.  **Environment Variables:** Environment variables are used to configure the backend, especially for sensitive information like database credentials and API keys. An example file, `.env.example`, is provided in the `backend` directory.
    *   Copy the example file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the newly created `.env` file and fill in the required values:
        ```env
        # Database Configuration
        DB_HOST=localhost
        DB_NAME=mangonews
        DB_USER=mangoadmin
        DB_PASSWORD=your_database_password

        # API Keys
        GROQ_API_KEY=your_groq_api_key
        IDEOGRAM_API_KEY=your_ideogram_api_key

        # AWS S3 Configuration for AI Images
        AWS_ACCESS_KEY_ID=your_aws_access_key_id
        AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
        AWS_REGION=your_aws_region # e.g., us-east-1
        S3_BUCKET_NAME=your_s3_bucket_name # The name of your S3 bucket

        # Firecrawl API Key (if needed directly by backend, otherwise handled by MCP)
        # FIRECRAWL_API_KEY=your_firecrawl_api_key
        ```
    Replace the placeholder values with your actual credentials, keys, and S3 bucket details.

4.  **Database Connection and AWS Configuration in Code:** The database connection details and AWS S3 configuration are handled in `backend/src/index.js` and `backend/src/scraper.js`. These files are configured to read sensitive details from environment variables (e.g., using `process.env.DB_PASSWORD`, `process.env.AWS_ACCESS_KEY_ID`).

### URL Blacklist

The backend scraper includes a URL blacklist feature to prevent scraping specific articles or pages.

*   **Configuration File:** The blacklisted URLs are stored in a JSON file located at `backend/config/blacklist.json`.
*   **Format:** The file should contain a JSON array of strings, where each string is a full URL to be blacklisted.

    ```json
    [
      "https://example.com/article-to-exclude-1",
      "https://anothersite.com/page/to/skip"
    ]
    ```
*   **Adding URLs:** To add a URL to the blacklist, simply edit the `backend/config/blacklist.json` file and add the URL as a new string element in the JSON array. Ensure the JSON format remains valid.
*   **Implementation:** The scraper (`backend/src/scraper.js` and `backend/src/opensourceScraper.js`) reads this file on startup and checks each potential article URL against the blacklist before attempting to scrape it. Blacklisted URLs are skipped.

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

A fix has been implemented in the `processMissingAiForSource` function to address cases where AI summary generation previously failed. The function now correctly identifies and attempts to re-process articles where the `summary` field contains the specific text "Summary generation failed.", in addition to articles where the `summary` is `NULL`.
*   **Response:**
    *   Returns a JSON object indicating the success or failure of the operation, along with counts of processed articles and errors.

**Example Usage (using `curl`):**

```bash
curl -X POST http://localhost:3000/api/process-missing-ai/123 \
-H "Content-Type: application/json" \
-d '{"featureType": "tags"}'
```

(Replace `123` with the actual source ID and `http://localhost:3000` with your backend URL if not running locally.)
