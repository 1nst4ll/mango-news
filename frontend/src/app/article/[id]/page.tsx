'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface Article {
  id: number;
  title: string;
  source_id: number;
  source_url: string;
  publication_date: string;
  raw_content: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

interface ArticleDetailProps {
  params: {
    id: string;
  };
}

const ArticleDetail = ({ params }: ArticleDetailProps) => {
  const { id } = params;
  // Removed useRouter as it's no longer needed for the back button
  // const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        const response = await fetch(`http://localhost:3000/api/articles/${id}`);
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

  // Removed handleBackClick as the back button is now in the persistent navbar
  // const handleBackClick = () => {
  //   router.push('/');
  // };

  if (loading) {
    return (
      <div className="text-foreground">
        Loading article...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Error loading article: {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-muted-foreground">
        Article not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Removed Back to News Feed button/link - navigation is now in the persistent navbar */}
      <h1 className="text-3xl font-bold mb-4 text-primary">{article.title}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Source: <span className="text-primary">{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()}
      </p>
      <div className="prose max-w-none text-foreground"> {/* Apply text-foreground for content color */}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.raw_content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ArticleDetail;
