# WordPress Widget Integration

Multilingual support has been extended to the WordPress news feed widgets, allowing content to be displayed in English, Spanish, or Haitian Creole.

*   **Elementor Widget (`widgets/mango-news-feed-elementor-widget.php`)**:
    *   A new **"Display Language"** control has been added to the widget settings in Elementor.
    *   Administrators can select the desired language (English, Spanish, or Haitian Creole) for the articles, summaries, topics, and static UI text displayed by that specific widget instance.

*   **Direct HTML/JS Embed (`widgets/mango-news-direct-code.php`)**:
    *   When embedding the news feed directly using the HTML/JS snippet, the display language can be set by modifying the `displayLanguage` property within the JavaScript `config` object.
    *   Example: `displayLanguage: 'es',` for Spanish.
    *   The `translations` object within the JavaScript also contains the necessary strings for each language.

*   **PHP Function & Shortcode (`widgets/mango-news-direct-code.php`)**:
    *   The `mango_news_feed()` PHP function now accepts a `language` argument.
    *   Example usage in a theme template: `<?php mango_news_feed(['language' => 'es']); ?>`
    *   The `[mango_news_feed]` shortcode also accepts a `language` attribute.
    *   Example usage in a post/page: `[mango_news_feed language="ht"]`

The widget will automatically fetch and display the appropriate translated content (titles, summaries, topics) from the API based on the configured language. If a translation is not available for a specific field, it will fall back to the English version.

## Using HTML Files with Elementor

The `widgets/` directory contains several HTML files (`mango-news-content.html`, `mango-news-single-article.html`, `mango-news-styles.html`). These files are designed to be directly pasted into an Elementor HTML Code Widget.

To use them:
1.  Open your WordPress page or post in Elementor.
2.  Drag and drop an "HTML Code" widget onto your page.
3.  Open the desired HTML file from the `widgets/` directory in a text editor.
4.  Copy the entire content of the HTML file.
5.  Paste the copied HTML content directly into the "HTML Code" area of the Elementor widget.
6.  Save your changes in Elementor.

This method allows for quick integration of pre-designed news feed layouts or single article displays without requiring custom PHP development.

## Editing Widgets in Elementor

To edit the news feed or single article widgets once they are placed on a WordPress page:

1.  Log in to your WordPress admin dashboard.
2.  Navigate to the page where the news feed or article widget is embedded.
3.  Click on "Edit with Elementor" at the top of the page.
4.  Within the Elementor editor, you can select and modify the settings of the Elementor widget (if using the Elementor Widget method) or directly edit the HTML/code within the HTML Code Widget (if using the Direct HTML/JS Embed method).

**Note on News Feed Structure:**
For the news feed display, the CSS styling and the JavaScript code are often split into separate files within the `widgets/` directory (e.g., `mango-news-styles.html` for CSS and `mango-news-content.html` for the HTML/JS structure). This separation allows for easier management and customization of the appearance and functionality.
