import React, { useEffect, useState, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Button } from "./ui/button"; // Import Button component
import { Badge } from "./ui/badge"; // Import Badge component
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"; // Import Card components
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb"; // Import Breadcrumb components
import { MessageCircleMore, Facebook, Loader2, XCircle, Info, ChevronLeft, ChevronRight, ZoomIn, Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageLightbox, type LightboxImage } from './ui/ImageLightbox';

import { Alert, AlertDescription, AlertTitle } from './ui/alert'; // Import Alert components
import useTranslations from '../lib/hooks/useTranslations'; // Import the shared hook
import { getDomainFromUrl } from '../lib/utils'; // Import shared utility

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
  raw_content_es?: string; // Add translated raw content
  topics_es?: string[];
  title_ht?: string;
  summary_ht?: string;
  raw_content_ht?: string; // Add translated raw content
  topics_ht?: string[];
}

interface ArticleDetailProps {
  id: string;
}

interface GalleryImage {
  src: string;
  alt: string;
}

/** Extract images from a gallery div string: <img src="..." alt="..."> */
function parseGalleryImages(galleryHtml: string): GalleryImage[] {
  const imgs: GalleryImage[] = [];
  const re = /<img\s[^>]*src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(galleryHtml)) !== null) {
    imgs.push({ src: m[1], alt: m[2] || '' });
  }
  return imgs;
}

/**
 * Split article HTML into segments: plain HTML strings and gallery arrays.
 * Gallery divs (<div data-gallery="true">...</div>) are extracted and returned
 * as GalleryImage[] so they can be rendered as an interactive grid.
 */
function splitContentSegments(html: string): Array<string | GalleryImage[]> {
  const segments: Array<string | GalleryImage[]> = [];
  const galleryRe = /<div data-gallery="true">([\s\S]*?)<\/div>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = galleryRe.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push(html.slice(lastIndex, match.index));
    }
    const images = parseGalleryImages(match[1]);
    if (images.length > 0) segments.push(images);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < html.length) {
    segments.push(html.slice(lastIndex));
  }
  return segments;
}

/**
 * For Wix CDN URLs, strip the resize parameters to get the original full-resolution image.
 * Wix URL pattern: https://static.wixstatic.com/media/HASH~mv2.jpg/v1/fill/w_N,h_N,.../HASH~mv2.jpg
 * Full-res URL:    https://static.wixstatic.com/media/HASH~mv2.jpg
 */
function getFullResSrc(src: string): string {
  const m = src.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)/);
  return m ? m[1] : src;
}

