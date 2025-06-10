import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button"; // Import Button component
import { Badge } from "./ui/badge"; // Import Badge component
import { MessageCircleMore, Facebook, Loader2, XCircle, Info } from 'lucide-react'; // Import icons

import { Alert, AlertDescription, AlertTitle } from './ui/alert'; // Import Alert components
import useTranslations from '../lib/hooks/useTranslations'; // Import the shared hook
import AudioPlayer from './ui/AudioPlayer'; // Import AudioPlayer component

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
  topics_es?: string[]; // Ensure this is string[]
  topics_ht?: string[]; // Ensure this is string[]
  type?: 'article'; // Explicitly define the type
}

interface SundayEdition {
  id: number;
  title: string;
  summary: string;
  narration_url: string;
  image_url: string;
  publication_date: string;
  created_at: string;
  type: 'sundayEdition'; // Explicitly define the type
}

interface NewsFeedProps {
  searchTerm: string;
  selectedSources: number[];
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
  const [sundayEditions, setSundayEditions] = useState<SundayEdition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

  const articlesPerPage = 15; // Define how many articles to fetch per page

  const fetchInProgressRef = useRef(false); // New ref to track if a fetch is in progress

  useEffect(() => {
    // Reset articles, page, and hasMore when filters change
    setArticles([]);
    setCurrentPage(1);
    setHasMore(true);
    setLoading(true); // Set loading true to show initial loader
    setError(null); // Clear previous errors
    fetchInProgressRef.current = false; // Reset the flag
  }, [searchTerm, JSON.stringify(selectedSources), activeCategory]); // Add activeCategory to dependency array

