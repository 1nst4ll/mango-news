# Admin UI Features (Source Management and Discovery)

The Mango News Admin UI provides a centralized place to manage your news sources and discover new ones. This document outlines the key features available in the Admin UI.

## Accessing the Admin UI

The Admin UI is typically accessible at the `/admin` route of your frontend application (e.g., `http://localhost:3001/admin`).

## Source Management

The Source Management section allows you to view, add, edit, and delete news sources.

-   **Viewing Existing Sources:** Upon navigating to the Admin UI, you will see a list of all configured news sources. Each source displays its name, URL, active status, AI summary setting, scraping method, and configured include/exclude selectors.
-   **Adding a New Source:**
    -   Click the "Add New Source" button.
    -   A modal will appear with a form to enter the details of the new source.
    -   Provide the Source Name and Source URL (required fields).
    -   Select the desired Scraping Method (Open Source or Firecrawl).
    -   Toggle "Enable AI Summary" to enable or disable AI summarization for articles from this source.
    -   Optionally provide Include Selectors and Exclude Selectors for the Open Source scraping method (comma-separated).
    -   Click "Add Source" to save the new source.
-   **Editing an Existing Source:**
    -   Click the "Edit" button next to the source you want to modify.
    -   A modal will appear pre-filled with the source's current details.
    -   Make the necessary changes to the source's information.
    -   Click "Save Changes" to update the source.
-   **Deleting a Source:**
    -   Click the "Delete" button next to the source you want to remove.
    -   A confirmation dialog will appear.
    -   Click "OK" to confirm the deletion. *Note: This action cannot be undone.*
-   **Triggering a Scrape:**
    -   Click the "Scrape Now" button next to a source to manually trigger the scraping process for that specific source.
    -   A status message will appear indicating whether the scrape was triggered successfully or if an error occurred.

## Source Discovery

The Source Discovery section helps you find potential new news sources to add to your collection.

-   **Discover Sources:**
    -   Click the "Discover Sources" button.
    -   The application will attempt to discover new sources based on predefined logic (currently a basic implementation in the backend).
    -   A loading indicator will be displayed while the discovery process is in progress.
    -   Any discovered sources will be listed with their name and URL.
-   **Adding a Discovered Source:**
    -   For each discovered source, click the "Add as New Source" button.
    -   This will open the Add New Source modal with the Name and URL fields pre-filled with the discovered source's information.
    -   You can then configure the remaining settings and add the source as described in the "Adding a New Source" section.

---

Next: [Troubleshooting Common Issues](troubleshooting.md)
