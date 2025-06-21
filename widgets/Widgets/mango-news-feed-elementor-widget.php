<?php
/**
 * Mango News Feed Elementor Widget
 */
class Mango_News_Feed_Elementor_Widget extends \Elementor\Widget_Base {

    /**
     * Get widget name
     */
    public function get_name() {
        return 'mango_news_feed';
    }

    /**
     * Get widget title
     */
    public function get_title() {
        return __('Mango News Feed', 'mango-news-feed');
    }

    /**
     * Get widget icon
     */
    public function get_icon() {
        return 'eicon-posts-grid';
    }

    /**
     * Get widget categories
     */
    public function get_categories() {
        return ['general'];
    }

    /**
     * Register widget controls
     */
    protected function _register_controls() {
        // Content Section
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Content Settings', 'mango-news-feed'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'api_url',
            [
                'label' => __('API URL', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => 'https://mango-news.onrender.com/api',
                'description' => __('Enter the base URL of your Mango News API', 'mango-news-feed'),
            ]
        );

        $this->add_control(
            'articles_per_page', // Changed from article_limit
            [
                'label' => __('Articles Per Page', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 12,
                'min' => 1,
                'max' => 100,
                'step' => 1,
                'description' => __('Number of articles to display per page.', 'mango-news-feed'),
            ]
        );

        $this->add_control(
            'article_link_format',
            [
                'label' => __('Article Link Format', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '/news-article/?id=${id}',
                'placeholder' => __('/news-article/?id=${id}', 'mango-news-feed'),
                'description' => __('URL format for single article links. Use ${id} as placeholder for article ID.', 'mango-news-feed'),
            ]
        );

        $this->add_control(
            'open_in_new_tab',
            [
                'label' => __('Open Links in New Tab', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'mango-news-feed'),
                'label_off' => __('No', 'mango-news-feed'),
                'default' => '', // Default to false (empty string for switcher)
            ]
        );

        $this->add_control(
            'show_topics',
            [
                'label' => __('Show Topics', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'mango-news-feed'),
                'label_off' => __('No', 'mango-news-feed'),
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'show_sharing',
            [
                'label' => __('Show Sharing Buttons', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'mango-news-feed'),
                'label_off' => __('No', 'mango-news-feed'),
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'search_term',
            [
                'label' => __('Initial Search Term', 'mango-news-feed'), // Clarified label
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '',
                'description' => __('Pre-fill the search term. Users can change it.', 'mango-news-feed'),
            ]
        );
        
        $this->add_control(
            'selected_sources_csv', // For Elementor UI, take as CSV
            [
                'label' => __('Initial Selected Sources (CSV)', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::TEXTAREA,
                'default' => '',
                'placeholder' => __('e.g., example.com,another-source.org', 'mango-news-feed'),
                'description' => __('Comma-separated list of source hostnames to pre-select. Leave empty for "All Sources".', 'mango-news-feed'),
            ]
        );

        $this->add_control(
            'display_language',
            [
                'label' => __('Display Language', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'en',
                'options' => [
                    'en' => __('English', 'mango-news-feed'),
                    'es' => __('Spanish', 'mango-news-feed'),
                    'ht' => __('Haitian Creole', 'mango-news-feed'),
                ],
                'description' => __('Select the language for article titles, summaries, and UI text.', 'mango-news-feed'),
            ]
        );


        $this->end_controls_section();

        // Style Section
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('Style Settings', 'mango-news-feed'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'cards_per_row',
            [
                'label' => __('Cards per Row (Desktop)', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '3',
                'options' => [
                    '1' => '1',
                    '2' => '2',
                    '3' => '3',
                    '4' => '4',
                ],
                'selectors' => [
                    '{{WRAPPER}} .mango-news-grid' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
                ],
                'description' => __('Select how many cards to show per row on desktop', 'mango-news-feed'),
            ]
        );

        $this->add_control(
            'card_border_radius',
            [
                'label' => __('Card Border Radius', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                        'step' => 1,
                    ],
                    '%' => [
                        'min' => 0,
                        'max' => 50,
                        'step' => 1,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 8,
                ],
                'selectors' => [
                    '{{WRAPPER}} .mango-news-card' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'image_height',
            [
                'label' => __('Image Height', 'mango-news-feed'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 500,
                        'step' => 10,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 200,
                ],
                'selectors' => [
                    '{{WRAPPER}} .mango-news-card-image-container' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();
    }

    /**
     * Group articles by date
     */
    private function group_articles_by_date($articles) {
        $grouped = [];
        
        foreach ($articles as $article) {
            $date = date('F j, Y', strtotime($article->publication_date));
            
            if (!isset($grouped[$date])) {
                $grouped[$date] = [];
            }
            
            $grouped[$date][] = $article;
        }
        
        // Sort dates in descending order
        krsort($grouped);
        
        return $grouped;
    }
    
    /**
     * Extract domain from URL
     */
    private function get_domain_from_url($url) {
        $parsed_url = parse_url($url);
        return isset($parsed_url['host']) ? $parsed_url['host'] : '';
    }
    
    /**
     * Format date for display
     */
    private function format_date($date_string) {
        $date = new DateTime($date_string);
        return $date->format('F j, Y');
    }

    /**
     * Render widget output
     */
    protected function render() {
        $settings = $this->get_settings_for_display();
        $widget_id = 'mango-news-feed-' . $this->get_id(); // Unique ID for this widget instance

        // Prepare selected_sources from CSV string
        $selected_sources_array = array();
        if (!empty($settings['selected_sources_csv'])) {
            $selected_sources_array = array_map('trim', explode(',', $settings['selected_sources_csv']));
        }
        
        ?>
        <div id="<?php echo esc_attr($widget_id); ?>" class="mango-news-container">
            <div id="mango-news-filters-container-<?php echo esc_attr($widget_id); ?>" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <input type="text" id="mango-news-search-input-<?php echo esc_attr($widget_id); ?>" placeholder="Search articles..." style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; flex-grow: 1; min-width: 200px;" value="<?php echo esc_attr($settings['search_term']); ?>">
                <div id="mango-news-source-checkbox-container-<?php echo esc_attr($widget_id); ?>" style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; max-height: 75px !important; overflow-y: auto; min-width: 200px; background-color: white;">
                    <div class="mango-news-source-item" style="display: block; margin-bottom: 5px;">
                        <input type="checkbox" id="mango-news-source-all-<?php echo esc_attr($widget_id); ?>" value="" <?php checked(empty($selected_sources_array)); ?> style="margin-right: 5px;">
                        <label for="mango-news-source-all-<?php echo esc_attr($widget_id); ?>" style="cursor:pointer;">All Sources</label>
                    </div>
                    <!-- Checkboxes will be populated here by JS -->
                </div>
            </div>
            <div class="mango-news-pagination-container mango-news-pagination-top" style="display: none;">
                <div class="mango-news-pagination-wrapper">
                    <div class="mango-news-pagination-results">
                        Showing <span class="mango-news-pagination-start-top">1</span> to <span class="mango-news-pagination-end-top">20</span> of <span class="mango-news-pagination-total-top">0</span> results
                    </div>
                    <div class="mango-news-pagination">
                        <a href="#" class="mango-news-pagination-prev-top" aria-label="Previous page">←</a>
                        <div class="mango-news-pagination-pages-top"></div>
                        <a href="#" class="mango-news-pagination-next-top" aria-label="Next page">→</a>
                    </div>
                </div>
            </div>
            <div class="mango-news-loading">Loading news feed...</div>
            <div class="mango-news-empty" style="display: none;">No news articles found.</div>
            <div class="mango-news-error" style="display: none;">Error loading news feed.</div>
            <div class="mango-news-feed-content" style="display: none;"></div>
            <div class="mango-news-pagination-container mango-news-pagination-bottom" style="display: none;">
                <div class="mango-news-pagination-wrapper">
                    <div class="mango-news-pagination-results">
                        Showing <span class="mango-news-pagination-start">1</span> to <span class="mango-news-pagination-end">20</span> of <span class="mango-news-pagination-total">0</span> results
                    </div>
                    <div class="mango-news-pagination">
                        <a href="#" class="mango-news-pagination-prev" aria-label="Previous page">←</a>
                        <div class="mango-news-pagination-pages"></div>
                        <a href="#" class="mango-news-pagination-next" aria-label="Next page">→</a>
                    </div>
                </div>
            </div>
        </div>

        <script>
        (function() {
            const widgetId = <?php echo json_encode($widget_id); ?>;
            <?php
            $translations = [
                'en' => [
                    'loading' => 'Loading news feed...',
                    'no_articles_found' => 'No news articles found.',
                    'no_articles_match_filters' => 'No articles match your current filters.',
                    'published' => 'Published:',
                    'by' => 'By',
                    'share_whatsapp' => 'Share on WhatsApp',
                    'share_facebook' => 'Share on Facebook',
                    'all_sources' => 'All Sources',
                    'search_articles' => 'Search articles...',
                ],
                'es' => [
                    'loading' => 'Cargando noticias...',
                    'no_articles_found' => 'No se encontraron artículos de noticias.',
                    'no_articles_match_filters' => 'No hay artículos que coincidan con sus filtros actuales.',
                    'published' => 'Publicado:',
                    'by' => 'Por',
                    'share_whatsapp' => 'Compartir en WhatsApp',
                    'share_facebook' => 'Compartir en Facebook',
                    'all_sources' => 'Todas las fuentes',
                    'search_articles' => 'Buscar artículos...',
                ],
                'ht' => [
                    'loading' => 'Chaje nouvèl...',
                    'no_articles_found' => 'Pa gen okenn atik nouvèl yo jwenn.',
                    'no_articles_match_filters' => 'Pa gen okenn atik ki koresponn ak filtè aktyèl ou yo.',
                    'published' => 'Pibliye:',
                    'by' => 'Pa',
                    'share_whatsapp' => 'Pataje sou WhatsApp',
                    'share_facebook' => 'Pataje sou Facebook',
                    'all_sources' => 'Tout sous yo',
                    'search_articles' => 'Chèche atik...',
                ],
            ];
            $current_translations = $translations[$settings['display_language']] ?? $translations['en'];
            ?>
            const config = {
                apiUrl: <?php echo json_encode($settings['api_url']); ?>,
                articlesPerPage: <?php echo intval($settings['articles_per_page']); ?>,
                showTopics: <?php echo ($settings['show_topics'] === 'yes' ? 'true' : 'false'); ?>,
                showSharing: <?php echo ($settings['show_sharing'] === 'yes' ? 'true' : 'false'); ?>,
                searchTerm: <?php echo json_encode($settings['search_term']); ?>,
                selectedSources: <?php echo json_encode($selected_sources_array); ?>,
                articleLinkFormat: <?php echo json_encode($settings['article_link_format']); ?>,
                openInNewTab: <?php echo ($settings['open_in_new_tab'] === 'yes' ? 'true' : 'false'); ?>,
                refreshInterval: 0, // Refresh interval might be better handled globally or disabled for widgets
                debug: true,
                displayLanguage: <?php echo json_encode($settings['display_language']); ?>,
                translations: <?php echo json_encode($current_translations); ?>
            };
            
            let paginationState = {
                currentPage: 1,
                totalPages: 1,
                totalArticles: 0,
                allArticles: [],
                filteredArticles: []
            };
            
            const container = document.getElementById(widgetId);
            const searchInput = document.getElementById('mango-news-search-input-' + widgetId);
            const sourceCheckboxContainer = container.querySelector('#mango-news-source-checkbox-container-' + widgetId);
            const loadingEl = container.querySelector('.mango-news-loading');
            const emptyEl = container.querySelector('.mango-news-empty');
            const errorEl = container.querySelector('.mango-news-error');
            const contentEl = container.querySelector('.mango-news-feed-content');
            
            const paginationContainerBottom = container.querySelector('.mango-news-pagination-bottom');
            const paginationElBottom = paginationContainerBottom.querySelector('.mango-news-pagination');
            const paginationPagesBottom = paginationContainerBottom.querySelector('.mango-news-pagination-pages');
            const prevBtnBottom = paginationContainerBottom.querySelector('.mango-news-pagination-prev');
            const nextBtnBottom = paginationContainerBottom.querySelector('.mango-news-pagination-next');
            const paginationStartBottom = paginationContainerBottom.querySelector('.mango-news-pagination-start');
            const paginationEndBottom = paginationContainerBottom.querySelector('.mango-news-pagination-end');
            const paginationTotalBottom = paginationContainerBottom.querySelector('.mango-news-pagination-total');
            
            const paginationContainerTop = container.querySelector('.mango-news-pagination-top');
            const paginationElTop = paginationContainerTop.querySelector('.mango-news-pagination');
            const paginationPagesTop = paginationContainerTop.querySelector('.mango-news-pagination-pages-top');
            const prevBtnTop = paginationContainerTop.querySelector('.mango-news-pagination-prev-top');
            const nextBtnTop = paginationContainerTop.querySelector('.mango-news-pagination-next-top');
            const paginationStartTop = paginationContainerTop.querySelector('.mango-news-pagination-start-top');
            const paginationEndTop = paginationContainerTop.querySelector('.mango-news-pagination-end-top');
            const paginationTotalTop = paginationContainerTop.querySelector('.mango-news-pagination-total-top');

            // --- Start of pasted JS logic from mango-news-content.html ---
            // (with modifications for widget instance and PHP settings)

            function fetchArticles() {
                loadingEl.style.display = 'block';
                emptyEl.style.display = 'none';
                errorEl.style.display = 'none';
                contentEl.style.display = 'none';
                if(paginationContainerTop) paginationContainerTop.style.display = 'none';
                if(paginationContainerBottom) paginationContainerBottom.style.display = 'none';
                
                let articlesEndpoint = `${config.apiUrl}/articles`;
                // Initial search term from PHP is in config.searchTerm, client-side filtering will apply it.
                
                if (config.debug) {
                    console.log(`[${widgetId}] Fetching all articles from:`, articlesEndpoint);
                }
                
                fetch(articlesEndpoint)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(articles => {
                        loadingEl.style.display = 'none';
                        if (!articles || articles.length === 0) {
                            emptyEl.textContent = config.translations.no_articles_found;
                            emptyEl.style.display = 'block';
                            return;
                        }
                        paginationState.allArticles = articles;
                        populateSourceCheckboxes(articles);
                        try {
                            localStorage.setItem('mangoNewsArticles', JSON.stringify(articles));
                        } catch (e) {
                            console.error(`[${widgetId}] Error storing articles in localStorage:`, e);
                        }
                        applyFiltersAndRender(); 
                        const filtersContainer = document.getElementById('mango-news-filters-container-' + widgetId);
                        if (filtersContainer) filtersContainer.style.display = 'flex';
                    })
                    .catch(error => {
                        console.error(`[${widgetId}] Error fetching articles:`, error);
                        loadingEl.style.display = 'none';
                        errorEl.style.display = 'block';
                        errorEl.innerHTML = `Error loading news feed: ${config.translations.error_loading_feed}: ${error.message}`;
                    });
            }
            
            function populateSourceCheckboxes(articles) { 
                const sources = {}; 
                articles.forEach(article => {
                    if (article.source_url) {
                        try {
                            const hostname = new URL(article.source_url).hostname;
                            const sourceName = article.source_name || hostname.replace(/^www\./, '');
                            if (hostname && !sources[hostname]) {
                                 sources[hostname] = sourceName;
                            }
                        } catch (e) { /* console.warn('Invalid source_url:', article.source_url); */ }
                    }
                });
                const allSourcesCheckbox = document.getElementById('mango-news-source-all-' + widgetId);
                
                const dynamicItems = sourceCheckboxContainer.querySelectorAll('.mango-news-source-item:not(:first-child)');
                dynamicItems.forEach(item => item.remove());

                const sortedHostnames = Object.keys(sources).sort((a,b) => sources[a].localeCompare(sources[b]));

                for (const hostname of sortedHostnames) {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'mango-news-source-item';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `mango-source-${hostname.replace(/\./g, '-')}-${widgetId}`; 
                    checkbox.value = hostname;
                    checkbox.checked = config.selectedSources.includes(hostname);
                    checkbox.addEventListener('change', handleSourceCheckboxChange);
                    const label = document.createElement('label');
                    label.htmlFor = checkbox.id;
                    label.textContent = sources[hostname];
                    itemDiv.appendChild(checkbox);
                    itemDiv.appendChild(label);
                    sourceCheckboxContainer.appendChild(itemDiv);
                }
                
                if (allSourcesCheckbox && !allSourcesCheckbox.dataset.listenerAttached) { 
                    allSourcesCheckbox.addEventListener('change', handleSourceCheckboxChange);
                    allSourcesCheckbox.dataset.listenerAttached = 'true';
                    if (config.selectedSources.length > 0) {
                        allSourcesCheckbox.checked = false;
                    } else {
                        allSourcesCheckbox.checked = true;
                    }
                }
            }

            function handleSourceCheckboxChange(event) {
                const allSourcesCheckbox = document.getElementById('mango-news-source-all-' + widgetId);
                const specificSourceCheckboxes = Array.from(sourceCheckboxContainer.querySelectorAll('input[type="checkbox"]:not(#mango-news-source-all-' + widgetId + ')'));

                if (event.target.id === 'mango-news-source-all-' + widgetId) {
                    if (event.target.checked) {
                        config.selectedSources = [];
                        specificSourceCheckboxes.forEach(cb => cb.checked = false);
                    } else {
                        const anySpecificChecked = specificSourceCheckboxes.some(cb => cb.checked);
                        if (!anySpecificChecked && allSourcesCheckbox) { // Ensure allSourcesCheckbox exists
                           allSourcesCheckbox.checked = true; 
                        }
                    }
                } else { 
                    if (event.target.checked) {
                        if(allSourcesCheckbox) allSourcesCheckbox.checked = false;
                    }
                    config.selectedSources = specificSourceCheckboxes
                        .filter(cb => cb.checked)
                        .map(cb => cb.value);
                    if (config.selectedSources.length === 0 && allSourcesCheckbox) {
                        allSourcesCheckbox.checked = true; 
                    }
                }
                applyFiltersAndRender();
            }

            function applyFiltersAndRender() {
                let articlesToFilter = [...paginationState.allArticles];
                if (config.searchTerm) {
                    const searchTermLower = config.searchTerm.toLowerCase();
                    articlesToFilter = articlesToFilter.filter(article => {
                        const title = article[`title_${config.displayLanguage}`] || article.title;
                        const summary = article[`summary_${config.displayLanguage}`] || article.summary;
                        const content = article[`raw_content_${config.displayLanguage}`] || article.raw_content;

                        return (title && title.toLowerCase().includes(searchTermLower)) ||
                               (summary && summary.toLowerCase().includes(searchTermLower)) ||
                               (content && content.toLowerCase().includes(searchTermLower));
                    });
                }
                if (config.selectedSources.length > 0) {
                    articlesToFilter = articlesToFilter.filter(article => {
                        if (article.source_url) {
                            try {
                                const hostname = new URL(article.source_url).hostname;
                                return config.selectedSources.includes(hostname);
                            } catch (e) { return false; }
                        }
                        return false;
                    });
                }
                paginationState.filteredArticles = articlesToFilter;
                paginationState.totalArticles = articlesToFilter.length; 
                paginationState.totalPages = Math.ceil(articlesToFilter.length / config.articlesPerPage) || 1;
                displayPage(1); 
            }
            
            function displayPage(pageNumber) {
                const articlesForDisplay = paginationState.filteredArticles; 
                const currentTotalPages = paginationState.totalPages > 0 ? paginationState.totalPages : 1;
                if (pageNumber < 1) pageNumber = 1;
                if (pageNumber > currentTotalPages) pageNumber = currentTotalPages;
                paginationState.currentPage = pageNumber;
                const startIndex = (pageNumber - 1) * config.articlesPerPage;
                const endIndex = Math.min(startIndex + config.articlesPerPage, articlesForDisplay.length); 
                const pageArticles = articlesForDisplay.slice(startIndex, endIndex);
                const groupedArticles = groupArticlesByDate(pageArticles);
                let html = '';
                let dateIndex = 0;
                for (const [date, articlesForDate] of Object.entries(groupedArticles)) {
                    if (dateIndex > 0) {
                        html += '<div class="mango-news-date-divider"></div>';
                    }
                    html += `<h2 class="mango-news-date-heading">${date}</h2>`;
                    html += '<div class="mango-news-grid">';
                    for (const article of articlesForDate) {
                        html += renderArticleCard(article);
                    }
                    html += '</div>'; 
                    dateIndex++;
                }
                if (pageArticles.length === 0 && (config.searchTerm || config.selectedSources.length > 0)) {
                    emptyEl.textContent = config.translations.no_articles_match_filters;
                    emptyEl.style.display = 'block';
                    contentEl.style.display = 'none';
                } else if (pageArticles.length === 0) {
                    emptyEl.textContent = config.translations.no_articles_found; 
                    emptyEl.style.display = 'block';
                    contentEl.style.display = 'none';
                } else {
                    emptyEl.style.display = 'none';
                    contentEl.innerHTML = html;
                    contentEl.style.display = 'block';
                }
                setupShareButtons(contentEl);
                updatePaginationControls(); 
            }
            
            function updatePaginationControls() {
                const currentTotalFiltered = paginationState.filteredArticles.length;
                const displayStyle = currentTotalFiltered > 0 ? 'block' : 'none';

                if(paginationContainerTop) paginationContainerTop.style.display = displayStyle;
                if(paginationContainerBottom) paginationContainerBottom.style.display = displayStyle;

                if (currentTotalFiltered > 0) {
                    if (paginationElTop) paginationElTop.style.display = 'flex';
                    if (paginationElBottom) paginationElBottom.style.display = 'flex';
                    try {
                        updatePaginationControlsSection(paginationElTop, paginationPagesTop, prevBtnTop, nextBtnTop);
                        updatePaginationControlsSection(paginationElBottom, paginationPagesBottom, prevBtnBottom, nextBtnBottom);
                    } catch (error) {
                        console.error(`[${widgetId}] Error updating pagination sections:`, error);
                    }
                } else {
                    if (paginationElTop) paginationElTop.style.display = 'none';
                    if (paginationElBottom) paginationElBottom.style.display = 'none';
                }
                const startItem = currentTotalFiltered > 0 ? (paginationState.currentPage - 1) * config.articlesPerPage + 1 : 0;
                const endItem = Math.min(paginationState.currentPage * config.articlesPerPage, currentTotalFiltered);

                if(paginationStartTop) paginationStartTop.textContent = startItem;
                if(paginationEndTop) paginationEndTop.textContent = endItem;
                if(paginationTotalTop) paginationTotalTop.textContent = currentTotalFiltered;
                if(paginationStartBottom) paginationStartBottom.textContent = startItem;
                if(paginationEndBottom) paginationEndBottom.textContent = endItem;
                if(paginationTotalBottom) paginationTotalBottom.textContent = currentTotalFiltered;
            }
            
            function updatePaginationControlsSection(paginationEl, paginationPages, prevBtn, nextBtn) {
                if (!paginationEl || !paginationPages || !prevBtn || !nextBtn) return; 
                if (!paginationState.filteredArticles || paginationState.filteredArticles.length === 0) {
                    paginationEl.style.display = 'none'; 
                    return;
                }
                paginationEl.style.display = 'flex'; 
                paginationPages.innerHTML = '';
                const totalPages = paginationState.totalPages;
                const currentPage = paginationState.currentPage;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + 4);
                if (endPage === totalPages) {
                    startPage = Math.max(1, endPage - 4);
                }
                if (totalPages <= 5) {
                    startPage = 1;
                    endPage = totalPages;
                }
                for (let i = startPage; i <= endPage; i++) {
                    const pageLink = document.createElement('a');
                    pageLink.href = '#';
                    pageLink.textContent = i;
                    pageLink.classList.add('mango-news-pagination-page');
                    if (i === currentPage) {
                        pageLink.classList.add('active');
                    }
                    pageLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        displayPage(i);
                        container.scrollIntoView({ behavior: 'smooth' });
                    });
                    paginationPages.appendChild(pageLink);
                }
                prevBtn.classList.toggle('disabled', currentPage <= 1);
                nextBtn.classList.toggle('disabled', currentPage >= totalPages);
            }
            
            function groupArticlesByDate(articles) {
                const grouped = {};
                for (const article of articles) {
                    const date = new Date(article.publication_date);
                    const dateStr = date.toLocaleDateString(config.displayLanguage === 'en' ? 'en-US' : config.displayLanguage, { year: 'numeric', month: 'long', day: 'numeric' });
                    if (!grouped[dateStr]) {
                        grouped[dateStr] = [];
                    }
                    grouped[dateStr].push(article);
                }
                return Object.fromEntries(
                    Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0]))
                );
            }
            
            function renderArticleCard(article) {
                const articleLink = config.articleLinkFormat.replace('${id}', article.id);
                const targetAttr = config.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
                
                const title = article[`title_${config.displayLanguage}`] || article.title || 'Untitled';
                const summary = article[`summary_${config.displayLanguage}`] || article.summary || '';
                const topics = article[`topics_${config.displayLanguage}`] || article.topics || [];

                let html = `<div class="mango-news-card-wrapper">`;
                html += `<a href="${articleLink}" class="mango-news-card" data-article-id="${article.id}"${targetAttr}>`;
                if (article.thumbnail_url) {
                    html += `<div class="mango-news-card-image-container"><img class="mango-news-card-image" src="${article.thumbnail_url}" alt="${title}">`;
                    if (config.showTopics && topics.length > 0) {
                        html += '<div class="mango-news-card-topics">';
                        for (const topic of topics) {
                            html += `<span class="mango-news-topic-tag">${topic}</span>`;
                        }
                        html += '</div>';
                    }
                    html += '</div>'; 
                }
                html += `<div class="mango-news-card-header"><h3 class="mango-news-card-title">${title}</h3><div class="mango-news-card-meta">`;
                const domain = getDomainFromUrl(article.source_url || '');
                html += `<span class="mango-news-source">${domain}</span>`;
                if (article.author) {
                    html += ` | <span class="mango-news-author">${config.translations.by} ${article.author}</span>`;
                }
                if (article.publication_date) {
                    const pubDate = new Date(article.publication_date);
                    html += ` | <span class="mango-news-date">${config.translations.published} ${pubDate.toLocaleDateString(config.displayLanguage === 'en' ? 'en-US' : config.displayLanguage)}</span>`;
                }
                html += `</div></div>`;
                let formattedSummary = summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html += `<div class="mango-news-card-content"><div class="mango-news-card-summary">${formattedSummary}</div></div>`;
                html += '</a>'; 
                if (config.showSharing) {
                    html += `<div class="mango-news-share-buttons" data-article-id="${article.id}" data-article-title="${encodeURIComponent(title)}"><a href="#" class="mango-news-share-button mango-news-share-whatsapp">${config.translations.share_whatsapp}</a><a href="#" class="mango-news-share-button mango-news-share-facebook">${config.translations.share_facebook}</a></div>`;
                }
                html += '</div>'; 
                return html;
            }
            
            function getDomainFromUrl(url) {
                try {
                    const parsedUrl = new URL(url);
                    return parsedUrl.hostname;
                } catch (e) {
                    // console.error("Invalid URL:", url, e); 
                    return url; 
                }
            }
            
            function setupShareButtons(containerElement) { 
                if (!config.showSharing) return;
                const whatsappButtons = containerElement.querySelectorAll('.mango-news-share-whatsapp');
                whatsappButtons.forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const shareDiv = this.closest('.mango-news-share-buttons');
                        const articleId = shareDiv.dataset.articleId;
                        const articleTitle = decodeURIComponent(shareDiv.dataset.articleTitle);
                        const articleUrl = window.location.origin + config.articleLinkFormat.replace('${id}', articleId);
                        const shareText = `${config.translations.check_out_article}: ${articleTitle} - ${articleUrl}`; // New translation key
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                        window.open(whatsappUrl, '_blank');
                    });
                });
                const facebookButtons = containerElement.querySelectorAll('.mango-news-share-facebook');
                facebookButtons.forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const shareDiv = this.closest('.mango-news-share-buttons');
                        const articleId = shareDiv.dataset.articleId;
                        const articleUrl = window.location.origin + config.articleLinkFormat.replace('${id}', articleId);
                        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
                        window.open(facebookUrl, '_blank');
                    });
                });
            }
            
            if(searchInput) { 
                let searchDebounceTimer;
                searchInput.placeholder = config.translations.search_articles; // Update placeholder
                searchInput.addEventListener('input', function() {
                    clearTimeout(searchDebounceTimer);
                    searchDebounceTimer = setTimeout(() => {
                        config.searchTerm = this.value;
                        applyFiltersAndRender();
                    }, 300); 
                });
            }

            // Initial call to fetch articles
            fetchArticles(); 
            
            if (config.refreshInterval > 0) {
                setInterval(fetchArticles, config.refreshInterval);
            }
        })();
        </script>
        <?php
    }
}