/** Thumbnail grid for consecutive images (gallery). Lightbox is handled globally. */
function ImageGallery({ images }: { images: GalleryImage[] }) {
  return (
    <div className="not-prose my-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative w-full overflow-hidden rounded-md bg-muted"
            style={{ aspectRatio: '1 / 1' }}
          >
            <img
              src={img.src}
              alt={img.alt}
              width={323}
              height={323}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [relatedError, setRelatedError] = useState<string | null>(null);

  // Global lightbox for all article images (including thumbnail)
  const contentRef = useRef<HTMLDivElement>(null);
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const [adjacentArticles, setAdjacentArticles] = useState<{ prev: { id: number; title: string } | null; next: { id: number; title: string } | null }>({ prev: null, next: null });

  // Helper to get translated text with fallback
  const getTranslatedText = (a: Article, field: 'title' | 'summary', locale: string) => {
    if (locale === 'es' && a[`${field}_es`]) {
      return a[`${field}_es`];
    }
    if (locale === 'ht' && a[`${field}_ht`]) {
      return a[`${field}_ht`];
    }
    return a[field]; // Fallback to English
  };

  // Must be defined before useEffects that reference it
  const displayTitle = article ? getTranslatedText(article, 'title', currentLocale) : '';

  useEffect(() => {
    // Load article list from localStorage
    const storedList = localStorage.getItem('articleList');
    if (storedList) {
      try {
        const parsedList = JSON.parse(storedList);
        if (Array.isArray(parsedList) && parsedList.length > 0) {
          setArticleList(parsedList);
          const currentIndex = parsedList.indexOf(parseInt(id));
          setCurrentArticleIndex(currentIndex);
          return; // localStorage has data, no need for API fallback
        }
      } catch (e) {
        console.error("Failed to parse articleList from localStorage", e);
      }
    }
    // Fallback: fetch adjacent articles from API for direct-link visitors
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
    fetch(`${apiUrl}/api/articles/${id}/adjacent`)
      .then(res => res.ok ? res.json() : { prev: null, next: null })
      .then(data => setAdjacentArticles(data))
      .catch(() => {});
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
        setRelatedError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingRelated(false);
      }
    };

    if (article) {
      fetchRelatedArticles();
    }
  }, [article]); // Re-fetch related articles when the main article data changes

  const getFallbackMessage = (locale: string) => {
    const langName = locale === 'es' ? 'Spanish' : 'Haitian Creole';
    return t.translation_not_available.replace('{language}', langName);
  };

  // Wire up lightbox: collect all images (thumbnail + article content images)
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const timer = setTimeout(() => {
      const allImages: LightboxImage[] = [];
      // Include the thumbnail as the first lightbox image
      if (article?.thumbnail_url) {
        allImages.push({ src: article.thumbnail_url, alt: displayTitle || article.title });
      }
      // Collect all content images
      const imgs = container.querySelectorAll('img');
      imgs.forEach(img => {
        allImages.push({ src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' });
      });
      setLightboxImages(allImages);

      // Wire click handlers on content images (offset by 1 if thumbnail exists)
      const offset = article?.thumbnail_url ? 1 : 0;
      imgs.forEach((img, idx) => {
        img.style.cursor = 'pointer';
        img.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          setLightboxIdx(idx + offset);
        };
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [article, currentLocale, displayTitle]);

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

  // Helper to get translated raw content with fallback
  const getTranslatedRawContent = (article: Article, locale: string) => {
    if (locale === 'es' && article.raw_content_es) {
      return article.raw_content_es;
    }
    if (locale === 'ht' && article.raw_content_ht) {
      return article.raw_content_ht;
    }
    return article.raw_content; // Fallback to English
  };

  // Helper to get translated topics with fallback
  const getTranslatedTopics = (article: Article, locale: string) => {
    if (locale === 'es' && article.topics_es && article.topics_es.length > 0) {
      return article.topics_es;
    }
    if (locale === 'ht' && article.topics_ht && article.topics_ht.length > 0) {
      return article.topics_ht;
    }
    return article.topics && article.topics.length > 0 ? article.topics : []; // Fallback to English topics or empty array
  };

  const displayContent = getTranslatedRawContent(article, currentLocale);
  const displayTopics = getTranslatedTopics(article, currentLocale);
  const firstTopic = displayTopics.length > 0 ? displayTopics[0] : null;


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${currentLocale}/`}>
              {t.news_feed || 'News Feed'}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {firstTopic && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${currentLocale}/news/topic/${firstTopic.toLowerCase().replace(/\s+/g, '-')}`}>
                  {firstTopic}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <a href={`/${currentLocale}/`} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" /> {t.back_to_news_feed || 'Back to News Feed'}
          </a>
        </Button>
      </div>

      <article className="prose prose-base sm:prose-lg dark:prose-invert max-w-3xl mx-auto font-serif text-foreground">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold !leading-tight mb-4 font-sans">
          {displayTitle || (currentLocale !== 'en' ? `${article.title} (${getFallbackMessage(currentLocale)})` : article.title)}
        </h1>
        <div className="text-sm text-muted-foreground mb-6 border-b border-t border-border py-2">
          <p className="mb-1">
            <span className="font-semibold">{t.source}:</span> <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{article.source_url}</a>
          </p>
          <p className="mb-1">
            {article.author && (
              <span className="mr-4"><span className="font-semibold">{t.author}:</span> {article.author}</span>
            )}
            {article.raw_content && (() => {
              const wordCount = article.raw_content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
              const minutes = Math.max(1, Math.round(wordCount / 200));
              return <span className="mr-4">{minutes} {t.min_read || 'min read'}</span>;
            })()}
            <span className="mr-4"><span className="font-semibold">{t.published}:</span> {
              new Date(article.publication_date).getFullYear() === 2001
                ? new Date(article.publication_date).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
                : new Date(article.publication_date).toLocaleDateString(currentLocale)
            }</span>
            <span><span className="font-semibold">{t.added}:</span> {
              new Date(article.created_at).getFullYear() === 2001
                ? new Date(article.created_at).toLocaleDateString(currentLocale, { month: 'long', day: 'numeric' })
                : new Date(article.created_at).toLocaleDateString(currentLocale)
            }</span>
          </p>
        </div>
        <div className="relative md:float-right md:w-1/2 md:ml-8 mb-6 clear-both">
          {article.thumbnail_url && (
            <img
              src={article.thumbnail_url}
              alt={displayTitle || article.title}
              className="w-full h-auto rounded-lg shadow-lg object-cover cursor-pointer"
              loading="lazy"
              onClick={() => setLightboxIdx(0)}
            />
          )}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {displayTopics.map(topic => (
              <a href={`/${currentLocale}/news/topic/${topic.toLowerCase().replace(/\s+/g, '-')}`} key={topic}>
                <Badge variant="secondary" className="text-accent-foreground bg-accent hover:bg-accent/80 cursor-pointer">
                  {topic}
                </Badge>
              </a>
            ))}
          </div>
        </div>
        <div className="article-content" ref={contentRef}>
          {splitContentSegments(displayContent).map((segment, i) =>
            Array.isArray(segment)
              ? <ImageGallery key={i} images={segment} />
              : <div key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(segment as string) }} />
          )}
        </div>

        {/* Unified image lightbox */}
        <ImageLightbox
          images={lightboxImages.map(img => ({ src: getFullResSrc(img.src), alt: img.alt }))}
          currentIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
        />
        <div className="mt-8 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success(t.link_copied || 'Link copied!');
            }}
            className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <Link2 className="h-4 w-4 mr-1" /> {t.copy_link || 'Copy Link'}
          </Button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.share({ title: displayTitle || article.title, url: window.location.href }).catch(() => {});
              }}
              className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
            >
              <Share2 className="h-4 w-4 mr-1" /> {t.share || 'Share'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              const articleUrl = window.location.href;
              const shareText = `Check out this article: ${displayTitle || article.title} - ${articleUrl}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
              window.open(whatsappUrl, '_blank');
            }}
            className="bg-social-whatsapp hover:bg-social-whatsapp-hover text-white text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <MessageCircleMore className="h-4 w-4 mr-1" /> {t.share_on_whatsapp}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const articleUrl = window.location.href;
              const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
              window.open(facebookUrl, '_blank');
            }}
            className="bg-social-facebook hover:bg-social-facebook-hover text-white text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <Facebook className="h-4 w-4 mr-1" /> {t.share_on_facebook}
          </Button>
        </div>
        {articleList.length > 0 ? (
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
        ) : (adjacentArticles.prev || adjacentArticles.next) && (
          <div className="flex justify-between mt-8">
            <Button
              onClick={() => adjacentArticles.prev && navigateToArticle(adjacentArticles.prev.id)}
              disabled={!adjacentArticles.prev}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> {t.previous_article || 'Previous Article'}
            </Button>
            <Button
              onClick={() => adjacentArticles.next && navigateToArticle(adjacentArticles.next.id)}
              disabled={!adjacentArticles.next}
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
                {relatedError}
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
                        <img src={relatedArticle.thumbnail_url} alt={relatedArticle.title} className="w-full h-full object-cover" loading="lazy" />
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

export default ArticleDetail;
