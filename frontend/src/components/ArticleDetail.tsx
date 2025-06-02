import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "./ui/button"; // Import Button component
import { Badge } from "./ui/badge"; // Import Badge component
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"; // Import Card components
import { MessageCircleMore, Facebook, Loader2, XCircle, Info, ChevronLeft, ChevronRight } from 'lucide-react'; // Import icons

import { Alert, AlertDescription, AlertTitle } from './ui/alert'; // Import Alert components
import useTranslations from '../lib/hooks/useTranslations'; // Import the shared hook

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
  thumbnail_url?: string;
  topics?: string[];
  category?: string;
  // New translated fields
  title_es?: string;
  summary_es?: string;
  title_ht?: string;
  summary_ht?: string;
  topics_es?: string[];
  topics_ht?: string[];
}

interface ArticleDetailProps {
  id: string;
}

const ArticleDetail = ({ id }: ArticleDetailProps) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

  const [articleList, setArticleList] = useState<number[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState<number>(-1);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);
  const [relatedError, setRelatedError] = useState<unknown>(null);

  useEffect(() => {
    // Load article list from localStorage
    const storedList = localStorage.getItem('articleList');
    if (storedList) {
      try {
        const parsedList = JSON.parse(storedList);
        if (Array.isArray(parsedList)) {
          setArticleList(parsedList);
          const currentIndex = parsedList.indexOf(parseInt(id));
          setCurrentArticleIndex(currentIndex);
        }
      } catch (e) {
        console.error("Failed to parse articleList from localStorage", e);
        setArticleList([]);
        setCurrentArticleIndex(-1);
      }
    }
  }, [id]);

  const navigateToArticle = useCallback((articleId: number) => {
    const baseUrl = window.location.origin;
    window.location.href = `${baseUrl}/${currentLocale}/article/${articleId}`;
  }, [currentLocale]);

  const handlePrevious = () => {
    if (currentArticleIndex > 0) {
      navigateToArticle(articleList[currentArticleIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentArticleIndex < articleList.length - 1) {
      navigateToArticle(articleList[currentArticleIndex + 1]);
    }
  };

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/articles/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Article = await response.json();
        setArticle(data);
      } catch (err: unknown) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]); // Depend on 'id' to refetch article data when ID changes

  useEffect(() => {
    const fetchRelatedArticles = async () => {
      if (!article || !article.topics || article.topics.length === 0) {
        setRelatedArticles([]);
        return;
      }

      setLoadingRelated(true);
      setRelatedError(null);
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        const primaryTopic = article.topics[0]; // Use the first topic for relatedness
        const response = await fetch(`${apiUrl}/api/articles?topic=${encodeURIComponent(primaryTopic)}&limit=4`); // Fetch a few related articles
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Article[] = await response.json();
        // Filter out the current article from related articles
        setRelatedArticles(data.filter(ra => ra.id !== article.id));
      } catch (err: unknown) {
        setRelatedError(err);
      } finally {
        setLoadingRelated(false);
      }
    };

    if (article) {
      fetchRelatedArticles();
    }
  }, [article]); // Re-fetch related articles when the main article data changes

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

  const getFallbackMessage = (locale: string) => {
    const langName = locale === 'es' ? 'Spanish' : 'Haitian Creole';
    return t.translation_not_available.replace('{language}', langName);
  };


  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Alert className="text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          <AlertTitle className="text-xl font-semibold">{t.loading_article}</AlertTitle>
          <AlertDescription className="text-gray-600">
            {t.loading_latest_news || "Please wait while we load the article."}
          </AlertDescription>
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

  if (!article) {
    return (
      <div className="container mx-auto p-4">
        <Alert className="text-center">
          <Info className="h-4 w-4 mx-auto" />
          <AlertTitle className="text-xl font-semibold">{t.article_not_found}</AlertTitle>
          <AlertDescription className="text-gray-600">
            {t.try_adjusting_filters || "The article you are looking for could not be found."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const displayTitle = getTranslatedText(article, 'title', currentLocale);
  // raw_content is not translated for now, so always use the original
  const displayContent = article.raw_content;
  const displayTopics = article.topics && article.topics.length > 0 ? article.topics : [];
  const firstTopic = displayTopics.length > 0 ? displayTopics[0] : null;


  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 text-sm text-muted-foreground">
        <a href={`/${currentLocale}/`} className="hover:underline">
          {t.news_feed || 'News Feed'}
        </a>
        {firstTopic && (
          <>
            <span className="mx-1">/</span>
            <a href={`/${currentLocale}/news/topic/${firstTopic.toLowerCase().replace(/\s+/g, '-')}`} className="hover:underline">
              {firstTopic}
            </a>
          </>
        )}
        <span className="mx-1">/</span>
        <span>{displayTitle}</span>
      </div>

      <div className="mb-4">
        <a href={`/${currentLocale}/`} className="text-blue-500 hover:underline flex items-center">
          <ChevronLeft className="h-4 w-4 mr-1" /> {t.back_to_news_feed || 'Back to News Feed'}
        </a>
      </div>

      <article className="prose lg:prose-xl article-content">
        <h1>{displayTitle || (currentLocale !== 'en' ? `${article.title} (${getFallbackMessage(currentLocale)})` : article.title)}</h1>
        <div className="text-sm text-muted-foreground mb-4">
        {t.source}: <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{article.source_url}</a>
        <div> {article.author && (
            <span> {t.author}: {article.author} </span>
          )}
           | {t.published}: {
             new Date(article.publication_date).getFullYear() === 2001
               ? new Date(article.publication_date).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
               : new Date(article.publication_date).toLocaleDateString(currentLocale)
           }
           <span> | {t.added}: {
             new Date(article.created_at).getFullYear() === 2001
               ? new Date(article.created_at).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
               : new Date(article.created_at).toLocaleDateString(currentLocale)
           }</span></div>
        </div>
         {article.thumbnail_url && (
          <div className="mb-4">
            <img src={article.thumbnail_url} alt={displayTitle || article.title} className="w-full h-auto rounded-lg" />
          </div>
        )}
        <div className="article-content">
          {displayContent?.split('\n').map((paragraph: string, index: number) => {
            const trimmedParagraph = paragraph.trim();
            if (trimmedParagraph) {
              return <p key={index}>{trimmedParagraph}</p>;
            }
            return null;
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-2"> {/* Added flex-wrap and adjusted gap */}
          {displayTopics.map(topic => (
            <a href={`/${currentLocale}/news/topic/${topic.toLowerCase().replace(/\s+/g, '-')}`} key={topic}>
              <Badge variant="secondary" className="text-white bg-blue-500 hover:bg-blue-600 cursor-pointer">
                {topic}
              </Badge>
            </a>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2"> {/* Added flex-wrap and adjusted gap */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const articleUrl = window.location.href;
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
            onClick={() => {
              const articleUrl = window.location.href;
              const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
              window.open(facebookUrl, '_blank');
            }}
          >
            <Facebook className="h-4 w-4 mr-1" /> {t.share_on_facebook}
          </Button>
        </div>
        {articleList.length > 0 && (
          <div className="flex justify-between mt-8">
            <Button
              onClick={handlePrevious}
              disabled={currentArticleIndex <= 0}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> {t.previous_article || 'Previous Article'}
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentArticleIndex >= articleList.length - 1}
              variant="outline"
            >
              {t.next_article || 'Next Article'} <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {loadingRelated && (
          <div className="py-4 text-center">
            <Alert className="text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <AlertTitle className="text-xl font-semibold">{t.loading_related_articles || "Loading related articles..."}</AlertTitle>
            </Alert>
          </div>
        )}

        {relatedError && (
          <div className="py-4 text-center">
            <Alert variant="destructive" className="text-center">
              <XCircle className="h-4 w-4 mx-auto" />
              <AlertTitle className="text-xl font-semibold">{t.error_loading_related_articles || "Error loading related articles."}</AlertTitle>
              <AlertDescription>
                {relatedError instanceof Error ? relatedError.message : 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!loadingRelated && !relatedError && relatedArticles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">{t.related_articles || 'Related Articles'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedArticles.map(relatedArticle => (
                <a href={`/${currentLocale}/article/${relatedArticle.id}`} key={relatedArticle.id} className="block">
                  <Card className="flex flex-col h-full">
                    {relatedArticle.thumbnail_url && (
                      <div className="relative w-full h-32 overflow-hidden rounded-t-lg">
                        <img src={relatedArticle.thumbnail_url} alt={relatedArticle.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="px-4 py-2">
                      <CardTitle className="text-base">
                        {getTranslatedText(relatedArticle, 'title', currentLocale)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 py-2 text-sm text-muted-foreground">
                      {getDomainFromUrl(relatedArticle.source_url)}
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};

// Helper function to extract domain from URL (copied from NewsFeed.tsx for consistency)
const getDomainFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url;
  }
};

export default ArticleDetail;
