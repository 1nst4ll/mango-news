'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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
  category?: string; // Added optional category property
}

interface NewsFeedProps {
  selectedTopic: string;
  startDate: string | null;
  endDate: string | null;
  searchTerm: string; // Added searchTerm prop
  activeCategory: string; // Added activeCategory prop
}

function NewsFeed({ selectedTopic, startDate, endDate, searchTerm, activeCategory }: NewsFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        let url = 'http://localhost:3000/api/articles';
        const params = new URLSearchParams();
        if (selectedTopic) {
          params.append('topic', selectedTopic);
        }
        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
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

    fetchArticles();
  }, [selectedTopic, startDate, endDate]); // Depend on filters for fetching

  // Client-side filtering based on searchTerm and activeCategory
  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchTerm === '' ||
                          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          article.raw_content.toLowerCase().includes(searchTerm.toLowerCase()); // Include raw_content in search

    // Basic category matching - assuming article object has a 'category' property
    // If not, this logic needs to be adjusted based on available article data
    const matchesCategory = activeCategory === 'all' ||
                            article.category?.toLowerCase() === activeCategory.toLowerCase(); // Removed type assertion

    // Note: Topic filtering is handled by the API call based on selectedTopic prop

    return matchesSearch && matchesCategory;
  });


  if (loading) {
    return (
      <div className="text-foreground">
        Loading articles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Error loading articles: {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (filteredArticles.length === 0) {
     return (
      <div className="text-muted-foreground text-center py-8">
        No news articles found matching your criteria.
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredArticles.map(article => (
        <div key={article.id} className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg">
          {/* Add image and category/topic indicators here if needed, similar to the example */}
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2 text-primary">{article.title}</h3>
            <p className="text-muted-foreground text-sm mb-4">
                Source: <span className="text-accent">{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()}
              </p>
              <p className="text-foreground mb-4">{article.summary}</p>
            <div className="text-right">
              <Link href={`/article/${article.id}`} className="text-primary hover:underline transition-colors">Read More</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
