# Settings Page (Admin Controls and Source Management)

The Mango News Settings page provides a centralized place to manage your news sources and control administrative functions. This document outlines the key features available on the Settings page.

## Accessing the Settings Page

The Settings page is typically accessible at the `/settings` route of your frontend application (e.g., `http://localhost:3001/settings`).

## Database

This section provides statistics about the data stored in the application's database.

-   **Database Statistics:** View the total number of articles and sources in the database.

## Dashboard

This section provides overall control and status information for the application.

-   **Enable AI Summaries:** Control to globally enable or disable AI summary generation during scraping runs.
-   **Trigger Full Scraper Run:** Initiate a scraping process for all active news sources. The scraping method used for each source (Open Source or Firecrawl) is determined by the setting configured for that source. Status information will be displayed indicating the status of the triggered run.
-   **Purge All Articles:** Delete all existing articles from the database. Use this with caution as it is irreversible. Confirmation will be required before proceeding. Status information will be displayed indicating the status of the purge operation.

## Source Management

This section allows you to view, add, edit, and delete news sources.

-   **Viewing Existing Sources:** View a list of all configured news sources. Each source displays its name, URL, active status, AI summary setting, scraping method, and configured include/exclude selectors.
-   **Adding a New Source:**
    -   To add a new source, provide the necessary details in the form that appears.
    -   Provide the Source Name and Source URL (required fields).
    -   Select the desired Scraping Method (Open Source or Firecrawl).
    -   Enable or disable AI Summary for articles from this source.
    -   Optionally provide Include Selectors and Exclude Selectors for the Open Source scraping method (comma-separated).
    -   Optionally provide specific selectors for Open Source scraping (Title, Content, Date, Author, Thumbnail, Topics).
    -   Save the new source.
-   **Editing an Existing Source:**
    -   To edit a source, click the "Edit" button for the desired source.
    -   Modify its details in the form that appears.
    -   Save the changes to update the source.
-   **Deleting a Source:**
    -   To delete a source, click the "Delete" button for the desired source and confirm the deletion when prompted. *Note: This action cannot be undone.*
-   **Triggering a Scrape for a Single Source:**
    -   Manually trigger the scraping process for a specific source from the Source Management list by clicking the "Scrape Now" button. The scraping method used is configured for each source (see [Scraping Methods](scraping-methods.md)).
    -   Status information will be displayed indicating whether the scrape was triggered successfully or if an error occurred.

## Source Discovery

This section helps you find potential new news sources to add to your collection.

-   **Discover Sources:**
    -   Initiate the source discovery process by clicking the "Discover Sources" button.
    -   The application will attempt to discover new sources based on predefined logic (currently a basic implementation in the backend).
    -   Status information will be displayed while the discovery process is in progress.
    -   Any discovered sources will be listed with their name and URL.
-   **Adding a Discovered Source:**
    -   For each discovered source, click the "Add as New Source" button.
    -   This will populate the Add Source form with the discovered source's information.
    -   You can then configure the remaining settings and add the source as described in the "Adding a New Source" section.

---

Next: [Troubleshooting Common Issues](troubleshooting.md)
