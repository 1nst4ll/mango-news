# Scraping Methods (Open Source and Firecrawl)

mango.tc news supports two primary methods for scraping news articles: an open-source method utilizing Puppeteer/Playwright and integration with the Firecrawl API.

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
    The article discovery logic now also utilizes the `article_link_template` and `exclude_patterns` configured for each source.
    -   **Article Link Template:** This field allows defining a URL pattern (e.g., `https://[source_url]/articles/{article_slug}`) that discovered links must match to be considered potential articles. This helps to more accurately identify article links on complex websites.
    -   **Exclude Patterns:** This field allows specifying a comma-separated list of query parameter names (e.g., `social,utm_source`) to be removed from discovered URLs. This helps clean up links and ensures consistent article URLs.
    The open-source discovery process has been enhanced to explore links up to a depth of 3 from the source's homepage and no longer has a hard limit on the number of potential article URLs it will discover during this phase. This ensures a more comprehensive search for links that match the article link template and are on the same domain.
    The discovery logic also includes specific handling for the `/year/month/slug/` URL format on magneticmediatv.com and excludes URLs containing social media share query parameters (e.g., `?share=`).

**Note on Article Link Templates:** The accuracy of article discovery heavily relies on the `article_link_template` defined for each source. A template that is too broad may result in non-article pages being incorrectly identified as articles. For example, during analysis of source 8 (turksandcaicoshta.com), a broad template led to many navigation links being included in the potential article list. Ensuring the template is specific enough to match only actual article URL patterns is crucial for correct scraping.

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

## AI Features and Toggle Logic

The scraping process includes optional AI-powered features for generating article summaries, assigning topics, generating images, and **translating content**. AI image generation is performed using the **Ideogram API**. This feature is only attempted if no thumbnail URL is found during the initial scrape. The prompt used for image generation is designed to create relevant visuals with a Caribbean setting and depict people with dark skin. These AI features can be enabled or disabled on a per-source basis through the Admin UI.

The behavior of these AI features depends on how the scrape is initiated:

*   **Global Scrapes (e.g., Scheduled Scrapes or `POST /api/scrape/run`):** AI features (summary, tags, image) for a specific article are enabled *only if* the corresponding global AI toggle (if provided in the API request) *and* the source-specific AI toggle are both enabled. If global toggles are not explicitly provided in the API request, the default values (currently `true` for tags and image, `undefined` for summary) are used in conjunction with the source-specific toggles.
*   **Per-Source Scrapes (`POST /api/scrape/run/:id`):** AI features (summary, tags, image) for articles from this source are enabled *only if* the corresponding source-specific AI toggle is enabled. Any global AI toggles provided in the API request body for this endpoint are ignored.

This logic ensures that scheduled and global manual scrapes respect both global preferences and source-specific configurations, while per-source manual scrapes strictly adhere to the source's own AI settings.

---

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
* [Using CSS Selectors for Scraping](css-selectors.md)