  useEffect(() => {
    const fetchSundayEditions = async () => {
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/sunday-editions`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: SundayEdition[] = await response.json();
        setSundayEditions(data);
      } catch (err) {
        console.error('Error fetching Sunday Editions:', err);
      }
    };
    fetchSundayEditions();
  }, []); // Fetch Sunday Editions once on component mount

  useEffect(() => {
    console.count('[NewsFeed] fetch effect evaluated'); // Diagnostic log
    if (!hasMore && currentPage > 1) return; // Don't fetch if no more articles and not initial load

    // Only proceed if a fetch is not already in progress
    if (fetchInProgressRef.current) {
      console.log('[NewsFeed] Fetch attempt skipped: a fetch is already in progress.');
      return;
    }

    const controller = new AbortController(); // Create controller inside effect
    const timeoutPromise = new Promise<Response>((_, reject) => // Explicitly type as Promise<Response>
      setTimeout(() => {
        controller.abort(); // Abort the fetch if timeout occurs
        reject(new DOMException('Request timed out.', 'TimeoutError'));
      }, 10000) // 10 second timeout
    );

    const fetchArticles = async () => {
      console.log('[NewsFeed] fetchArticles function invoked.');
      fetchInProgressRef.current = true; // Set flag when fetch starts
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        let url = `${apiUrl}/api/articles`;
        const params = new URLSearchParams();

        if (selectedSources.length > 0) {
            params.append('source_ids', selectedSources.join(','));
        }

        if (searchTerm) {
            params.append('searchTerm', searchTerm);
        }

        if (activeCategory && activeCategory !== 'all') {
            params.append('topic', activeCategory);
        }

        params.append('page', currentPage.toString());
        params.append('limit', articlesPerPage.toString());

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        console.log('[NewsFeed] Fetching articles with URL:', url);

        // Use Promise.race to race the fetch with the timeout
        const response = await Promise.race([
          fetch(url, { signal: controller.signal }),
          timeoutPromise
        ]);

        console.log('[NewsFeed] API Response Status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Article[] = await response.json();
        console.log('[NewsFeed] Fetched articles data:', data);

        setArticles(prevArticles => {
          const newArticles = data.filter(
            newArticle => !prevArticles.some(existingArticle => existingArticle.id === newArticle.id)
          );
          return [...prevArticles, ...newArticles];
        });

        setHasMore(data.length === articlesPerPage);

      } catch (err: unknown) {
        if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
          console.error('[NewsFeed] Fetch request aborted or timed out:', err);
          // Only set error if it's not a manual abort due to effect cleanup
          if (err.message !== 'The user aborted a request.') {
            setError(new Error('Request timed out. Please try again.'));
          }
        } else {
          console.error('[NewsFeed] Error fetching articles:', err);
          setError(err);
        }
      } finally {
        console.log('[NewsFeed] Setting loading to false in finally block.');
        setLoading(false);
        fetchInProgressRef.current = false; // Clear flag when fetch completes/fails
      }
    };

    fetchArticles();

    // Cleanup function: abort the fetch if the component unmounts or effect re-runs
    return () => {
      console.log('[NewsFeed] Effect cleanup: Aborting ongoing fetch.');
      controller.abort(); // Abort any ongoing fetch
      fetchInProgressRef.current = false; // Ensure flag is cleared on cleanup
    };

  }, [searchTerm, JSON.stringify(selectedSources), activeCategory, currentPage]); // Dependencies remain the same

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setCurrentPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 1.0 } // Trigger when the target is fully visible
    );

    const loadMoreRef = document.getElementById('load-more-trigger');
    if (loadMoreRef) {
      observer.observe(loadMoreRef);
    }

    return () => {
      if (loadMoreRef) {
        observer.unobserve(loadMoreRef);
      }
    };
  }, [hasMore, loading]); // Re-run observer setup if hasMore or loading state changes

  console.log('[NewsFeed] Render state - loading:', loading, 'articles.length:', articles.length, 'error:', error);

  // Combine articles and Sunday Editions, then sort by publication_date
  const combinedFeed = [...articles, ...sundayEditions.map(edition => ({
    ...edition,
    type: 'sundayEdition' as const, // Explicitly set type as a literal
    publication_date: edition.publication_date, // Ensure consistent date field
  }))].sort((a, b) => {
    return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
  });

  // Group combined feed by date (Day, Month, Year)
  const groupedFeed = combinedFeed.reduce((acc, item) => {
    const date = new Date(item.publication_date);
    const year = date.getFullYear();
    const monthIndex = date.getMonth(); // Get month as 0-11 index
    const monthName = t.months[monthIndex.toString() as keyof typeof t.months]; // Get translated month name from locale
    const day = date.getDate();
    const dateKey = `${monthName} ${day}, ${year}`;

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, (Article | (SundayEdition & { type: 'sundayEdition' }))[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedFeed).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });


  if (loading && articles.length === 0) { // Show initial loader only if no articles are loaded yet
    return (
      <div className="container mx-auto p-4">
        <Alert className="text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          <AlertTitle className="text-xl font-semibold">{t.loading}</AlertTitle>
          <AlertDescription className="text-gray-600">{t.loading_latest_news}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive" className="text-center">
          <XCircle className="h-4 w-4 mx-auto" />
          <AlertTitle className="text-xl font-semibold">{t.error_loading_articles}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use 'articles.length' directly as filtering is now handled by the backend API
  if (articles.length === 0 && !loading) { // Show no articles found only if not loading and no articles
     return (
      <div className="container mx-auto p-4">
        <Alert className="text-center">
          <Info className="h-4 w-4 mx-auto" />
          <AlertTitle className="text-xl font-semibold">{t.no_articles_found}</AlertTitle>
          <AlertDescription className="text-gray-600">
            {t.try_adjusting_filters || "Try adjusting your filters or check back later."}
          </AlertDescription>
        </Alert>
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
  const getTranslatedTopics = (article: Article, locale: string): string[] | undefined => {
    if (locale === 'es' && article.topics_es && article.topics_es.length > 0) {
      return article.topics_es;
    }
    if (locale === 'ht' && article.topics_ht && article.topics_ht.length > 0) {
      return article.topics_ht;
    }
    return article.topics; // Fallback to English (which is already an array)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groupedFeed[dateKey].map(item => {
              try {
                if (item.type === 'sundayEdition') {
                  const edition = item as SundayEdition; // Cast to SundayEdition

                  // Calculate the date range for the week
                  const publicationDate = new Date(edition.publication_date);
                  const dayOfWeek = publicationDate.getDay(); // 0 for Sunday, 1 for Monday, etc.
                  const startDate = new Date(publicationDate);
                  startDate.setDate(publicationDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Go back to previous Monday
                  const endDate = new Date(startDate);
                  endDate.setDate(startDate.getDate() + 6); // End on Sunday

                  const formattedStartDate = startDate.toLocaleDateString(currentLocale, { month: 'short', day: 'numeric' });
                  const formattedEndDate = endDate.toLocaleDateString(currentLocale, { month: 'short', day: 'numeric', year: 'numeric' });

                  const weekPeriodText = `${formattedStartDate} - ${formattedEndDate}`;
                  const sundayEditionInfo = `${t.sunday_edition_summary_for_week} ${weekPeriodText}.`;

                  return (
                    <Card key={`sunday-${edition.id}`} className="flex flex-col h-full border-2 border-[#FF7F50]">
                      <div
                        className="block cursor-pointer"
                        onClick={() => {
                          window.location.href = `/${currentLocale}/sunday-edition/${edition.id}`;
                        }}
                      >
                        {edition.image_url && (
                          <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
                            <img src={edition.image_url} alt={edition.title} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                              {t.sunday_edition}
                            </div>
                          </div>
                        )}
                        <CardHeader className={edition.image_url ? "px-6 pt-4" : "px-6 pt-4"}>
                          <CardTitle className="font-serif">
                            {edition.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            <a href="https://mango.tc/news" target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>mango.tc News</a> | {t.published}: {
                              new Date(edition.publication_date).getFullYear() === 2001
                                ? new Date(edition.publication_date).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
                                : new Date(edition.publication_date).toLocaleDateString(currentLocale)
                            }
                          </p>
                        </CardHeader>
                        <CardContent className="flex-grow px-6 pb-4">
                          <p className="text-foreground mb-2">{sundayEditionInfo}</p>
                        </CardContent>
                      </div>
                      {edition.narration_url && (
                        <CardContent className="px-6 pb-4 pt-0"> {/* Added pt-0 to reduce extra padding */}
                          <div className="mt-4">
                            <AudioPlayer src={edition.narration_url} />
                          </div>
                        </CardContent>
                      )}
                      <div className="px-6 pb-2 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            const editionUrl = `${window.location.origin}/${currentLocale}/sunday-edition/${edition.id}`;
                            const shareText = `Listen to the Mango News Sunday Edition: ${edition.title} - ${editionUrl}`;
                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                        >
                          <MessageCircleMore className="h-4 w-4 mr-1" /> {t.share_on_whatsapp}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            const editionUrl = `${window.location.origin}/${currentLocale}/sunday-edition/${edition.id}`;
                            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(editionUrl)}`;
                            window.open(facebookUrl, '_blank');
                          }}
                        >
                          <Facebook className="h-4 w-4 mr-1" /> {t.share_on_facebook}
                        </Button>
                      </div>
                    </Card>
                  );
                } else {
                  const article = item as Article; // Cast to Article
                  const displayTitle = getTranslatedText(article, 'title', currentLocale);
                  const displaySummary = getTranslatedText(article, 'summary', currentLocale);
                  const displayTopics = getTranslatedTopics(article, currentLocale);

                  return (
                    <a
                      href={`/${currentLocale}/article/${article.id}`}
                      key={article.id}
                      className="block"
                      onClick={() => {
                        const articleIds = articles.map(a => a.id); // Use 'articles' directly
                        localStorage.setItem('articleList', JSON.stringify(articleIds));
                      }}
                    >
                      <Card className="flex flex-col h-full">
                        {article.thumbnail_url && (
                          <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
                            <img src={article.thumbnail_url} alt={displayTitle || article.title} className="w-full h-full object-cover" />
                            {displayTopics && displayTopics.length > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                <div className="flex flex-wrap gap-1">
                                  {displayTopics.map(topic => (
                                    <Badge
                                      key={topic}
                                      variant="secondary"
                                      className="text-white bg-blue-500 hover:bg-blue-600 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent click from propagating to the parent article link
                                        e.preventDefault(); // Prevent the default action of the parent <a> tag
                                        window.location.href = `/${currentLocale}/news/topic/${encodeURIComponent(topic)}`;
                                      }}
                                    >
                                      {topic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <CardHeader className={article.thumbnail_url ? "px-6 pt-4" : "px-6 pt-4"}>
                          <CardTitle className="font-serif">
                            {displayTitle || (currentLocale !== 'en' ? `${article.title} (${getFallbackMessage(currentLocale)})` : article.title)}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            <a
                              href={article.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {getDomainFromUrl(article.source_url)}
                            </a>
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
                        <div className="px-6 pb-2 grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              const articleUrl = `${window.location.origin}/${currentLocale}/article/${article.id}`;
                              const shareText = `Check out this article: ${displayTitle || article.title} - ${articleUrl}`;
                              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                          >
                            <MessageCircleMore className="h-4 w-4 mr-1" /> {t.share_on_whatsapp}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              const articleUrl = `${window.location.origin}/${currentLocale}/article/${article.id}`;
                              const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
                              window.open(facebookUrl, '_blank');
                            }}
                          >
                            <Facebook className="h-4 w-4 mr-1" /> {t.share_on_facebook}
                          </Button>
                        </div>
                      </Card>
                    </a>
                  );
                }
              } catch (error) {
                console.error(`Error rendering item:`, item, error);
                return null;
              }
            })}
          </div>
        </div>
      ))}
      {/* Loading indicator or "No More Articles" message */}
      <div id="load-more-trigger" className="py-4 text-center">
        {loading && articles.length > 0 && (
          <Alert className="text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            <AlertTitle className="text-xl font-semibold">{t.loading}</AlertTitle>
            <AlertDescription className="text-gray-600">{t.loading_latest_news}</AlertDescription>
          </Alert>
        )}
        {!hasMore && articles.length > 0 && !loading && (
          <Alert className="text-center">
            <Info className="h-4 w-4 mx-auto" />
            <AlertTitle className="text-xl font-semibold">{t.no_more_articles || "No more articles to load."}</AlertTitle>
            <AlertDescription className="text-gray-600">
              {t.all_articles_loaded || "You've reached the end of the news feed."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

export default NewsFeed;
