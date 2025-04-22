'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

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
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('An unknown error occurred'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  const handleBackClick = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div>
        Loading article...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        Error loading article: {error.message}
      </div>
    );
  }

  if (!article) {
    return (
      <div>
        Article not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <button onClick={handleBackClick} className="text-blue-600 hover:underline mb-6">
        &larr; Back to News Feed
      </button>
      <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
      <p className="text-gray-600 text-sm mb-6">
        Source: <span className="text-blue-600">{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()}
      </p>
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.raw_content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ArticleDetail;
