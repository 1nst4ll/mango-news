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
-   **Enable AI Tags:** Control to globally enable or disable AI tag generation during scraping runs, using a **shadcn/ui Switch** component.
-   **Trigger Full Scraper Run:** Initiate a scraping process for all active news sources using a **shadcn/ui Button**. The scraping method used for each source (Open Source or Firecrawl) and the AI toggle settings (global and per-source) will be applied. Status information will be displayed indicating the status of the triggered run.
-   **Purge All Articles:** Delete all existing articles from the database using a **shadcn/ui Button** with a destructive style. Use this with caution as it is irreversible. Confirmation will be required before proceeding. Status information will be displayed indicating the status of the purge operation.

## Source Management

This section allows you to view, add, edit, and delete news sources, presented within a **shadcn/ui Card**.

-   **Source Discovery:** Discover potential new news sources. This section is wrapped in a **shadcn/ui Card**.
    -   **Discover Sources:** Initiate the source discovery process using a **shadcn/ui Button**. Status information will be displayed while the discovery process is in progress.
    -   **Discovered Sources List:** Any discovered sources will be listed with their name and URL. An "Add as New Source" **shadcn/ui Button** is available for each discovered source.
-   **Existing Sources:** View a list of all configured news sources.
    -   **Add New Source Button:** A **shadcn/ui Button** to open the modal for adding a new source.
-   **Sources List:** Each source is displayed within a styled list item, showing its details (name, URL, active status, AI summary setting, AI tag setting, AI image setting, scraping method, include/exclude selectors, article link template, exclude patterns). Action buttons (**shadcn/ui Buttons** for "Scrape Now", "Delete Articles", "Edit", and "Delete Source") are available for each source.
    -   **Process Missing AI Data:** A dedicated section within each source card allows triggering the processing of missing AI-generated data for that specific source. It includes buttons (**shadcn/ui Buttons**) for:
        -   "Process Missing Summary": Triggers AI summary generation for articles from this source that are missing a summary.
        -   "Process Missing Tags": Triggers AI tag assignment for articles from this source that are missing tags.
        -   "Process Missing Image": Triggers AI image generation for articles from this source that are missing a thumbnail and an AI image.
        Status messages are displayed below each button indicating the result of the processing. These buttons are disabled if the corresponding AI feature is disabled for the source.
-   **View Articles by Source:** A link or button will be added for each source to navigate to a dedicated page displaying all articles associated with that source.
-   **Add/Edit Source Modal:** A **shadcn/ui Dialog** component is used for the modal form to add or edit a news source. The form utilizes **shadcn/ui Input**, **Label**, **Select**, **Textarea**, and **Switch** components for input fields and controls. Fields for "Enable AI Summary", "Enable AI Tags", and "Enable AI Image" are available to configure these settings per source. Additional fields have been added for "Article Link Template" and "Exclude Patterns" to configure open-source scraping behavior.

## Articles by Source Page

A new page is available at `/settings/source/[sourceId]` to view and manage articles for a specific news source. This page is built using **Astro** and utilizes the **SourceArticles** React component.

-   **Article List:** Displays a table of articles for the selected source, including the article title, URL, Thumbnail URL, and status of AI processing (Summary, Tags, Image).
-   **Actions per Article:** For each article in the list, the following actions are available via **shadcn/ui Buttons**:
    -   **Rerun Summary:** Triggers AI summary generation for this specific article.
    -   **Rerun Tags:** Triggers AI tag assignment for this specific article.
    -   **Rerun Image:** Triggers AI image generation for this specific article.
    -   **Delete:** Deletes the individual article from the database. A confirmation dialog is displayed before deletion.
-   **Processing Status:** Status messages are displayed below the action buttons for each article, indicating the result of AI processing or deletion operations.

---

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
* [Troubleshooting Common Issues](troubleshooting.md)
