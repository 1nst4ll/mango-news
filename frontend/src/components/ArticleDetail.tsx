import React, { useEffect, useState } from 'react';

interface Article {
  id: number;
  title: string;
  source_id: number;
  source_url: string;
  author?: string; // Added optional author property
  publication_date: string;
  raw_content: string;
  summary: string;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string; // Added optional thumbnail_url property
  topics?: string[]; // Added optional topics property
  category?: string; // Added optional category property
}

interface ArticleDetailProps {
  id: string; // Changed from params: { id: string } to just id: string
}

const ArticleDetail = ({ id }: ArticleDetailProps) => { // Destructure id directly
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
        const response = await fetch(`${apiUrl}/api/articles/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Article = await response.json();
        setArticle(data);
      } catch (err: unknown) { // Use unknown for better type safety
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-xl font-semibold">Loading article...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500">
        Error loading article: {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto p-4 text-center text-gray-600">
        Article not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <article className="prose lg:prose-xl article-content"> {/* Using Tailwind Typography prose class */}
        <h1>{article.title}</h1>
        <div className="text-sm text-muted-foreground mb-4"> {/* Changed p to div */}
        Source: <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{article.source_url}</a>
        <div> {article.author && (
            <span> Author: {article.author} </span>
          )}
           | Published: {
             new Date(article.publication_date).getFullYear() === 2001
               ? new Date(article.publication_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
               : new Date(article.publication_date).toLocaleDateString()
           }
           {/* Display date added to database */}
           <span> | Added: {
             new Date(article.created_at).getFullYear() === 2001
               ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
               : new Date(article.created_at).toLocaleDateString()
           }</span></div>
        </div> {/* Changed closing p to div */}
         {article.thumbnail_url && (
          <div className="mb-4">
            {/* Removed object-cover */}
            <img src={article.thumbnail_url} alt={article.title} className="w-full h-auto rounded-lg" />
          </div>
        )}
        <div className="article-content">
          {article.raw_content.split('\n').map((paragraph, index) => {
            // Trim whitespace and check if the paragraph is not empty
            const trimmedParagraph = paragraph.trim();
            if (trimmedParagraph) {
              return <p key={index}>{trimmedParagraph}</p>;
            }
            // Return null for empty paragraphs to avoid rendering empty <p> tags
            return null;
          })}
        </div>
        {/* Add WhatsApp Share Button */}
        <div className="mt-6"> {/* Added margin top for spacing */}
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              const articleUrl = window.location.href;
              const shareText = `Check out this article: ${article.title} - ${articleUrl}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
              window.open(whatsappUrl, '_blank');
            }}
          >
            Share on WhatsApp
          </button>
        </div>
      </article>
    </div>
  );
};

export default ArticleDetail;
