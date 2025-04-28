# CSS Selectors for Scraping

This document lists CSS selectors identified for scraping various websites for the Mango News project.

## tcweeklynews.com

**Article URL Pattern:** `https://tcweeklynews.com/*-p\d+-\d+.htm`

**Selectors:**

*   **Title:** `h1.pageheading.layout_pageheading`
*   **Author:** `div.pagebyline.layout_pagebyline`
*   **Date:** `div.pageissuedate.layout_pageissuedate`
*   **Content:** `.pagebody.layout_pagebody`

**Notes:**
- The content selector targets the main container div holding the article text. Openscraper should be able to extract the text content from this block.
- The date and author are in separate divs within the same table cell, consider this when extracting.

---

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
