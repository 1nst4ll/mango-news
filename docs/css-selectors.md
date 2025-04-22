# Using CSS Selectors for Scraping

CSS selectors are a fundamental part of web scraping, allowing you to pinpoint specific elements on a web page from which to extract data. In Mango News, CSS selectors are used by the [open-source scraping method](scraping-methods.md#open-source-scraping-puppeteerplaywright) to identify the title, content, date, author, thumbnail, and topics of an article.

## What are CSS Selectors?

CSS selectors are patterns used to select the elements you want to style or, in this case, extract data from. They are the same selectors used in CSS (Cascading Style Sheets) to apply styles to HTML elements.

## How to Use CSS Selectors in Mango News

When configuring a news source in the Admin UI and selecting the "Open Source" scraping method, you will be prompted to provide CSS selectors for various parts of an article:

-   **Include Selectors:** These selectors identify the main containers of the article content. You can provide multiple selectors separated by commas if the article content is spread across different elements. The scraper will include the content within all matching elements.
-   **Exclude Selectors:** These selectors identify elements within the "include" areas that you want to ignore or remove. This is useful for filtering out ads, related articles sections, comments, or other irrelevant content. You can provide multiple selectors separated by commas.
-   **Title Selector:** A single selector that points to the HTML element containing the article's title.
-   **Date Selector:** A single selector that points to the element containing the publication date.
-   **Author Selector:** A single selector that points to the element containing the author's name.
-   **Thumbnail Selector:** A single selector that points to an image element or an element containing an image, from which the `src` attribute will be extracted for the thumbnail URL.
-   **Topics Selector:** A single selector that points to elements containing article topics or tags. The scraper will extract the text content of all matching elements.

## Common CSS Selector Types

Here are some common types of CSS selectors you might use:

-   **Element Selector:** Selects elements based on their HTML tag name (e.g., `p`, `a`, `div`).
    ```css
    p { /* Selects all paragraph elements */ }
    ```
-   **Class Selector:** Selects elements with a specific class attribute (e.g., `.article-content`).
    ```css
    .article-content { /* Selects all elements with the class "article-content" */ }
    ```
-   **ID Selector:** Selects an element with a specific ID attribute (e.g., `#main-article`). IDs are unique within a page.
    ```css
    #main-article { /* Selects the element with the ID "main-article" */ }
    ```
-   **Attribute Selector:** Selects elements based on their attributes and attribute values (e.g., `[href]`, `[data-type="article"]`).
    ```css
    a[href^="http"] { /* Selects all <a> elements whose href attribute starts with "http" */ }
    ```
-   **Descendant Selector:** Selects an element that is a descendant of another element (e.g., `.article-body p`).
    ```css
    .article-body p { /* Selects all paragraph elements within an element with the class "article-body" */ }
    ```
-   **Child Selector:** Selects an element that is a direct child of another element (e.g., `.article-list > li`).
    ```css
    .article-list > li { /* Selects all <li> elements that are direct children of an element with the class "article-list" */ }
    ```
-   **Combinations:** Selectors can be combined to create more specific selections (e.g., `div.content p.text`).

## Tips for Finding Selectors

-   **Use Browser Developer Tools:** The most effective way to find CSS selectors is by using the developer tools in your web browser (usually accessed by pressing F12). Inspect the element you want to scrape and examine its HTML structure, classes, and IDs.
-   **Look for Unique Identifiers:** Try to find selectors that are specific to the content you want to extract and are less likely to change. IDs are usually the most unique, followed by specific class names.
-   **Test Your Selectors:** Use the browser's developer console to test your CSS selectors (`document.querySelectorAll('your-selector')`) to ensure they select the correct elements.
-   **Be Mindful of Website Changes:** Websites can change their HTML structure and class names, which may break your selectors. You may need to update your selectors periodically.

---

Next: [Admin UI Features (Source Management and Discovery)](admin-ui.md)
