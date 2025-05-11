# CSS Selectors Documentation

This document provides a guide to identifying and using CSS selectors for scraping various websites.

## General Principles

-   Use browser developer tools (usually F12) to inspect the HTML structure of the page you want to scrape.
-   Identify unique classes, IDs, or tag structures that reliably contain the data you need (e.g., article title, content, date, author).
-   More specific selectors are generally better, but avoid overly complex or deeply nested selectors that might break if the site structure changes slightly.
-   Use online CSS selector testers to verify your selectors.

## Common Selectors for News Articles (WordPress Examples)

Many news websites are built on platforms like WordPress, which often use standard class names.

-   **Article Title:**
    -   `h1.entry-title`
    -   `.single-title`
    -   `article header h1`
-   **Article Content:**
    -   `.entry-content`
    -   `div.article-content`
    -   `main article .content`
-   **Publication Date:**
    -   `.entry-date`
    -   `time.published`
    -   `span.date`
-   **Author:**
    -   `.author`
    -   `.vcard fn`
    -   `span.author-name`
-   **Thumbnail/Featured Image:**
    -   `.post-thumbnail img` (use `::src` to get the image URL)
    -   `.featured-image img` (use `::src` to get the image URL)
    -   `meta[property='og:image']` (use `::content` to get the image URL from meta tags)

## Selectors for turksandcaicoshta.com

Based on the structure observed from scraping:

-   **Article Title:** `h1.entry-title`
-   **Article Content:** `.fl-post-content` (This seems to be the main content wrapper based on the markdown structure)
-   **Publication Date:** `.fl-post-meta .fl-post-date`
-   **Author:** `.fl-post-meta .vcard fn`
-   **Thumbnail:** `meta[property='og:image']::content` (Using the meta tag is often more reliable for the main thumbnail)
-   **Topics/Categories:** `.fl-post-cats a` (This targets the links within the category list)

Remember to verify these selectors using browser developer tools on the actual website.

## Updating Documentation

After successfully identifying and using selectors for a new source, update this document with the specific selectors used for that source to maintain a record.
