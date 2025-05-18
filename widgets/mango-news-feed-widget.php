<?php
/**
 * Plugin Name: Mango News Feed Widget
 * Description: Custom Elementor widget to display news feed from Mango News API
 * Version: 1.0.0
 * Author: Mango News
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main Mango News Feed Widget Class
 */
class Mango_News_Feed_Widget {

    /**
     * Plugin Instance
     */
    private static $instance = null;

    /**
     * Mango News API URL
     */
    private $api_url = 'https://mango-news.onrender.com/api';

    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (self::$instance == null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    public function __construct() {
        // Register widget with Elementor
        add_action('elementor/widgets/widgets_registered', [$this, 'register_widgets']);
        
        // Register widget styles
        add_action('wp_enqueue_scripts', [$this, 'widget_styles']);
    }

    /**
     * Register widget styles
     */
    public function widget_styles() {
        wp_register_style('mango-news-feed', false);
        wp_enqueue_style('mango-news-feed');
        
        // Add inline styles
        wp_add_inline_style('mango-news-feed', $this->get_custom_css());
    }
    
    /**
     * Define custom CSS for the widget
     */
    private function get_custom_css() {
        // Content from mango-news-styles.html (with PHP string escaping if needed)
        return '
        /* Mango News Feed Styles */

        /* Filter Controls Styles */
        #mango-news-filters-container { /* Note: IDs might need to be dynamic if multiple widgets on page */
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap; 
        }

        #mango-news-search-input {
            padding: 8px 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            flex-grow: 1; 
            min-width: 200px; 
        }
        
        /* Styles for the new source checkbox container */
        #mango-news-source-checkbox-container {
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 4px;
            max-height: 75px !important; 
            overflow-y: auto;
            min-width: 200px; 
            background-color: white;
            font-size: 14px;
        }

        .mango-news-source-item {
            display: block; 
            margin-bottom: 5px; 
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
            background-color: #fff; /* Changed from var(--e-global-color-background, #fff); for consistency with direct HTML */
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
            background-color: #4169E1; /* Changed from var(--e-global-color-accent, #4169E1); */
            border-radius: 50px;
        }
        
        .mango-news-card-header {
            padding: 16px;
        }
        
        .mango-news-card-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333; /* Changed from var(--e-global-color-text, #333); */
            line-height: 1.4;
        }
        
        .mango-news-card-meta {
            font-size: 14px;
            color: #666; /* Changed from var(--e-global-color-text-secondary, #666); */
            margin-bottom: 10px;
        }
        
        .mango-news-card-content {
            padding: 0 16px 16px;
            flex-grow: 1;
        }
        
        .mango-news-card-summary {
            color: #333; /* Changed from var(--e-global-color-text, #333); */
            line-height: 1.6;
        }
        
        .mango-news-card-summary strong {
            color: #000; /* Changed from var(--e-global-color-primary, #000); */
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
            color: #4169E1 !important; /* Changed from var(--e-global-color-accent, #4169E1); */
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
        ';
    }

    /**
     * Register widgets
     */
    public function register_widgets() {
        require_once(__DIR__ . '/widgets/mango-news-feed-elementor-widget.php');
        \Elementor\Plugin::instance()->widgets_manager->register_widget_type(new Mango_News_Feed_Elementor_Widget());
    }
}

// Initialize the plugin
Mango_News_Feed_Widget::get_instance();

/**
 * Check if Elementor is installed and activated
 */
function mango_news_feed_widget_check_elementor() {
    if (!did_action('elementor/loaded')) {
        add_action('admin_notices', 'mango_news_feed_widget_elementor_notice');
        return false;
    }
    return true;
}
add_action('plugins_loaded', 'mango_news_feed_widget_check_elementor');

/**
 * Admin notice for Elementor dependency
 */
function mango_news_feed_widget_elementor_notice() {
    if (current_user_can('activate_plugins')) {
        echo '<div class="notice notice-warning is-dismissible">';
        echo '<p><strong>Mango News Feed Widget</strong> requires <strong>Elementor</strong> plugin to be active. Please install and activate Elementor first.</p>';
        echo '</div>';
    }
}
