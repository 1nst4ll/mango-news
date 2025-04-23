'use client';

import React, { useEffect, useState } from 'react';
import { use } from 'react';


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
      <div>
        <div>
          <div>
            Loading article...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>
          <div>
            Error loading article: {error instanceof Error ? error.message : 'An unknown error occurred'}
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div>
        <div>
          <div>
            Article not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div>
          <h3>{article.title}</h3>
          <p>
            Source: <a href={article.source_url} target="_blank" rel="noopener noreferrer">{article.source_url}</a>
            {article.author && (
              <span> | Author: {article.author}</span>
            )}
             | Published: {
               new Date(article.publication_date).getFullYear() === 2001
                 ? new Date(article.publication_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                 : new Date(article.publication_date).toLocaleDateString()
             }
             {/* Display date added to database */}
             <span>Added: {
               new Date(article.created_at).getFullYear() === 2001
                 ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                 : new Date(article.created_at).toLocaleDateString()
             }</span>
          </p>
           {article.thumbnail_url && (
            <div>
              <img src={article.thumbnail_url} alt={article.title} />
            </div>
          )}
           {/* Removed topics */}
        </div>
        <div>
          <p>{article.raw_content}</p>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
