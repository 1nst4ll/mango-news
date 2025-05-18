<?php
/**
 * Mango News Direct Code Insert
 * 
 * This file contains code that can be directly inserted into a WordPress page
 * using Elementor's HTML widget, a custom PHP code plugin, or directly in a template file.
 */

/**
 * Direct Code for Elementor HTML Widget
 * 
 * Copy everything between the START COPY and END COPY comments
 * and paste it into an Elementor HTML widget.
 */

// START COPY FOR ELEMENTOR HTML WIDGET
?>
<style>
/* Mango News Feed Styles */

/* Filter Controls Styles */
#mango-news-filters-container {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

#mango-news-search-input {
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    flex-grow: 1; /* Allows search input to take available space */
    min-width: 200px; /* Minimum width before wrapping */
}

/* Styles for the new source checkbox container */
#mango-news-source-checkbox-container {
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 4px;
    max-height: 75px !important; /* Control height, make it scrollable */
    overflow-y: auto;
    min-width: 200px; 
    background-color: white;
    font-size: 14px;
}

.mango-news-source-item {
    display: block; /* Each item on a new line */
    margin-bottom: 5px; /* Spacing between items */
}

.mango-news-source-item input[type="checkbox"] {
    margin-right: 5px;
    vertical-align: middle;
}

.mango-news-source-item label {
    cursor: pointer;
    vertical-align: middle;
}

.mango-news-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.mango-news-date-heading {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 20px;
    color: var(--e-global-color-primary, #333);
}

.mango-news-date-divider {
    margin: 30px 0;
    border-top: 1px solid rgba(0,0,0,0.1);
}

.mango-news-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 20px;
    margin-bottom: 20px;
    width: 100%;
}

@media (min-width: 768px) {
    .mango-news-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1024px) {
    .mango-news-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.mango-news-card-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    background-color: #fff;
}

.mango-news-card-wrapper:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px rgba(0,0,0,0.1);
}

.mango-news-card {
    display: flex;
    flex-direction: column;
    flex: 1;
    text-decoration: none !important;
    color: inherit !important;
}

.mango-news-card-image-container {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
}

.mango-news-card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.mango-news-card-topics {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
    background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.mango-news-topic-tag {
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background-color: #4169E1;
    border-radius: 50px;
}

.mango-news-card-header {
    padding: 16px;
}

.mango-news-card-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #333;
    line-height: 1.4;
}

.mango-news-card-meta {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
}

.mango-news-card-content {
    padding: 0 16px 16px;
    flex-grow: 1;
}

.mango-news-card-summary {
    color: #333;
    line-height: 1.6;
}

.mango-news-card-summary strong {
    color: #000;
}

.mango-news-share-buttons {
    display: flex;
    gap: 16px;
    padding: 0 16px 16px;
    width: 100%;
    box-sizing: border-box;
}

.mango-news-share-button {
    font-size: 14px;
    color: #4169E1 !important;
    text-decoration: none !important;
    cursor: pointer;
}

.mango-news-share-button:hover {
    text-decoration: underline !important;
}

.mango-news-loading {
    text-align: center;
    padding: 40px;
    font-size: 18px;
}

.mango-news-error {
    text-align: center;
    padding: 40px;
    color: #dc3545;
}

.mango-news-empty {
    text-align: center;
    padding: 40px;
    color: #666;
}

/* Pagination styles */
.mango-news-pagination-container.mango-news-pagination-top {
    margin-bottom: 20px; 
    border-bottom: 1px solid #eaeaea; 
    padding-bottom: 20px; 
}

.mango-news-pagination-container.mango-news-pagination-bottom {
    margin-top: 40px; 
    border-top: 1px solid #eaeaea; 
    padding-top: 20px; 
}

.mango-news-pagination-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.mango-news-pagination-results {
    text-align: left;
    color: #666;
    font-size: 14px;
    margin: 0;
}

.mango-news-pagination-start,
.mango-news-pagination-end,
.mango-news-pagination-total {
    color: #000;
    font-weight: bold;
}

.mango-news-pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 5px;
    margin: 0;
}

