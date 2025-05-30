import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Import locale files
import en from '../locales/en.json';
import es from '../locales/es.json';
import ht from '../locales/ht.json';

const locales = { en, es, ht };

// Helper hook for translations
const useTranslations = () => {
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const localeFromPath = pathSegments[1];
    if (locales[localeFromPath as keyof typeof locales]) {
      setCurrentLocale(localeFromPath);
    } else {
      setCurrentLocale('en'); // Fallback
    }
  }, []);

  const t = locales[currentLocale as keyof typeof locales];
  return { t, currentLocale };
};

interface Article {
  id: number;
  title: string;
  source_id: number;
  source_url: string;
  author?: string;
  publication_date: string;
  raw_content: string;
  summary: string;
  created_at: string;
  updated_at: string;
  category?: string;
  thumbnail_url?: string;
  topics?: string[];
  isOfficial?: boolean;
  isVerified?: boolean;
  isFacebook?: boolean;
  // New translated fields
  title_es?: string;
  summary_es?: string;
  title_ht?: string;
  summary_ht?: string;
  topics_es?: string[];
  topics_ht?: string[];
}

interface NewsFeedProps {
  searchTerm: string;
  selectedSources: string[];
  activeCategory: string;
}

// Helper function to extract domain from URL
const getDomainFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url;
  }
};


function NewsFeed({
  searchTerm = '',
  selectedSources = [],
  activeCategory = 'all'
}: NewsFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        let url = `${apiUrl}/api/articles`;
        const params = new URLSearchParams();

        console.log('Fetching articles with filters:', {
          searchTerm,
          selectedSources,
        });

        if (selectedSources.length > 0) {
            params.append('sources', selectedSources.join(','));
        }

        if (searchTerm) {
            params.append('searchTerm', searchTerm);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Article[] = await response.json();
        console.log('Fetched articles data:', data);
        setArticles(data);
      } catch (err: unknown) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [searchTerm, selectedSources]);

  const filteredArticles = articles.filter(article => {
    const matchesCategory = activeCategory === 'all' ||
                            article.category?.toLowerCase() === activeCategory.toLowerCase();
    return matchesCategory;
  });

  // Group articles by date (Day, Month, Year)
  const groupedArticles = filteredArticles.reduce((acc, article) => {
    const date = new Date(article.publication_date);
    // Use currentLocale for date formatting
    const year = date.getFullYear();
    const month = date.toLocaleString(currentLocale, { month: 'long' });
    const day = date.getDate();
    const dateKey = `${month} ${day}, ${year}`;

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedArticles).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });


  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-xl font-semibold">{t.loading}</div>
        <p className="text-center text-gray-600">{t.loading_latest_news}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500">
        {t.error_loading_articles} {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (filteredArticles.length === 0) {
     return (
      <div className="container mx-auto p-4 text-center text-gray-600">
        {t.no_articles_found}
      </div>
    );
  }

  // Helper to get translated text with fallback
  const getTranslatedText = (article: Article, field: 'title' | 'summary', locale: string) => {
    if (locale === 'es' && article[`${field}_es`]) {
      return article[`${field}_es`];
    }
    if (locale === 'ht' && article[`${field}_ht`]) {
      return article[`${field}_ht`];
    }
    return article[field]; // Fallback to English
  };

  // Helper to get translated topics with fallback
  const getTranslatedTopics = (article: Article, locale: string) => {
    if (locale === 'es' && article.topics_es && article.topics_es.length > 0) {
      return article.topics_es;
    }
    if (locale === 'ht' && article.topics_ht && article.topics_ht.length > 0) {
      return article.topics_ht;
    }
    return article.topics; // Fallback to English
  };

  const getFallbackMessage = (locale: string) => {
    const langName = locale === 'es' ? 'Spanish' : 'Haitian Creole';
    return t.translation_not_available.replace('{language}', langName);
  };


  return (
    <div className="container mx-auto p-4">
      {sortedDates.map((dateKey, index) => (
        <div key={dateKey}>
          {index > 0 && (
            <div className="relative my-8">
              <hr className="border-t border-gray-300" />
            </div>
          )}
          <h2 className="text-2xl font-bold mb-4">{dateKey}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedArticles[dateKey].map(article => {
              try {
                const displayTitle = getTranslatedText(article, 'title', currentLocale);
                const displaySummary = getTranslatedText(article, 'summary', currentLocale);
                const displayTopics = getTranslatedTopics(article, currentLocale);

                return (
                  <a href={`/${currentLocale}/article/${article.id}`} key={article.id} className="block">
                    <Card className="flex flex-col h-full">
                      {article.thumbnail_url && (
                        <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
                          <img src={article.thumbnail_url} alt={displayTitle || article.title} className="w-full h-full object-cover" />
                          {displayTopics && displayTopics.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                              <div className="flex flex-wrap gap-1">
                                {displayTopics.map(topic => (
                                  <span key={topic} className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <CardHeader className={article.thumbnail_url ? "px-6 pt-4" : "px-6 pt-4"}>
                        <CardTitle>
                          {displayTitle || (currentLocale !== 'en' ? `${article.title} (${getFallbackMessage(currentLocale)})` : article.title)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          <span
                            className="hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(article.source_url, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            {getDomainFromUrl(article.source_url)}
                          </span>
                          {article.author && (
                            <span> | {t.author}: {article.author}</span>
                          )}
                           <span> | {t.published}: {
                            new Date(article.publication_date).getFullYear() === 2001
                              ? new Date(article.publication_date).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
                              : new Date(article.publication_date).toLocaleDateString(currentLocale)
                          }</span>
                          <span> | {t.added}: {
                            new Date(article.created_at).getFullYear() === 2001
                              ? new Date(article.created_at).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
                              : new Date(article.created_at).toLocaleDateString(currentLocale)
                          }</span>
                        </p>
                      </CardHeader>
                      <CardContent className="flex-grow px-6 pb-4">
                          <p className="text-foreground" dangerouslySetInnerHTML={{ __html: (displaySummary || (currentLocale !== 'en' ? `${article.summary} (${getFallbackMessage(currentLocale)})` : article.summary))?.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold;" class="text-accent-foreground">$1</span>') || '' }}></p>
                      </CardContent>
                      <div className="px-6 pb-4 flex gap-4">
                        <button
                          className="text-sm text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const articleUrl = `${window.location.origin}/${currentLocale}/article/${article.id}`;
                            const shareText = `Check out this article: ${displayTitle || article.title} - ${articleUrl}`;
                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                        >
                          {t.share_on_whatsapp}
                        </button>
                         <button
                          className="text-sm text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const articleUrl = `${window.location.origin}/${currentLocale}/article/${article.id}`;
                            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
                            window.open(facebookUrl, '_blank');
                          }}
                        >
                          {t.share_on_facebook}
                        </button>
                      </div>
                    </Card>
                  </a>
                );
              } catch (error) {
                console.error(`Error rendering article ${article.id}:`, error, article);
                return null;
              }
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
