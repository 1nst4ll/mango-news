# Settings Page (Admin Controls and Source Management)

The Mango News Settings page provides a centralized place to manage your news sources and control administrative functions. This document outlines the key features available on the Settings page, which is built using **React** within the **Astro** frontend and styled with **Tailwind CSS** and **shadcn/ui** components.

## Accessing the Settings Page

The Settings page is typically accessible at the `/settings` route of your frontend application (e.g., `http://localhost:4321/settings` in the Astro development environment).

## Database

This section provides statistics about the data stored in the application's database and visual charts.

-   **Database Statistics:** View the total number of articles and sources in the database, displayed within **shadcn/ui Card** components arranged in a row.
-   **Charts:** Visual representations of database statistics are provided:
    -   **Articles per Source:** A vertical **Bar Chart** showing the number of articles from each news source.
    -   **Articles per Year:** A vertical **Bar Chart** showing the number of articles published each year.

## Dashboard

This section provides overall control and status information for the application, presented within a **shadcn/ui Card**.

-   **Enable AI Summaries:** Control to globally enable or disable AI summary generation during scraping runs, using a **shadcn/ui Switch** component.
-   **Trigger Full Scraper Run:** Initiate a scraping process for all active news sources using a **shadcn/ui Button**. The scraping method used for each source (Open Source or Firecrawl) is determined by the setting configured for that source. Status information will be displayed indicating the status of the triggered run.
-   **Purge All Articles:** Delete all existing articles from the database using a **shadcn/ui Button** with a destructive style. Use this with caution as it is irreversible. Confirmation will be required before proceeding. Status information will be displayed indicating the status of the purge operation.

## Source Management

This section allows you to view, add, edit, and delete news sources, presented within a **shadcn/ui Card**.

-   **Source Discovery:** Discover potential new news sources. This section is wrapped in a **shadcn/ui Card**.
    -   **Discover Sources:** Initiate the source discovery process using a **shadcn/ui Button**. Status information will be displayed while the discovery process is in progress.
    -   **Discovered Sources List:** Any discovered sources will be listed with their name and URL. An "Add as New Source" **shadcn/ui Button** is available for each discovered source.
-   **Existing Sources:** View a list of all configured news sources.
    -   **Add New Source Button:** A **shadcn/ui Button** to open the modal for adding a new source.
    -   **Sources List:** Each source is displayed within a styled list item, showing its details (name, URL, active status, AI summary setting, scraping method, include/exclude selectors). Action buttons (**shadcn/ui Buttons** for "Scrape Now", "Edit", and "Delete") are available for each source.
-   **Add/Edit Source Modal:** A **shadcn/ui Dialog** component is used for the modal form to add or edit a news source. The form utilizes **shadcn/ui Input**, **Label**, **Select**, **Textarea**, and **Checkbox** components for input fields and controls.

## Source Discovery

This section helps you find potential new news sources to add to your collection. (Note: This section is now integrated into the Source Management card on the Settings page).

---

Next: [Troubleshooting Common Issues](troubleshooting.md)
