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


## gov.tc

**Article URL Pattern:** `https://gov.tc/pressoffice/latest/*`

**Selectors:**

*   **Title:** `h1[itemprop="headline"]`
*   **Author:** `Not found`
*   **Date:** `time[itemprop="datePublished"]`
*   **Content:** `div[itemprop="articleBody"]`
*   **Image:** `div[itemprop="articleBody"] img`

**Notes:**
- The author information was not explicitly found in the standard HTML tags for this article.
- The date selector targets the time tag with the itemprop attribute.
- The content selector targets the div containing the main article body.
- The image selector targets any image tag within the article body div.

---

## turksandcaicoshta.com

**Article URL Pattern:** `https://turksandcaicoshta.com/*`

**Selectors:**

*   **Title:** `h1.fl-post-title`
*   **Author:** `span.fl-post-author`
*   **Date:** `span.fl-post-date`
*   **Content:** `div.fl-post-content.clearfix`
*   **Image:** `div.fl-post-content.clearfix img`

**Notes:**
- The author and date are within the same div with different span classes.

---

Further Documentation:
* [Server Deployment Instructions](../deployment.md)
