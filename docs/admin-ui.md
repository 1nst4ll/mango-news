# Admin UI Features (Source Management and Discovery)

The Mango News Admin UI provides a centralized place to manage your news sources and discover new ones. This document outlines the key features available in the Admin UI.

## Accessing the Admin UI

The Admin UI is typically accessible at the `/admin` route of your frontend application (e.g., `http://localhost:3001/admin`).

## Source Management

The Source Management section allows you to view, add, edit, and delete news sources.

-   **Viewing Existing Sources:** Upon navigating to the Admin UI, you will see a list of all configured news sources. Each source displays its name, URL, active status, AI summary setting, scraping method, and configured include/exclude selectors.
-   **Adding a New Source:**
    -   To add a new source, provide the necessary details in the form that appears.
    -   Provide the Source Name and Source URL (required fields).
    -   Select the desired Scraping Method (Open Source or Firecrawl).
    -   Enable or disable AI Summary for articles from this source.
    -   Optionally provide Include Selectors and Exclude Selectors for the Open Source scraping method (comma-separated).
    -   Save the new source.
-   **Editing an Existing Source:**
    -   To edit a source, modify its details in the form that appears when selecting a source.
    -   Make the necessary changes to the source's information.
    -   Save the changes to update the source.
-   **Deleting a Source:**
    -   To delete a source, confirm the deletion when prompted. *Note: This action cannot be undone.*
-   **Triggering a Scrape for a Single Source:**
    -   Manually trigger the scraping process for a specific source from the Source Management list. The scraping method used is configured for each source (see [Scraping Methods](scraping-methods.md)).
    -   Status information will be displayed indicating whether the scrape was triggered successfully or if an error occurred.

## Admin Dashboard Features

The main Admin Dashboard page (`/admin`) provides overall control and status information.

-   **Enable AI Summaries:** Control to globally enable or disable AI summary generation during scraping runs.
-   **Trigger Full Scraper Run:** Initiate a scraping process for all active news sources configured in the Source Management section. The scraping method used for each source (Open Source or Firecrawl) is determined by the setting configured for that source. Status information will be displayed indicating the status of the triggered run.
-   **Purge All Articles:** Delete all existing articles from the database. Use this with caution as it is irreversible. Confirmation will be required before proceeding. Status information will be displayed indicating the status of the purge operation.

## Source Discovery

The Source Discovery section helps you find potential new news sources to add to your collection.

-   **Discover Sources:**
    -   Initiate the source discovery process.
    -   The application will attempt to discover new sources based on predefined logic (currently a basic implementation in the backend).
    -   Status information will be displayed while the discovery process is in progress.
    -   Any discovered sources will be listed with their name and URL.
-   **Adding a Discovered Source:**
    -   For each discovered source, add it as a new source.
    -   This will populate the form with the discovered source's information.
    -   You can then configure the remaining settings and add the source as described in the "Adding a New Source" section.

---

Next: [Troubleshooting Common Issues](troubleshooting.md)