.mango-news-pagination a {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid #e6e6e6;
    border-radius: 4px; 
    text-decoration: none;
    color: #666;
    font-size: 16px;
    transition: all 0.2s ease;
    background-color: white;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.mango-news-pagination a:hover:not(.disabled) {
    background-color: #f7f7f7;
    border-color: #e6e6e6;
}

.mango-news-pagination a.active {
    background-color: #ff7d4d; 
    color: white;
    border-color: #ff7d4d;
}

.mango-news-pagination a:focus {
    outline: none;
    border-color: #ff7d4d;
}

.mango-news-pagination a.disabled {
    color: #ccc;
    cursor: not-allowed;
}

.mango-news-pagination-pages,
.mango-news-pagination-pages-top { 
    display: flex;
    gap: 5px; 
    flex-wrap: nowrap;
}

.mango-news-pagination-prev,
.mango-news-pagination-next {
    color: #ff7d4d; 
}
</style>

<div id="mango-news-feed-container" class="mango-news-container">
    <div id="mango-news-filters-container" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <input type="text" id="mango-news-search-input" placeholder="Search articles..." style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; flex-grow: 1; min-width: 200px;">
        <div id="mango-news-source-checkbox-container" style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; max-height: 75px !important; overflow-y: auto; min-width: 200px; background-color: white;">
            <div class="mango-news-source-item" style="display: block; margin-bottom: 5px;">
                <input type="checkbox" id="mango-news-source-all" value="" checked style="margin-right: 5px;">
                <label for="mango-news-source-all" style="cursor:pointer;">All Sources</label>
            </div>
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
    // Configuration (change these values as needed)
    const config = {
        apiUrl: 'https://mango-news.onrender.com/api', 
        articlesPerPage: 12,
        showTopics: true,
        showSharing: true,
        searchTerm: '',
        selectedSources: [], 
        refreshInterval: 5 * 60 * 1000, 
        articleLinkFormat: '/news-article/?id=${id}', 
        openInNewTab: false, 
        debug: true 
    };
    
    let paginationState = {
        currentPage: 1,
        totalPages: 1,
        totalArticles: 0, 
        allArticles: [], 
        filteredArticles: [] 
    };
    
    const container = document.getElementById('mango-news-feed-container');
    const searchInput = document.getElementById('mango-news-search-input'); 
    const sourceCheckboxContainer = document.getElementById('mango-news-source-checkbox-container'); 
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
    
    function fetchArticles() {
        loadingEl.style.display = 'block';
        emptyEl.style.display = 'none';
        errorEl.style.display = 'none';
        contentEl.style.display = 'none';
        paginationContainerTop.style.display = 'none';
        paginationContainerBottom.style.display = 'none';
        
        let articlesEndpoint = `${config.apiUrl}/articles`;
        // Server-side search for initial load is not implemented with current API for /articles.
        // If searchTerm is pre-filled (e.g. from PHP args), it will be applied client-side after fetch.
        
        if (config.debug) {
            console.log('Fetching all articles from:', articlesEndpoint);
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
                    emptyEl.textContent = "No news articles found."; // Ensure default message
                    emptyEl.style.display = 'block';
                    return;
                }
                paginationState.allArticles = articles;
                populateSourceCheckboxes(articles); // Changed from populateSourcePicker
                try {
                    localStorage.setItem('mangoNewsArticles', JSON.stringify(articles));
                } catch (e) {
                    console.error('Error storing articles in localStorage:', e);
                }
                applyFiltersAndRender(); 
                const filtersContainer = document.getElementById('mango-news-filters-container');
                if (filtersContainer) filtersContainer.style.display = 'flex';
                
                // Visibility of content/pagination is handled by applyFiltersAndRender -> displayPage -> updatePaginationControls
            })
            .catch(error => {
                console.error('Error fetching articles:', error);
                loadingEl.style.display = 'none';
                errorEl.style.display = 'block';
                errorEl.innerHTML = `Error loading news feed: ${error.message}`;
                if (config.debug) {
                    const debugInfo = document.createElement('div');
                    debugInfo.style.fontSize = '12px';
                    debugInfo.style.marginTop = '10px';
                    debugInfo.style.color = '#777';
                    debugInfo.innerHTML = `<p>Debug Information:</p><p>API URL: ${articlesEndpoint}</p><p>Error: ${error.toString()}</p><p>Check your browser console for more details.</p>`;
                    errorEl.appendChild(debugInfo);
                }
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
        const allSourcesCheckboxItem = sourceCheckboxContainer.querySelector('.mango-news-source-item:first-child'); // Keep the static "All Sources"
        
        // Clear only dynamically added source checkboxes
        const dynamicItems = sourceCheckboxContainer.querySelectorAll('.mango-news-source-item:not(:first-child)');
        dynamicItems.forEach(item => item.remove());

        const sortedHostnames = Object.keys(sources).sort((a,b) => sources[a].localeCompare(sources[b]));

        for (const hostname of sortedHostnames) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'mango-news-source-item';
            // itemDiv.style.display = 'block'; // These styles are now in CSS
            // itemDiv.style.marginBottom = '5px';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `mango-source-${hostname.replace(/\./g, '-')}`; 
            checkbox.value = hostname;
            // checkbox.style.marginRight = '5px'; // Moved to CSS
            checkbox.addEventListener('change', handleSourceCheckboxChange);

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = sources[hostname];
            // label.style.cursor = 'pointer'; // Moved to CSS

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            sourceCheckboxContainer.appendChild(itemDiv);
        }
        
        const allSourcesCheckbox = document.getElementById('mango-news-source-all');
        if (allSourcesCheckbox && !allSourcesCheckbox.dataset.listenerAttached) { // Avoid multiple listeners
            allSourcesCheckbox.addEventListener('change', handleSourceCheckboxChange);
            allSourcesCheckbox.dataset.listenerAttached = 'true';
        }
    }

    function handleSourceCheckboxChange(event) {
        const allSourcesCheckbox = document.getElementById('mango-news-source-all');
        const specificSourceCheckboxes = Array.from(sourceCheckboxContainer.querySelectorAll('input[type="checkbox"]:not(#mango-news-source-all)'));

        if (event.target.id === 'mango-news-source-all') {
            if (event.target.checked) {
                config.selectedSources = [];
                specificSourceCheckboxes.forEach(cb => cb.checked = false);
            } else {
                // If user unchecks "All Sources" and nothing else is checked, re-check "All Sources"
                // This prevents a state where nothing is selected if "All" is the only thing unchecked.
                const anySpecificChecked = specificSourceCheckboxes.some(cb => cb.checked);
                if (!anySpecificChecked) {
                    event.target.checked = true; 
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
            articlesToFilter = articlesToFilter.filter(article => 
                (article.title && article.title.toLowerCase().includes(searchTermLower)) ||
                (article.summary && article.summary.toLowerCase().includes(searchTermLower)) ||
                (article.content && article.content.toLowerCase().includes(searchTermLower)) 
            );
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
        // updatePaginationControls(); // Called within displayPage
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
        if (pageArticles.length === 0 && articlesForDisplay.length > 0) {
            emptyEl.textContent = "No articles match your current filters.";
            emptyEl.style.display = 'block';
            contentEl.style.display = 'none';
        } else if (pageArticles.length === 0 && articlesForDisplay.length === 0 && (config.searchTerm || config.selectedSources.length > 0)) {
            emptyEl.textContent = "No articles match your current filters.";
            emptyEl.style.display = 'block';
            contentEl.style.display = 'none';
        }
         else if (pageArticles.length === 0 && articlesForDisplay.length === 0) {
            emptyEl.textContent = "No news articles found."; 
            emptyEl.style.display = 'block';
            contentEl.style.display = 'none';
        }    
        else {
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
        paginationContainerTop.style.display = displayStyle;
        paginationContainerBottom.style.display = displayStyle;
        if (currentTotalFiltered > 0) {
            if (paginationElTop) paginationElTop.style.display = 'flex';
            if (paginationElBottom) paginationElBottom.style.display = 'flex';
            try {
                updatePaginationControlsSection(paginationElTop, paginationPagesTop, prevBtnTop, nextBtnTop);
                updatePaginationControlsSection(paginationElBottom, paginationPagesBottom, prevBtnBottom, nextBtnBottom);
            } catch (error) {
                console.error('Error updating pagination sections:', error);
            }
        } else {
            if (paginationElTop) paginationElTop.style.display = 'none';
            if (paginationElBottom) paginationElBottom.style.display = 'none';
        }
        const startItem = currentTotalFiltered > 0 ? (paginationState.currentPage - 1) * config.articlesPerPage + 1 : 0;
        const endItem = Math.min(paginationState.currentPage * config.articlesPerPage, currentTotalFiltered);
        paginationStartTop.textContent = startItem;
        paginationEndTop.textContent = endItem;
        paginationTotalTop.textContent = currentTotalFiltered;
        paginationStartBottom.textContent = startItem;
        paginationEndBottom.textContent = endItem;
        paginationTotalBottom.textContent = currentTotalFiltered;
    }
    
    function updatePaginationControlsSection(paginationEl, paginationPages, prevBtn, nextBtn) {
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
            const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
        let html = `<div class="mango-news-card-wrapper">`;
        html += `<a href="${articleLink}" class="mango-news-card" data-article-id="${article.id}"${targetAttr}>`;
        if (article.thumbnail_url) {
            html += `<div class="mango-news-card-image-container"><img class="mango-news-card-image" src="${article.thumbnail_url}" alt="${article.title || 'News article'}">`;
            if (config.showTopics && article.topics && article.topics.length > 0) {
                html += '<div class="mango-news-card-topics">';
                for (const topic of article.topics) {
                    html += `<span class="mango-news-topic-tag">${topic}</span>`;
                }
                html += '</div>';
            }
            html += '</div>'; 
        }
        html += `<div class="mango-news-card-header"><h3 class="mango-news-card-title">${article.title || 'Untitled'}</h3><div class="mango-news-card-meta">`;
        const domain = getDomainFromUrl(article.source_url || '');
        html += `<span class="mango-news-source">${domain}</span>`;
        if (article.author) {
            html += ` | <span class="mango-news-author">By ${article.author}</span>`;
        }
        if (article.publication_date) {
            const pubDate = new Date(article.publication_date);
            html += ` | <span class="mango-news-date">Published: ${pubDate.toLocaleDateString()}</span>`;
        }
        html += `</div></div>`;
        let summary = article.summary || '';
        summary = summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<div class="mango-news-card-content"><div class="mango-news-card-summary">${summary}</div></div>`;
        html += '</a>'; 
        if (config.showSharing) {
            html += `<div class="mango-news-share-buttons" data-article-id="${article.id}" data-article-title="${encodeURIComponent(article.title || 'News article')}"><a href="#" class="mango-news-share-button mango-news-share-whatsapp">Share on WhatsApp</a><a href="#" class="mango-news-share-button mango-news-share-facebook">Share on Facebook</a></div>`;
        }
        html += '</div>'; 
        return html;
    }
    
    function getDomainFromUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname;
        } catch (e) {
            console.error("Invalid URL:", url, e);
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
                const shareText = `Check out this article: ${articleTitle} - ${articleUrl}`;
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
    
    let searchDebounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            config.searchTerm = this.value;
            applyFiltersAndRender();
        }, 300); 
    });

    // Event listeners for checkboxes are added dynamically in populateSourcePicker
    // and for "All Sources" checkbox.

    prevBtnBottom.addEventListener('click', function(e) {
        e.preventDefault();
        if (paginationState.currentPage > 1) {
            displayPage(paginationState.currentPage - 1);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    nextBtnBottom.addEventListener('click', function(e) {
        e.preventDefault();
        if (paginationState.currentPage < paginationState.totalPages) {
            displayPage(paginationState.currentPage + 1);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    prevBtnTop.addEventListener('click', function(e) {
        e.preventDefault();
        if (paginationState.currentPage > 1) {
            displayPage(paginationState.currentPage - 1);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    nextBtnTop.addEventListener('click', function(e) {
        e.preventDefault();
        if (paginationState.currentPage < paginationState.totalPages) {
            displayPage(paginationState.currentPage + 1);
            container.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    fetchArticles(); 
    setInterval(fetchArticles, config.refreshInterval);
})();
</script>
<?php
// END COPY FOR ELEMENTOR HTML WIDGET

/**
 * PHP Function Version for Theme Template Files
 * Copy the function below into your theme's functions.php file,
 * then call mango_news_feed() from your template files.
 */

/**
 * Display the Mango News Feed
 *
 * @param array $args Configuration arguments
 */
function mango_news_feed($args = array()) {
    // Parse arguments
    $defaults = array(
        'api_url' => 'https://mango-news.onrender.com/api',
        'article_limit' => 20, // This will be overridden by articlesPerPage in JS if pagination is used
        'articles_per_page' => 12, // New: for pagination
        'show_topics' => true,
        'show_sharing' => true,
        'search_term' => '', // Initial search term
        'selected_sources' => array(), // Initial selected sources (array of hostnames)
        'article_link_format' => '/news-article/?id=${id}', // Default link format
        'open_in_new_tab' => false,
        'refresh_interval' => 5 * 60 * 1000 
    );
    $config_php = array_merge($defaults, $args);
    
    // Generate a unique ID for this instance
    $instance_id = 'mango-news-feed-' . uniqid();
    
    // Output the HTML and JavaScript
    ?>
    <style>
    /* Mango News Feed Styles */

    /* Filter Controls Styles */
    #<?php echo esc_attr($instance_id); ?> #mango-news-filters-container { /* Instance specific */
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap; /* Allow wrapping on smaller screens */
    }

    #<?php echo esc_attr($instance_id); ?> #mango-news-search-input { /* Instance specific */
        padding: 8px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        flex-grow: 1; /* Allows search input to take available space */
        min-width: 200px; /* Minimum width before wrapping */
    }
    
    /* Styles for the new source checkbox container */
    #<?php echo esc_attr($instance_id); ?> #mango-news-source-checkbox-container { /* Instance specific */
        border: 1px solid #ccc;
        padding: 10px;
        border-radius: 4px;
        max-height: 75px !important; 
        overflow-y: auto;
        min-width: 200px; 
        background-color: white;
        font-size: 14px;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-source-item { /* Instance specific */
        display: block; 
        margin-bottom: 5px; 
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-source-item input[type="checkbox"] { /* Instance specific */
        margin-right: 5px;
        vertical-align: middle;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-source-item label { /* Instance specific */
        cursor: pointer;
        vertical-align: middle;
    }

    #<?php echo esc_attr($instance_id); ?>.mango-news-container { /* Instance specific */
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-date-heading { /* Instance specific */
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        color: var(--e-global-color-primary, #333);
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-date-divider { /* Instance specific */
        margin: 30px 0;
        border-top: 1px solid rgba(0,0,0,0.1);
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-grid { /* Instance specific */
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        gap: 20px;
        margin-bottom: 20px;
        width: 100%;
    }
    
    @media (min-width: 768px) {
        #<?php echo esc_attr($instance_id); ?> .mango-news-grid { /* Instance specific */
            grid-template-columns: repeat(2, 1fr);
        }
    }
    
    @media (min-width: 1024px) {
        #<?php echo esc_attr($instance_id); ?> .mango-news-grid { /* Instance specific */
            grid-template-columns: repeat(3, 1fr);
        }
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-wrapper { /* Instance specific */
        display: flex;
        flex-direction: column;
        height: 100%;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        background-color: #fff;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-wrapper:hover { /* Instance specific */
        transform: translateY(-5px);
        box-shadow: 0 10px 15px rgba(0,0,0,0.1);
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card { /* Instance specific */
        display: flex;
        flex-direction: column;
        flex: 1;
        text-decoration: none !important;
        color: inherit !important;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-image-container { /* Instance specific */
        position: relative;
        width: 100%;
        height: 200px;
        overflow: hidden;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-image { /* Instance specific */
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-topics { /* Instance specific */
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 10px;
        background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-topic-tag { /* Instance specific */
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        background-color: #4169E1;
        border-radius: 50px;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-header { /* Instance specific */
        padding: 16px;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-title { /* Instance specific */
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #333;
        line-height: 1.4;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-meta { /* Instance specific */
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-content { /* Instance specific */
        padding: 0 16px 16px;
        flex-grow: 1;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-summary { /* Instance specific */
        color: #333;
        line-height: 1.6;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-card-summary strong { /* Instance specific */
        color: #000;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-share-buttons { /* Instance specific */
        display: flex;
        gap: 16px;
        padding: 0 16px 16px;
        width: 100%;
        box-sizing: border-box;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-share-button { /* Instance specific */
        font-size: 14px;
        color: #4169E1 !important;
        text-decoration: none !important;
        cursor: pointer;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-share-button:hover { /* Instance specific */
        text-decoration: underline !important;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-loading { /* Instance specific */
        text-align: center;
        padding: 40px;
        font-size: 18px;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-error { /* Instance specific */
        text-align: center;
        padding: 40px;
        color: #dc3545;
    }
    
    #<?php echo esc_attr($instance_id); ?> .mango-news-empty { /* Instance specific */
        text-align: center;
        padding: 40px;
        color: #666;
    }

    /* Pagination styles */
    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-container.mango-news-pagination-top { /* Instance specific */
        margin-bottom: 20px; 
        border-bottom: 1px solid #eaeaea; 
        padding-bottom: 20px; 
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-container.mango-news-pagination-bottom { /* Instance specific */
        margin-top: 40px; 
        border-top: 1px solid #eaeaea; 
        padding-top: 20px; 
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-wrapper { /* Instance specific */
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-results { /* Instance specific */
        text-align: left;
        color: #666;
        font-size: 14px;
        margin: 0;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-start, /* Instance specific */
    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-end, /* Instance specific */
    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-total { /* Instance specific */
        color: #000;
        font-weight: bold;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination { /* Instance specific */
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 5px;
        margin: 0;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination a { /* Instance specific */
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 40px;
        height: 40px;
        border: 1px solid #e6e6e6;
        border-radius: 4px; 
        text-decoration: none;
        color: #666;
        font-size: 16px;
        transition: all 0.2s ease;
        background-color: white;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination a:hover:not(.disabled) { /* Instance specific */
        background-color: #f7f7f7;
        border-color: #e6e6e6;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination a.active { /* Instance specific */
        background-color: #ff7d4d; 
        color: white;
        border-color: #ff7d4d;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination a:focus { /* Instance specific */
        outline: none;
        border-color: #ff7d4d;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination a.disabled { /* Instance specific */
        color: #ccc;
        cursor: not-allowed;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-pages, /* Instance specific */
    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-pages-top { /* Instance specific */
        display: flex;
        gap: 5px; 
        flex-wrap: nowrap;
    }

    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-prev, /* Instance specific */
    #<?php echo esc_attr($instance_id); ?> .mango-news-pagination-next { /* Instance specific */
        color: #ff7d4d; 
    }
    </style>
    
    <div id="<?php echo esc_attr($instance_id); ?>" class="mango-news-container">
        <div id="mango-news-filters-container" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="mango-news-search-input-<?php echo esc_attr($instance_id); ?>" placeholder="Search articles..." style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; flex-grow: 1; min-width: 200px;">
            <div id="mango-news-source-checkbox-container-<?php echo esc_attr($instance_id); ?>" style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; max-height: 75px !important; overflow-y: auto; min-width: 200px; background-color: white;">
                <div class="mango-news-source-item" style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="mango-news-source-all-<?php echo esc_attr($instance_id); ?>" value="" checked style="margin-right: 5px;">
                    <label for="mango-news-source-all-<?php echo esc_attr($instance_id); ?>" style="cursor:pointer;">All Sources</label>
                </div>
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
        // Configuration
        const config = {
            apiUrl: <?php echo json_encode($config_php['api_url']); ?>,
            articlesPerPage: <?php echo intval($config_php['articles_per_page']); ?>,
            showTopics: <?php echo $config_php['show_topics'] ? 'true' : 'false'; ?>,
            showSharing: <?php echo $config_php['show_sharing'] ? 'true' : 'false'; ?>,
            searchTerm: <?php echo json_encode($config_php['search_term']); ?>,
            selectedSources: <?php echo json_encode($config_php['selected_sources']); ?>,
            articleLinkFormat: <?php echo json_encode($config_php['article_link_format']); ?>,
            openInNewTab: <?php echo $config_php['open_in_new_tab'] ? 'true' : 'false'; ?>,
            refreshInterval: <?php echo intval($config_php['refresh_interval']); ?>,
            debug: true // Keep JS debug true for now
        };
        
        let paginationState = {
            currentPage: 1,
            totalPages: 1,
            totalArticles: 0,
            allArticles: [],
            filteredArticles: []
        };
        
        const instanceId = <?php echo json_encode($instance_id); ?>;
        const container = document.getElementById(instanceId);
        const searchInput = document.getElementById('mango-news-search-input-' + instanceId);
        const sourceCheckboxContainer = document.getElementById('mango-news-source-checkbox-container-' + instanceId);
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

        // --- Paste full updated JavaScript logic from mango-news-content.html here ---
        // (Ensure to adapt config values from PHP $config_php and use instance_id for element selectors)

        // Function to fetch articles from the API
        function fetchArticles() {
            loadingEl.style.display = 'block';
            emptyEl.style.display = 'none';
            errorEl.style.display = 'none';
            contentEl.style.display = 'none';
            if (paginationContainerTop) paginationContainerTop.style.display = 'none';
            if (paginationContainerBottom) paginationContainerBottom.style.display = 'none';
            
            let articlesEndpoint = `${config.apiUrl}/articles`;
            // Server-side search for initial load is not part of this client-side script's direct fetch.
            // The initial config.searchTerm (from PHP) will be applied client-side.
            
            if (config.debug) {
                console.log(`[${instanceId}] Fetching all articles from:`, articlesEndpoint);
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
                        emptyEl.textContent = "No news articles found.";
                        emptyEl.style.display = 'block';
                        return;
                    }
                    paginationState.allArticles = articles;
                    populateSourceCheckboxes(articles);
                    try {
                        localStorage.setItem('mangoNewsArticles', JSON.stringify(articles));
                    } catch (e) {
                        console.error(`[${instanceId}] Error storing articles in localStorage:`, e);
                    }
                    applyFiltersAndRender(); 
                    const filtersContainer = document.getElementById('mango-news-filters-container'); // This ID needs to be instance specific if multiple widgets on page
                    if (filtersContainer && !filtersContainer.id.includes(instanceId)) { // Simple check, might need better targeting
                         // If this is a generic filter container, it might be an issue.
                         // For now, assume the one inside this instance is correctly targeted by its specific ID.
                    }
                    // Visibility of content/pagination is handled by applyFiltersAndRender -> displayPage -> updatePaginationControls
                })
                .catch(error => {
                    console.error(`[${instanceId}] Error fetching articles:`, error);
                    loadingEl.style.display = 'none';
                    errorEl.style.display = 'block';
                    errorEl.innerHTML = `Error loading news feed: ${error.message}`;
                    if (config.debug) {
                        const debugInfo = document.createElement('div');
                        debugInfo.style.fontSize = '12px';
                        debugInfo.style.marginTop = '10px';
                        debugInfo.style.color = '#777';
                        debugInfo.innerHTML = `<p>Debug Information:</p><p>API URL: ${articlesEndpoint}</p><p>Error: ${error.toString()}</p><p>Check your browser console for more details.</p>`;
                        errorEl.appendChild(debugInfo);
                    }
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
            const allSourcesCheckbox = document.getElementById('mango-news-source-all-' + instanceId);
            
            // Clear only dynamically added source checkboxes
            const dynamicItems = sourceCheckboxContainer.querySelectorAll('.mango-news-source-item:not(:first-child)');
            dynamicItems.forEach(item => item.remove());

            const sortedHostnames = Object.keys(sources).sort((a,b) => sources[a].localeCompare(sources[b]));

            for (const hostname of sortedHostnames) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'mango-news-source-item';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `mango-source-${hostname.replace(/\./g, '-')}-${instanceId}`; 
                checkbox.value = hostname;
                checkbox.checked = config.selectedSources.includes(hostname); // Pre-check if in config
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
                // Ensure "All Sources" reflects initial state of config.selectedSources
                if (config.selectedSources.length > 0) {
                    allSourcesCheckbox.checked = false;
                } else {
                    allSourcesCheckbox.checked = true;
                }
            }
        }

        function handleSourceCheckboxChange(event) {
            const allSourcesCheckbox = document.getElementById('mango-news-source-all-' + instanceId);
            const specificSourceCheckboxes = Array.from(sourceCheckboxContainer.querySelectorAll('input[type="checkbox"]:not(#mango-news-source-all-' + instanceId + ')'));

            if (event.target.id === 'mango-news-source-all-' + instanceId) {
                if (event.target.checked) {
                    config.selectedSources = [];
                    specificSourceCheckboxes.forEach(cb => cb.checked = false);
                } else {
                    const anySpecificChecked = specificSourceCheckboxes.some(cb => cb.checked);
                    if (!anySpecificChecked) {
                        event.target.checked = true; 
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
                articlesToFilter = articlesToFilter.filter(article => 
                    (article.title && article.title.toLowerCase().includes(searchTermLower)) ||
                    (article.summary && article.summary.toLowerCase().includes(searchTermLower)) ||
                    (article.content && article.content.toLowerCase().includes(searchTermLower)) 
                );
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
                emptyEl.textContent = "No articles match your current filters.";
                emptyEl.style.display = 'block';
                contentEl.style.display = 'none';
            } else if (pageArticles.length === 0) {
                emptyEl.textContent = "No news articles found."; 
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
                    console.error(`[${instanceId}] Error updating pagination sections:`, error);
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
            if (!paginationEl || !paginationPages || !prevBtn || !nextBtn) return; // Guard against missing elements
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
                const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
            let html = `<div class="mango-news-card-wrapper">`;
            html += `<a href="${articleLink}" class="mango-news-card" data-article-id="${article.id}"${targetAttr}>`;
            if (article.thumbnail_url) {
                html += `<div class="mango-news-card-image-container"><img class="mango-news-card-image" src="${article.thumbnail_url}" alt="${article.title || 'News article'}">`;
                if (config.showTopics && article.topics && article.topics.length > 0) {
                    html += '<div class="mango-news-card-topics">';
                    for (const topic of article.topics) {
                        html += `<span class="mango-news-topic-tag">${topic}</span>`;
                    }
                    html += '</div>';
                }
                html += '</div>'; 
            }
            html += `<div class="mango-news-card-header"><h3 class="mango-news-card-title">${article.title || 'Untitled'}</h3><div class="mango-news-card-meta">`;
            const domain = getDomainFromUrl(article.source_url || '');
            html += `<span class="mango-news-source">${domain}</span>`;
            if (article.author) {
                html += ` | <span class="mango-news-author">By ${article.author}</span>`;
            }
            if (article.publication_date) {
                const pubDate = new Date(article.publication_date);
                html += ` | <span class="mango-news-date">Published: ${pubDate.toLocaleDateString()}</span>`;
            }
            html += `</div></div>`;
            let summary = article.summary || '';
            summary = summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<div class="mango-news-card-content"><div class="mango-news-card-summary">${summary}</div></div>`;
            html += '</a>'; 
            if (config.showSharing) {
                html += `<div class="mango-news-share-buttons" data-article-id="${article.id}" data-article-title="${encodeURIComponent(article.title || 'News article')}"><a href="#" class="mango-news-share-button mango-news-share-whatsapp">Share on WhatsApp</a><a href="#" class="mango-news-share-button mango-news-share-facebook">Share on Facebook</a></div>`;
            }
            html += '</div>'; 
            return html;
        }
        
        function getDomainFromUrl(url) {
            try {
                const parsedUrl = new URL(url);
                return parsedUrl.hostname;
            } catch (e) {
                // console.error("Invalid URL:", url, e); // Be less noisy in production
                return url; // Return original URL if parsing fails
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
                    const shareText = `Check out this article: ${articleTitle} - ${articleUrl}`;
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
        
        let searchDebounceTimer;
        if(searchInput) { // Check if element exists
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
        
        // Refresh the feed periodically
        if (config.refreshInterval > 0) {
            setInterval(fetchArticles, config.refreshInterval);
        }
    })();
    </script>
    <?php
}

/**
 * Register the shortcode [mango_news_feed]
 */
function mango_news_feed_shortcode_function($atts) {
    $atts = shortcode_atts(array(
        'api_url' => 'https://mango-news.onrender.com/api',
        // 'article_limit' => 20, // This is now controlled by articlesPerPage in JS
        'articles_per_page' => 12,
        'show_topics' => 'yes',
        'show_sharing' => 'yes',
        'search_term' => '',
        'selected_sources' => '', // Comma-separated string of source hostnames
        'article_link_format' => '/news-article/?id=${id}',
        'open_in_new_tab' => 'no',
        'refresh_interval' => 5 * 60 * 1000
    ), $atts, 'mango_news_feed');

    // Convert string values to appropriate types
    $selected_sources_array = array();
    if (!empty($atts['selected_sources'])) {
        $selected_sources_array = array_map('trim', explode(',', $atts['selected_sources']));
    }

    $args = array(
        'api_url' => $atts['api_url'],
        'articles_per_page' => intval($atts['articles_per_page']),
        'show_topics' => strtolower($atts['show_topics']) === 'yes',
        'show_sharing' => strtolower($atts['show_sharing']) === 'yes',
        'search_term' => $atts['search_term'],
        'selected_sources' => $selected_sources_array,
        'article_link_format' => $atts['article_link_format'],
        'open_in_new_tab' => strtolower($atts['open_in_new_tab']) === 'yes',
        'refresh_interval' => intval($atts['refresh_interval']),
    );

    // Start output buffering
    ob_start();
    
    // Output the feed
    mango_news_feed($args);
    
    // Return the buffered content
    return ob_get_clean();
}

// Register the shortcode
add_shortcode('mango_news_feed', 'mango_news_feed_shortcode_function');
