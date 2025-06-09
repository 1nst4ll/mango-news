# Mango News Backend API Documentation

This document provides a comprehensive overview of the Mango News backend API endpoints, their functionalities, and how to interact with them.

**Base URL:** `http://localhost:3000` (for local development) or your deployed backend URL.

## Authentication

Most `POST`, `PUT`, `DELETE` endpoints, and some `GET` endpoints require authentication. The API uses JSON Web Tokens (JWT) for authentication.

1.  **Login:** Obtain a JWT by sending a `POST` request to `/api/login` with your username and password.
2.  **Authorization Header:** Include the obtained JWT in the `Authorization` header of subsequent requests to protected endpoints in the format: `Bearer YOUR_TOKEN`.

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Common Error Responses

The API generally returns error responses in the following JSON format:

```json
{
  "error": "Error message describing the issue."
}
```

Common HTTP status codes for errors include:
*   `400 Bad Request`: The request was malformed or missing required parameters.
*   `401 Unauthorized`: Authentication is required or the provided token is invalid/expired.
*   `404 Not Found`: The requested resource could not be found.
*   `500 Internal Server Error`: An unexpected error occurred on the server.

---

## API Endpoints

### User Management

#### `POST /api/register`

Registers a new user.

*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
*   **Success Response (`201 Created`):**
    ```json
    {
      "message": "User registered successfully.",
      "user": {
        "id": "number",
        "username": "string"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing username or password, or username already exists.
    *   `500 Internal Server Error`: General server error.

#### `POST /api/login`

Logs in an existing user and returns a JWT.

*   **Authentication:** None required.
*   **Request Body:**
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Login successful.",
      "token": "string"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing username or password.
    *   `401 Unauthorized`: Invalid username or password.
    *   `500 Internal Server Error`: General server error.

### Sources

#### `GET /api/sources`

Retrieves a list of all news sources.

*   **Authentication:** None required.
*   **Success Response (`200 OK`):**
    ```json
    [
      {
        "id": "number",
        "name": "string",
        "url": "string",
        "is_active": "boolean",
        "enable_ai_summary": "boolean",
        "enable_ai_tags": "boolean",
        "enable_ai_image": "boolean",
        "enable_ai_translations": "boolean",
        "os_title_selector": "string | null",
        "os_content_selector": "string | null",
        "os_date_selector": "string | null",
        "os_author_selector": "string | null",
        "os_thumbnail_selector": "string | null",
        "os_topics_selector": "string | null",
        "include_selectors": "string | null",
        "exclude_selectors": "string | null",
        "article_link_template": "string | null",
        "exclude_patterns": "string | null",
        "scraping_method": "string",
        "scrape_after_date": "string | null"
      }
    ]
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`: General server error.

#### `GET /api/sources/:id`

Retrieves details for a single news source by its ID.

*   **Authentication:** None required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the source.
*   **Success Response (`200 OK`):**
    ```json
    {
      "id": "number",
      "name": "string",
      "url": "string",
      "is_active": "boolean",
      "enable_ai_summary": "boolean",
      "enable_ai_tags": "boolean",
      "enable_ai_image": "boolean",
      "enable_ai_translations": "boolean",
      "os_title_selector": "string | null",
      "os_content_selector": "string | null",
      "os_date_selector": "string | null",
      "os_author_selector": "string | null",
      "os_thumbnail_selector": "string | null",
      "os_topics_selector": "string | null",
      "include_selectors": "string | null",
      "exclude_selectors": "string | null",
      "article_link_template": "string | null",
      "exclude_patterns": "string | null",
      "scraping_method": "string",
      "scrape_after_date": "string | null"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Source with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

#### `GET /api/sources/:sourceId/articles`

Retrieves articles associated with a specific news source, with pagination, sorting, and AI status filtering.

*   **Authentication:** None required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Query Parameters:**
    *   `page` (number, optional): The page number to retrieve (default: `1`).
    *   `limit` (number, optional): The number of articles per page (default: `15`).
    *   `sortBy` (string, optional): Field to sort by (default: `publication_date`).
    *   `sortOrder` (string, optional): Sort order (`ASC` or `DESC`, default: `DESC`).
    *   `filterByAiStatus` (string, optional): Filter articles by their AI processing status.
        *   `missing_summary`: Articles without an AI summary.
        *   `missing_tags`: Articles without AI-assigned tags.
        *   `missing_image`: Articles without an AI-generated image.
        *   `missing_translations`: Articles without AI-generated Spanish or Haitian Creole translations.
        *   `has_summary`: Articles with an AI summary.
        *   `has_tags`: Articles with AI-assigned tags.
        *   `has_image`: Articles with an AI-generated image.
        *   `has_translations`: Articles with AI-generated Spanish and Haitian Creole translations.
*   **Success Response (`200 OK`):**
    *   **Headers:**
        *   `X-Total-Count`: Total number of articles matching the criteria (string).
    *   **Body:**
        ```json
        [
          {
            "id": "number",
            "title": "string",
            "source_url": "string",
            "thumbnail_url": "string | null",
            "ai_summary": "string | null",
            "ai_image_url": "string | null",
            "ai_tags": "string[]",
            "topics_es": "string | null",
            "topics_ht": "string | null",
            "publication_date": "string"
          }
        ]
        ```
*   **Error Responses:**
    *   `500 Internal Server Error`: General server error.

#### `POST /api/sources`

Adds a new news source.

*   **Authentication:** Required.
*   **Request Body:**
    ```json
    {
      "name": "string",
      "url": "string",
      "is_active": "boolean", // optional, default: true
      "enable_ai_summary": "boolean", // optional, default: true
      "enable_ai_tags": "boolean", // optional, default: true
      "enable_ai_image": "boolean", // optional, default: true
      "enable_ai_translations": "boolean", // optional, default: true
      "include_selectors": "string | null", // optional
      "exclude_selectors": "string | null", // optional
      "scraping_method": "string", // optional, default: "opensource"
      "article_link_template": "string | null", // optional
      "exclude_patterns": "string | null", // optional, comma-separated query parameter names
      "scrape_after_date": "string | null" // optional, ISO 8601 date string
    }
    ```
*   **Success Response (`201 Created`):**
    ```json
    {
      "id": "number",
      "name": "string",
      "url": "string",
      "is_active": "boolean",
      "enable_ai_summary": "boolean",
      "enable_ai_tags": "boolean",
      "enable_ai_image": "boolean",
      "enable_ai_translations": "boolean",
      "include_selectors": "string | null",
      "exclude_selectors": "string | null",
      "scraping_method": "string",
      "article_link_template": "string | null",
      "exclude_patterns": "string | null",
      "scrape_after_date": "string | null"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields (`name` or `url`).
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error.

#### `PUT /api/sources/:id`

Updates an existing news source by its ID.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the source to update.
*   **Request Body:** (All fields are optional; only provided fields will be updated)
    ```json
    {
      "name": "string",
      "url": "string",
      "is_active": "boolean",
      "enable_ai_summary": "boolean",
      "enable_ai_tags": "boolean",
      "enable_ai_image": "boolean",
      "enable_ai_translations": "boolean",
      "os_title_selector": "string | null",
      "os_content_selector": "string | null",
      "os_date_selector": "string | null",
      "os_author_selector": "string | null",
      "os_thumbnail_selector": "string | null",
      "os_topics_selector": "string | null",
      "include_selectors": "string | null",
      "exclude_selectors": "string | null",
      "article_link_template": "string | null",
      "exclude_patterns": "string | null",
      "scraping_method": "string",
      "scrape_after_date": "string | null" // ISO 8601 date string
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "id": "number",
      "name": "string",
      "url": "string",
      "is_active": "boolean",
      "enable_ai_summary": "boolean",
      "enable_ai_tags": "boolean",
      "enable_ai_image": "boolean",
      "enable_ai_translations": "boolean",
      "os_title_selector": "string | null",
      "os_content_selector": "string | null",
      "os_date_selector": "string | null",
      "os_author_selector": "string | null",
      "os_thumbnail_selector": "string | null",
      "os_topics_selector": "string | null",
      "include_selectors": "string | null",
      "exclude_selectors": "string | null",
      "article_link_template": "string | null",
      "exclude_patterns": "string | null",
      "scraping_method": "string",
      "scrape_after_date": "string | null"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: No update fields provided.
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

#### `POST /api/sources/:sourceId/reprocess-topics`

Triggers the re-processing of translated topics for articles belonging to a specific source.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Reprocessing completed for source ID {sourceId}. Processed: {processedCount}, Errors: {errorCount}",
      "processedCount": "number",
      "errorCount": "number"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: Failed to trigger re-processing or an error occurred during processing.

#### `GET /api/sources/:sourceId/rescrape-stream`

Triggers the re-scraping of all articles for a specific source and streams progress via Server-Sent Events (SSE).

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Request Body:** None.
*   **Success Response (`200 OK` - SSE Stream):**
    *   **Content-Type:** `text/event-stream`
    *   **Events:**
        *   `data: {"status": "info", "message": "..."}`: Information messages during the process.
        *   `data: {"status": "success", "message": "..."}`: Success message for individual article rescrapes.
        *   `data: {"status": "error", "message": "..."}`: Error message for individual article rescrapes.
        *   `data: {"status": "complete", "message": "Finished re-scraping for source ID {sourceId}. Articles re-scraped: {articlesRescraped}, Errors: {errorCount}."}`: Final completion message.
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found or not active.
    *   `500 Internal Server Error`: Failed to establish SSE connection or an error occurred during processing.

#### `POST /api/sources/:sourceId/rescrape`

Triggers the re-scraping of all articles for a specific source. This will re-fetch the content for existing articles and update them in the database. This is a non-streaming endpoint.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Finished re-scraping for source ID {sourceId}. Articles re-scraped: {articlesRescraped}, Errors: {errorCount}.",
      "articlesRescraped": "number",
      "errorCount": "number"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found or not active.
    *   `500 Internal Server Error`: Failed to trigger re-scraping or an error occurred during processing.

#### `DELETE /api/sources/:id`

Deletes a news source by its ID.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the source to delete.
*   **Success Response (`204 No Content`):**
    *   No response body.
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

### Topics

#### `GET /api/topics`

Retrieves a list of distinct topics, with optional filtering.

*   **Authentication:** None required.
*   **Query Parameters:**
    *   `searchTerm` (string, optional): Filters topics by articles containing the search term in their title or raw content.
    *   `startDate` (string, optional): Filters topics by articles published on or after this date (ISO 8601 format).
    *   `endDate` (string, optional): Filters topics by articles published on or before this date (ISO 8601 format).
    *   `sources` (string, optional): Comma-separated list of source names to filter topics by.
*   **Success Response (`200 OK`):**
    ```json
    [
      {
        "id": "number",
        "name": "string",
        "name_es": "string | null",
        "name_ht": "string | null"
      }
    ]
    ```
*   **Error Responses:**
    *   `500 Internal Server Error`: General server error.

### Articles

#### `GET /api/articles`

Retrieves a list of all articles, with pagination and filtering.

*   **Authentication:** None required.
*   **Query Parameters:**
    *   `topic` (string, optional): Comma-separated list of topic names to filter articles by.
    *   `startDate` (string, optional): Filters articles published on or after this date (ISO 8601 format).
    *   `endDate` (string, optional): Filters articles published on or before this date (ISO 8601 format).
    *   `searchTerm` (string, optional): Filters articles by title or raw content.
    *   `sources` (string, optional): Comma-separated list of source names to filter articles by.
    *   `page` (number, optional): The page number to retrieve (default: `1`).
    *   `limit` (number, optional): The number of articles per page (default: `15`).
*   **Success Response (`200 OK`):**
    *   **Headers:**
        *   `X-Total-Count`: Total number of articles matching the criteria (string).
    *   **Body:**
        ```json
        [
          {
            "id": "number",
            "title": "string",
            "source_url": "string",
            "thumbnail_url": "string | null",
            "ai_summary": "string | null",
            "ai_image_path": "string | null",
            "publication_date": "string",
            "raw_content": "string",
            "is_blocked": "boolean",
            "source_id": "number",
            "title_es": "string | null",
            "summary_es": "string | null",
            "raw_content_es": "string | null",
            "title_ht": "string | null",
            "summary_ht": "string | null",
            "raw_content_ht": "string | null",
            "topics": "string[]",
            "topics_es": "string | null",
            "topics_ht": "string | null"
          }
        ]
        ```
*   **Error Responses:**
    *   `500 Internal Server Error`: General server error.

#### `GET /api/articles/:id`

Retrieves details for a single article by its ID.

*   **Authentication:** None required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the article.
*   **Success Response (`200 OK`):**
    ```json
    {
      "id": "number",
      "title": "string",
      "source_url": "string",
      "thumbnail_url": "string | null",
      "ai_summary": "string | null",
      "ai_image_path": "string | null",
      "publication_date": "string",
      "raw_content": "string",
      "is_blocked": "boolean",
      "source_id": "number",
      "title_es": "string | null",
      "summary_es": "string | null",
      "raw_content_es": "string | null",
      "title_ht": "string | null",
      "summary_ht": "string | null",
      "raw_content_ht": "string | null",
      "topics": "string[]",
      "topics_es": "string | null",
      "topics_ht": "string | null"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Article with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

#### `DELETE /api/articles/:id`

Deletes a single article by its ID. This also deletes associated topic links.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the article to delete.
*   **Success Response (`204 No Content`):**
    *   No response body.
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Article with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

#### `PUT /api/articles/:id/block`

Blocks a single article by its ID, preventing it from appearing in feeds.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the article to block.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Article {id} blocked successfully."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Article with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

#### `POST /api/articles/:articleId/process-ai`

Triggers AI processing for a single article for a specific feature (summary, tags, image, or translations).

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `articleId` (number, required): The ID of the article.
*   **Request Body:**
    ```json
    {
      "featureType": "string" // Required: "summary", "tags", "image", or "translations"
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "AI processing completed for article ID {articleId}, feature {featureType}."
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid or missing `featureType`.
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: Failed to trigger AI processing or an error occurred during processing.

#### `POST /api/articles/:articleId/rescrape`

Triggers the re-scraping of a single article by its ID. This will re-fetch the content for the specified article and update it in the database.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `articleId` (number, required): The ID of the article to rescrape.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Article {articleId} rescraped successfully."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Article or its associated source not found.
    *   `500 Internal Server Error`: Failed to trigger rescrape or an error occurred during processing.

#### `POST /api/articles/purge`

Deletes all articles, topics, and article links from the database.

*   **Authentication:** Required.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "All articles, topics, and article links purged successfully."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error.

#### `POST /api/articles/purge/:sourceId`

Deletes all articles for a specific source from the database.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "All articles for source ID {sourceId} purged successfully.",
      "articlesDeleted": "number"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

### Scraping & AI Processing

#### `POST /api/scrape/run/:id`

Triggers the scraper for a specific news source.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the source to scrape.
*   **Request Body:**
    ```json
    {
      "enableGlobalAiSummary": "boolean", // optional, default: false
      "enableGlobalAiTags": "boolean",    // optional, default: false
      "enableGlobalAiImage": "boolean",   // optional, default: false
      "enableGlobalAiTranslations": "boolean" // optional, default: false
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Scraping triggered for {sourceName}",
      "linksFound": "number",
      "articlesAdded": "number"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found.
    *   `500 Internal Server Error`: Failed to trigger scrape.

#### `POST /api/scrape/run`

Triggers a full scraper run for all active news sources.

*   **Authentication:** Required.
*   **Request Body:**
    ```json
    {
      "enableGlobalAiSummary": "boolean", // optional, default: false
      "enableGlobalAiTags": "boolean",    // optional, default: false
      "enableGlobalAiImage": "boolean",   // optional, default: false
      "enableGlobalAiTranslations": "boolean" // optional, default: false
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Full scraper run triggered successfully. Check backend logs for progress."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: Failed to trigger full scraper run.

#### `POST /api/process-missing-ai/:sourceId`

Triggers processing of missing AI data (summary, tags, image, or translations) for articles belonging to a specific source.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Request Body:**
    ```json
    {
      "featureType": "string" // Required: "summary", "tags", "image", or "translations"
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Missing AI processing completed for source ID {sourceId}, feature {featureType}.",
      "processedCount": "number",
      "errorCount": "number"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid or missing `featureType`.
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: Failed to trigger missing AI processing or an error occurred during processing.


### Database Management

#### `POST /api/articles/purge`

Deletes all articles, topics, and article links from the database. Resets the article ID sequence.

*   **Authentication:** Required.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "All articles, topics, and article links purged successfully."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error.

#### `POST /api/articles/purge/:sourceId`

Deletes all articles for a specific source from the database.

*   **Authentication:** Required.
*   **Path Parameters:**
    *   `sourceId` (number, required): The ID of the source.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "All articles for source ID {sourceId} purged successfully.",
      "articlesDeleted": "number"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `404 Not Found`: Source with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

### Statistics

#### `GET /api/stats`

Retrieves various database statistics.

*   **Authentication:** Required.
*   **Success Response (`200 OK`):**
    ```json
    {
      "totalArticles": "number",
      "totalSources": "number",
      "articlesPerSource": [
        {
          "source_name": "string",
          "article_count": "number"
        }
      ],
      "articlesPerYear": [
        {
          "year": "number",
          "article_count": "number"
        }
      ]
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error.

### Sunday Editions

#### `POST /api/sunday-editions/generate`

Manually triggers the generation of a new Sunday Edition post. This endpoint is protected and requires authentication.

*   **Authentication:** Required.
*   **Request Body:** None.
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Sunday Edition created successfully.",
      "id": "number"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error, or an error occurred during generation (e.g., no articles found, AI summary/narration failed).

#### `GET /api/sunday-editions`

Retrieves a list of all Sunday Edition posts, with pagination.

*   **Authentication:** None required.
*   **Query Parameters:**
    *   `page` (number, optional): The page number to retrieve (default: `1`).
    *   `limit` (number, optional): The number of editions per page (default: `15`).
*   **Success Response (`200 OK`):**
    *   **Headers:**
        *   `X-Total-Count`: Total number of Sunday Editions matching the criteria (string).
    *   **Body:**
        ```json
        [
          {
            "id": "number",
            "title": "string",
            "summary": "string",
            "narration_url": "string",
            "image_url": "string",
            "publication_date": "string",
            "created_at": "string"
          }
        ]
        ```
*   **Error Responses:**
    *   `500 Internal Server Error`: General server error.

#### `GET /api/sunday-editions/:id`

Retrieves details for a single Sunday Edition post by its ID.

*   **Authentication:** None required.
*   **Path Parameters:**
    *   `id` (number, required): The ID of the Sunday Edition.
*   **Success Response (`200 OK`):**
    ```json
    {
      "id": "number",
      "title": "string",
      "summary": "string",
      "narration_url": "string",
      "image_url": "string",
      "publication_date": "string",
      "created_at": "string"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Sunday Edition with the specified ID not found.
    *   `500 Internal Server Error`: General server error.

### RSS Feed

#### `GET /api/rss`

Returns an RSS feed of the latest articles.

*   **Authentication:** None required.
*   **Success Response (`200 OK`):**
    *   **Content-Type:** `application/rss+xml`
    *   **Body:** XML content representing the RSS feed.
        *   Includes the latest 20 articles.
        *   Each item contains: `title`, `url` (link to frontend article page), `pubDate`, `description` (AI summary with optional image), `guid` (original source URL), `author` (source name).
*   **Error Responses:**
    *   `500 Internal Server Error`: General server error.

### Settings

#### `GET /api/settings/scheduler`

Retrieves the current scheduler settings for background tasks.

*   **Authentication:** Required.
*   **Success Response (`200 OK`):**
    ```json
    {
      "main_scraper_frequency": "string", // Cron string (e.g., "0 * * * *")
      "missing_ai_frequency": "string",   // Cron string (e.g., "*/20 * * * *")
      "enable_scheduled_missing_summary": "boolean",
      "enable_scheduled_missing_tags": "boolean",
      "enable_scheduled_missing_image": "boolean",
      "enable_scheduled_missing_translations": "boolean"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error.

#### `POST /api/settings/scheduler`

Saves new scheduler settings.

*   **Authentication:** Required.
*   **Request Body:**
    ```json
    {
      "main_scraper_frequency": "string", // Cron string
      "missing_ai_frequency": "string",   // Cron string
      "enable_scheduled_missing_summary": "boolean",
      "enable_scheduled_missing_tags": "boolean",
      "enable_scheduled_missing_image": "boolean",
      "enable_scheduled_missing_translations": "boolean"
    }
    ```
*   **Success Response (`200 OK`):**
    ```json
    {
      "message": "Scheduler settings saved successfully."
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing required scheduler settings.
    *   `401 Unauthorized`: Invalid or missing authentication token.
    *   `500 Internal Server Error`: General server error.
