import React, { useEffect, useState } from 'react';

// Import locale files
import en from '../locales/en.json';
import es from '../locales/es.json';
import ht from '../locales/ht.json';

const locales = { en, es, ht };

// Helper hook for translations (duplicate from NewsFeed for now, could be refactored)
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
  }, [id]);

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
        <div className="text-center text-xl font-semibold">{t.loading_article}</div>
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

  if (!article) {
    return (
      <div className="container mx-auto p-4 text-center text-gray-600">
        {t.article_not_found}
      </div>
    );
  }

  const displayTitle = getTranslatedText(article, 'title', currentLocale);
  // raw_content is not translated for now, so always use the original
  const displayContent = article.raw_content;


  return (
    <div className="container mx-auto p-4">
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
        <div className="mt-6 flex gap-4">
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              const articleUrl = window.location.href;
              const shareText = `Check out this article: ${displayTitle || article.title} - ${articleUrl}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
              window.open(whatsappUrl, '_blank');
            }}
          >
            {t.share_on_whatsapp}
          </button>
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              const articleUrl = window.location.href;
              const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;
              window.open(facebookUrl, '_blank');
            }}
          >
            {t.share_on_facebook}
          </button>
        </div>
      </article>
    </div>
  );
};

export default ArticleDetail;
