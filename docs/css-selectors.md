# CSS Selectors for Magnetic Media Articles

This document outlines the CSS selectors identified for scraping article content from magneticmediatv.com.

**Article Page (e.g., https://magneticmediatv.com/2025/04/understanding-the-power-of-culture-in-a-small-island-nation-like-tci/)**

- **Article Title:** `h1.mvp-post-title`
- **Article Content:** `#mvp-content-main`
- **Author Name:** `span.author-name`
- **Publish Date:** `span.mvp-post-date.updated`
- **Article Image:** `#mvp-post-feat-img img`
- **Article Link Format:** `https://magneticmediatv.com/{year}/{month}/{slug}/`

# CSS Selectors for NewslineTCI Articles

This section outlines the CSS selectors identified for scraping article content from newslinetci.com.

**Article Page (e.g., https://www.newslinetci.com/post/male-charged-with-unlawful-entry-following-police-operation-in-leeward-palms)**

- **Article Title:** `h1[data-hook="post-title"]`
- **Article Content:** `div[data-id="content-viewer"]`
- **Author Name:** `a[data-hook="profile-link"] span[data-hook="user-name"]`
- **Publish Date:** `span[data-hook="time-ago"]`
- **Article Image:** `figure.uaIq8 wow-image::data-image-info::uri` (Note: This selector extracts the `uri` from the `data-image-info` attribute of the `wow-image` element. The full image URL is constructed in the scraper using `https://static.wixstatic.com/media/` and the extracted `uri`.)
- **Article Link Format:** `https://www.newslinetci.com/post/{slug}`

# CSS Selectors for SUN TCI Articles

This section outlines the CSS selectors identified for scraping article content from suntci.com.

**Article Page (e.g., https://suntci.com/grace-bay-resorts-celebrate-outstanding-staff-at-quarterly-awards-ceremony-p12614-129.htm)**

- **Article Title:** `h1.cus-default-heading`
- **Article Content:** `div.cus-default-body`
- **Author Name:** `span.cus-default-byline span.text-primary`
- **Publish Date:** `span.cus-default-date span.cus-default-date-text`
- **Article Image:** `figure.cus-default-figure img::src`
- **Article Link Format:** `https://suntci.com/{slug}-p{id1}-{id2}.htm` (Note: This pattern is based on observed article URLs. Feedback from the scraping process indicates that the scraper's current link matching logic may not be correctly identifying all valid article links on this site, potentially due to strict matching or other factors. The scraper implementation might need adjustment to handle variations or ensure correct pattern application.)
