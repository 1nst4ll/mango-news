# Troubleshooting Common Issues

This document provides guidance on troubleshooting common issues you might encounter while setting up or using mango.tc news.

## Backend Issues

### Backend Server Not Starting

-   **Check Node.js and npm/yarn installation:** Ensure Node.js and your package manager are correctly installed and in your system's PATH.
-   **Install Dependencies:** Navigate to the `backend` directory and run `npm install` or `yarn install` to ensure all dependencies are installed. Refer to [Backend Setup and Configuration](backend-setup.md#setup-steps) for setup details.
-   **Check Environment Variables:** Verify that your `.env` file exists in the `backend` directory and contains all necessary environment variables with correct values (e.g., `DATABASE_URL`, `FIRECRAWL_API_KEY`). See [Backend Setup and Configuration](backend-setup.md#environment-variables) for required environment variables.
-   **Database Connection:** Ensure your database server is running and that the database connection details in your backend configuration are correct. Refer to [Backend Setup and Configuration](backend-setup.md#database-setup) for database setup.
-   **Check Backend Logs:** Look for error messages in the backend server's console output for clues about what might be going wrong.

### Scraping Errors

-   **Incorrect CSS Selectors:** If you are using the [Open Source scraping method](scraping-methods.md#open-source-scraping-puppeteerplaywright), incorrect or outdated CSS selectors are a common cause of scraping failures. Use your browser's developer tools to inspect the target website and verify your selectors. Refer to [Using CSS Selectors for Scraping](css-selectors.md) for guidance on finding selectors.
-   **Website Structure Changes:** Websites frequently update their structure, which can break existing selectors. You may need to update the selectors in the [Admin UI (Source Management section)](admin-ui.md#source-management).
-   **Dynamic Content:** If the content you are trying to scrape is loaded dynamically by JavaScript, ensure your scraping method (Open Source) is configured to wait for the page to load completely.
-   **Firecrawl API Issues:** If you are using [Firecrawl](scraping-methods.md#firecrawl-scraping), check your Firecrawl API key and ensure you have an active subscription. Refer to the Firecrawl documentation for API-specific troubleshooting.
-   **Network Issues:** Temporary network problems can cause scraping to fail. Try running the scraper again.
-   **Backend Logs:** Check the backend logs for detailed error messages related to scraping attempts.

### Blacklist Logic Not Working

If the scraper is not respecting the URLs listed in `backend/config/blacklist.json`, it might be due to how the blacklist is accessed or matched against scraped URLs.

*   **Resolution:** The blacklist is now loaded via a dedicated function (`loadUrlBlacklist` in `backend/src/configLoader.js`) and accessed using a getter function (`getBlacklist`). To address issues with partial URL matches, the blacklist check now verifies if a scraped URL *starts with* any entry in the blacklist, rather than requiring an exact match. This ensures that URLs with additional parameters or paths are correctly excluded if their base matches a blacklisted entry. If you encounter issues with the blacklist, ensure that `loadUrlBlacklist` is called before any scraping or discovery process begins and that `getBlacklist()` is used to retrieve the blacklist array. This fix was implemented by modifying `backend/src/configLoader.js`, `backend/src/scraper.js`, and `backend/src/opensourceScraper.js`. Ensure your backend code is up-to-date with these changes.

### `ReferenceError: urlBlacklist is not defined`

This error occurs when the scraper attempts to access the `urlBlacklist` variable before it has been properly loaded from the `blacklist.json` file. This specific error should now be resolved by the changes made to use the `getBlacklist()` function instead of directly referencing the `urlBlacklist` variable.

*   **Resolution:** This error is addressed by using the `getBlacklist()` function from `backend/src/configLoader.js` to access the blacklist, ensuring it is always retrieved after being loaded. Ensure your backend code is updated to use `getBlacklist()` where the blacklist is needed.

### Groq API `max_tokens` Error

This error occurs when the `max_tokens` parameter sent to the Groq API for AI translation (especially for `raw_content`) exceeds the model's maximum allowed limit.

*   **Error Message Example:** `BadRequestError: 400 {"error":{"message":"`max_tokens` must be less than or equal to `8192`..."}}`
*   **Resolution:** The `generateAITranslation` function in `backend/src/scraper.js` has been updated to cap the `max_tokens` for `raw_content` translations at `8192`, which is the current maximum allowed by the Groq API. Ensure your `backend/src/scraper.js` file is updated with this change.

### `ReferenceError: Cannot access 'articleId' before initialization`

This error occurs in the `processScrapedData` function when the `articleId` variable is used before it has been assigned a value, specifically when linking articles to topics.

*   **Resolution:** The logic within the `processScrapedData` function in `backend/src/scraper.js` has been reordered. The `articleId` is now retrieved from the database after the main article insertion, and then used to link the article to its assigned topics. Ensure your `backend/src/scraper.js` file is updated with this corrected flow.

## Frontend Issues

### Frontend Not Displaying Correctly

-   **Frontend Server Not Running:** Ensure your frontend development server is running (typically `npm run dev` in the `astro-frontend` directory).
-   **Backend Server Not Running:** The frontend relies on the backend API. Ensure your backend server is running.
-   **API Endpoint Configuration:** Verify that the frontend is configured to connect to the correct backend API URL (check the fetch calls in the frontend code, e.g., in `astro-frontend/src/pages/settings.astro` or relevant component files).
-   **Browser Cache:** Clear your browser's cache and cookies to ensure you are loading the latest version of the frontend code.
-   **Console Errors:** Check the browser's developer console for any JavaScript errors.

### Theme Switcher

-   **Implementation:** The theme switcher is currently implemented as a simple toggle button that switches between light and dark mode on click. This was changed from a dropdown menu to address compatibility issues on iOS Safari.

### Authentication Errors (No Token Provided)

If you encounter "Authentication failed: No token provided" errors when performing actions like deleting articles, it indicates that the API request is missing the necessary JWT (JSON Web Token) in the `Authorization` header.

-   **Resolution:** Ensure you are logged in. The frontend automatically retrieves the JWT token from `localStorage` after a successful login and includes it in authenticated API requests (e.g., for deleting articles). If you are logged in and still face this issue, clear your browser's local storage and cookies, then log in again. Verify that the `jwtToken` is present in your browser's local storage after logging in.

## General Issues

### Database Problems

-   **Database Server Status:** Ensure your database server is running.
-   **Database Credentials:** Double-check your database connection credentials in the backend configuration.
-   **Database Schema:** Verify that the necessary tables and columns exist in your database by checking the `db/schema.sql` file and running any pending migrations.

If you encounter an issue that is not covered in this document, please refer to the specific error messages in your console or logs and consult the relevant documentation for the technologies being used (Node.js, your database system, Puppeteer/Playwright, Firecrawl, Next.js, React).

---

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
