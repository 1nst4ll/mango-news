'use client';

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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
}

interface NewsFeedProps {
  selectedTopics: string[];
  startDate: string | null;
  endDate: string | null;
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


function NewsFeed({ selectedTopics, startDate, endDate, searchTerm, selectedSources, activeCategory }: NewsFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        let url = 'http://localhost:3000/api/articles';
        const params = new URLSearchParams();

        // Add selected topics to params (assuming backend handles comma-separated)
        if (selectedTopics.length > 0) {
          params.append('topics', selectedTopics.join(','));
        }

        // Add selected sources to params (assuming backend handles comma-separated)
        if (selectedSources.length > 0) {
            params.append('sources', selectedSources.join(','));
        }

        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
        }

        // Add search term to params
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
        setArticles(data);
      } catch (err: unknown) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    // Depend on all filter props for fetching
    fetchArticles();
  }, [selectedTopics, startDate, endDate, searchTerm, selectedSources]);

  // Client-client-side filtering based on activeCategory (kept for now)
  const filteredArticles = articles.filter(article => {
    // Basic category matching - assuming article object has a 'category' property
    // If not, this logic needs to be adjusted based on available article data
    const matchesCategory = activeCategory === 'all' ||
                            article.category?.toLowerCase() === activeCategory.toLowerCase();

    // Note: Topic, Source, Date Range, and Search filtering are now handled by the API call

    return matchesCategory;
  });


  if (loading) {
    return (
      <div>
        <div>Loading...</div>
        <p>Loading latest news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        Error loading articles: {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (filteredArticles.length === 0) {
     return (
      <div>
        No news articles found matching your criteria.
      </div>
    );
  }


  return (
    <div>
      {filteredArticles.map(article => (
        <div key={article.id}>
          {article.thumbnail_url && (
            <div>
              <img src={article.thumbnail_url} alt={article.title} />
            </div>
          )}
          <div>
            <h2>{article.title}</h2>
            <p>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                {getDomainFromUrl(article.source_url)}
              </a>
              {article.author && (
                <span> | By {article.author}</span>
              )}
               <span> | Published: {
                new Date(article.publication_date).getFullYear() === 2001
                  ? new Date(article.publication_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  : new Date(article.publication_date).toLocaleDateString()
              }</span>
              <span> | Added: {
                new Date(article.created_at).getFullYear() === 2001
                  ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  : new Date(article.created_at).toLocaleDateString()
              }</span>
            </p>
          </div>
          <div>
              <p>{article.summary}</p>
          </div>
          <div>
            <Link href={`/article/${article.id}`}>Read More</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
