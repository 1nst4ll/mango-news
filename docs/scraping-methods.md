# Scraping Methods (Open Source and Firecrawl)

Mango News supports two primary methods for scraping news articles: an open-source method utilizing Puppeteer/Playwright and integration with the Firecrawl API.

## Open Source Scraping (Puppeteer/Playwright)

This method uses a headless browser (Puppeteer or Playwright) to navigate to a news source URL, execute JavaScript, and extract content based on provided CSS selectors.

**When to Use:**

- You require fine-grained control over the scraping process.
- You need to interact with dynamic content loaded by JavaScript.
- You prefer not to rely on external APIs for scraping.

**Configuration:**

- The core logic for the open-source scraper is located in `backend/src/opensourceScraper.js`. Refer to the [Backend Setup and Configuration](backend-setup.md) for backend details.
- Configuration for individual sources, including the choice of scraping method and CSS selectors, is managed through the [Admin UI (Source Management section)](admin-ui.md#source-management).

**How it Works:**

1.  The scraper navigates to the specified article URL using a headless browser.
2.  It applies the `include_selectors` to identify the main content areas.
3.  It applies the `exclude_selectors` to remove unwanted elements within the included areas (e.g., ads, sidebars).
4.  It extracts the article title, original publication date, author, thumbnail URL, and topics based on the configured selectors.
    The article discovery logic also includes specific handling for the `/year/month/slug/` URL format on magneticmediatv.com and excludes URLs containing social media share query parameters (e.g., `?share=`).

## Firecrawl Scraping

This method leverages the Firecrawl API to scrape web pages. Firecrawl provides a managed service for extracting clean content from URLs.

**When to Use:**

- You prefer a simpler, API-based approach to scraping.
- You want to offload the complexity of managing headless browsers and parsing diverse website structures.
- You need to quickly integrate scraping capabilities without extensive custom development.

**Configuration:**

- To use Firecrawl, you need a Firecrawl API key. This key should be configured as an environment variable (`FIRECRAWL_API_KEY`) in your backend.
- The integration logic for Firecrawl is located in `backend/src/scraper.js`.
- The choice of using Firecrawl for a specific source is made in the Admin UI by selecting 'firecrawl' as the scraping method.

**How it Works:**

1.  When a source is configured to use Firecrawl, the backend sends a request to the Firecrawl API with the article URL.
2.  Firecrawl processes the request and returns the extracted content, typically in a structured format (e.g., Markdown or HTML).
3.  The backend then processes the data received from Firecrawl and saves it.

## Choosing a Method

The choice between open-source and Firecrawl scraping depends on your specific needs and technical expertise. Open-source scraping offers more control but requires more development and maintenance effort. Firecrawl provides a convenient, managed solution but introduces an external dependency and potential costs.

---

Next: [Using CSS Selectors for Scraping](css-selectors.md)
