import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useParams and useNavigate
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm

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

function ArticleDetail() {
  const { id } = useParams<{ id: string }>(); // Get article ID from URL
  const navigate = useNavigate(); // Get the navigate function
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
  }, [id]); // Rerun effect when ID changes

  if (loading) {
    return (
      <div className="text-center text-lg">
        Loading article...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading article: {error.message}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center text-gray-600">
        Article not found.
      </div>
    );
  }

  const handleBackClick = () => {
    navigate('/'); // Navigate back to the home page (NewsFeed)
  };

  return (
    <div className="container mx-auto p-4 sm:p-6"> {/* Adjusted padding for mobile */}
      <button onClick={handleBackClick} className="btn btn-ghost btn-sm mb-4"> {/* Added back button */}
        &larr; Back to News Feed
      </button>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">{article.title}</h1> {/* Adjusted title size for mobile */}
      <p className="text-xs sm:text-sm text-gray-600 mb-4"> {/* Adjusted text size for mobile */}
        Source: <span className="font-semibold">{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()}
      </p>
      <div className="prose max-w-none"> {/* Use prose class for basic typography */}
        {/* Display raw_content using ReactMarkdown */}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.raw_content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default ArticleDetail;
