# Backend Setup and Configuration

This document guides you through setting up and configuring the backend for the mango.tc news application.

## Prerequisites

*   Node.js and npm installed.
*   Access to a PostgreSQL database.
*   A Groq API key for AI features (summaries and topic assignment).
*   An Ideogram API key for AI image generation.
*   AWS S3 credentials and a bucket for storing AI-generated images.
*   A strong secret key for JWT authentication.

## Database Setup

The backend connects to a PostgreSQL database.

1.  **Database Details:**
    *   **Type:** PostgreSQL
    *   **Host:** For local development, use `localhost`. For production, this will be your database server address (e.g., `mangonews.onrender.com`).
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
    npm install aws-sdk uuid rss marked
    ```
    This installs the core backend dependencies, plus `aws-sdk` for S3 integration, `uuid` for generating unique filenames, `rss` for generating RSS feeds, and `marked` for converting Markdown to HTML.

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

        # Authentication
        JWT_SECRET=your_jwt_secret_key
        ```
    Replace the placeholder values with your actual credentials, keys, S3 bucket details, and a strong, unique secret key for `JWT_SECRET`.

4.  **Database Connection, AWS, and Authentication Configuration in Code:** The database connection details, AWS S3 configuration, and JWT secret are handled in `backend/src/index.js`, `backend/src/scraper.js`, and `backend/src/middleware/auth.js`. These files are configured to read sensitive details from environment variables (e.g., using `process.env.DB_PASSWORD`, `process.env.AWS_ACCESS_KEY_ID`, `process.env.JWT_SECRET`).

## Authentication

The backend now includes secure user registration and login using JWT (JSON Web Tokens) for authentication.

*   **Registration:** Users can register via the `POST /api/register` endpoint. This requires a unique username and a password. Passwords are securely hashed using bcrypt before being stored in the database.
*   **Login:** Registered users can log in via the `POST /api/login` endpoint. Upon successful login, a JWT is issued. This token should be included in the `Authorization` header of subsequent requests to protected endpoints in the format `Bearer YOUR_TOKEN`.
*   **Protected Endpoints:** Several backend endpoints now require a valid JWT for access. These include endpoints for adding, updating, and deleting sources, triggering scraper runs, processing missing AI data, and accessing database statistics and scheduler settings.

## URL Blacklist

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

## RSS Feed

The backend provides an RSS feed of the latest articles.

### `GET /api/rss`

This endpoint returns an RSS feed in XML format.

*   **Content:** The feed includes the latest 20 articles, ordered by publication date.
*   **Fields per item:**
    *   `title`: Article title.
    *   `link`: URL to the article on the Mango News frontend (e.g., `https://mangonews.onrender.com/article/:id`).
    *   `pubDate`: Publication date of the article.
    *   `description`: AI-generated summary of the article, converted from Markdown to HTML. If an `ai_image_path` or `thumbnail_url` is available for the article, an `<img>` tag pointing to this image will be prepended to the HTML description. This allows for rich text formatting and an image in compatible RSS readers. (Defaults to "<p>No summary available.</p>" if no summary).
    *   `guid`: The original URL of the article from the source website (used as a unique identifier).
    *   `author`: The name of the news source.
*   **Feed Details:**
    *   `title`: "Mango News Feed"
    *   `description`: "Latest news from Turks and Caicos Islands"
    *   `feed_url`: The URL of the RSS feed itself (e.g., `https://mango.tc/api/rss`).
    *   `site_url`: The main site URL (e.g., `https://mango.tc`).
    *   `language`: "en-us"
    *   `ttl`: 60 (minutes)

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

## AI Summary Prompt

The system prompt used for AI summary generation is located in the `backend/src/scraper.js` file within the `generateAISummary` function. The prompt has been updated to explicitly request only the summary text without any introductory phrases or conversational filler.

## AI Image Prompt

The system prompt used for AI image generation is located in the `backend/src/scraper.js` file within the `generateAIImage` function. The prompt has been updated to be more specific about the desired image content, focusing on imagery relevant to the Turks and Caicos Islands and reinforcing the instruction to avoid identifiable faces of residents while still reflecting the local context.
