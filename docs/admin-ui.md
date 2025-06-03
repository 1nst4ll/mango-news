# Settings Page (Admin Controls and Source Management)

The mango.tc news Settings page provides a centralized place to manage your news sources and control administrative functions. This document outlines the key features available on the Settings page, which is built using **React** within the **Astro** frontend and styled with **Tailwind CSS** and **shadcn/ui** components.

## Accessing the Settings Page

The Settings page is typically accessible at the `/settings` route of your frontend application (e.g., `http://localhost:4321/settings` in the Astro development environment).

## Overview & Stats

This section provides statistics about the data stored in the application's database and visual charts.

-   **Database Statistics:** View the total number of articles and sources in the database, displayed within **shadcn/ui Card** components arranged in a row.
-   **Charts:** Visual representations of database statistics are provided:
    -   **Articles per Source:** A vertical **Bar Chart** showing the number of articles from each news source.
    -   **Articles per Year:** A vertical **Bar Chart** showing the number of articles published each year.

## Global Settings & Actions

This section provides overall control and status information for the application, presented within a **shadcn/ui Card**. These AI toggles apply to **manual full scraper runs** and **manual per-source scraper runs**.

-   **For next manual scrape: Generate AI Summaries:** Control to globally enable or disable AI summary generation during manual scraping runs, using a **shadcn/ui Switch** component.
-   **For next manual scrape: Generate AI Tags:** Control to globally enable or disable AI tag generation during manual scraping runs, using a **shadcn/ui Switch** component.
-   **For next manual scrape: Generate AI Images:** Control to globally enable or disable AI image generation during manual scraping runs, using a **shadcn/ui Switch** component.
-   **For next manual scrape: Generate AI Translations:** Control to globally enable or disable AI translation generation during manual scraping runs, using a **shadcn/ui Switch** component.
-   **Trigger Full Scraper Run:** Initiate a scraping process for all active news sources using a **shadcn/ui Button**. The scraping method used for each source (Open Source or Firecrawl) and the global AI toggle settings will be applied. Status information will be displayed indicating the status of the triggered run.
-   **Purge All Articles:** Delete all existing articles from the database using a **shadcn/ui Button** with a destructive style. Use this with caution as it is irreversible. Confirmation will be required before proceeding. Status information will be displayed indicating the status of the purge operation.

## Scheduled Tasks

This section allows you to configure and manage automated background tasks for the news aggregator.

-   **Main Scraper Schedule:**
    -   **Cron Schedule:** An input field to define the cron expression for how frequently the main news scraper runs. A link to `crontab.guru` is provided for assistance with cron syntax.
-   **Missing AI Data Processor Schedule:**
    -   **Cron Schedule:** An input field to define the cron expression for how frequently the processor for missing AI data runs. A link to `crontab.guru` is provided for assistance with cron syntax.
    -   **Process Missing Summaries:** A **shadcn/ui Switch** to enable or disable the scheduled generation of AI summaries for articles that are missing them.
    -   **Process Missing Tags:** A **shadcn/ui Switch** to enable or disable the scheduled generation of AI tags for articles that are missing them.
    -   **Process Missing Images:** A **shadcn/ui Switch** to enable or disable the scheduled generation of AI images for articles that are missing them.
    -   **Process Missing Translations:** A **shadcn/ui Switch** to enable or disable the scheduled generation of AI translations for articles that are missing them.
-   **Save Schedule Settings Button:** A **shadcn/ui Button** to save the configured cron schedules and toggle states to the database.

## Source Management

This section allows you to view, add, edit, and delete news sources, presented within a **shadcn/ui Card**.

-   **Existing Sources:** View a list of all configured news sources.
    -   **Add New Source Button:** A **shadcn/ui Button** to open the modal for adding a new source.
-   **Sources List:** Each source is displayed within a styled list item, showing its details (name, URL, active status, AI summary setting, AI tag setting, AI image setting, AI translation setting, scraping method, include/exclude selectors, article link template, exclude patterns). Action buttons (**shadcn/ui Buttons** for "Scrape Now", "Delete Articles", "Edit", and "Delete Source") are available for each source.
    -   **Process Missing AI Data:** A dedicated section within each source card allows triggering the processing of missing AI-generated data for that specific source. It includes a single button:
        -   **Process All Missing AI Data:** Triggers AI summary, tag, image, and translation generation for articles from this source that are missing these features, *based on the individual AI settings configured for this source*. Status messages are displayed below the button indicating the result of the processing.
-   **View Articles by Source:** A link or button will be added for each source to navigate to a dedicated page displaying all articles associated with that source.
-   **Add/Edit Source Modal:** A **shadcn/ui Dialog** component is used for the modal form to add or edit a news source. The form utilizes **shadcn/ui Input**, **Label**, **Select**, **Textarea**, and **Switch** components for input fields and controls. Fields for "Enable AI Summary", "Enable AI Tags", "Enable AI Image", and "Enable AI Translations" are available to configure these settings **per source**. Additional fields have been added for "Article Link Template" and "Exclude Patterns" to configure open-source scraping behavior.

## Articles by Source Page

A new page is available at `/settings/source/[sourceId]` to view and manage articles for a specific news source. This page is built using **Astro** and utilizes the **SourceArticles** React component.

-   **Article List:** Displays a table of articles for the selected source, including the article title, URL, Thumbnail URL, and status of AI processing (Summary, Tags, Image, Translations).
-   **Actions per Article:** For each article in the list, the following actions are available via **shadcn/ui Buttons**:
    -   **Rerun Summary:** Triggers AI summary generation for this specific article.
    -   **Rerun Tags:** Triggers AI tag assignment for this specific article.
    -   **Rerun Image:** Triggers AI image generation for this specific article.
    -   **Rerun Translations:** Triggers AI translation generation for this specific article.
    -   **Delete:** Deletes the individual article from the database. A confirmation dialog is displayed before deletion.
-   **Processing Status:** Status messages are displayed below the action buttons for each article, indicating the result of AI processing or deletion operations.

---

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
* [Troubleshooting Common Issues](troubleshooting.md)
