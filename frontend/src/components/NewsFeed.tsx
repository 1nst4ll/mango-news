'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components

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
  category?: string; // Added optional category property
  thumbnail_url?: string; // Renamed imageUrl to thumbnail_url to match DB schema
  topics?: string[]; // Added optional topics property
  isOfficial?: boolean; // Added optional isOfficial property
  isVerified?: boolean; // Added optional isVerified property
  isFacebook?: boolean; // Added optional isFacebook property
}

interface NewsFeedProps {
  selectedTopics: string[]; // Changed to array
  startDate: string | null;
  endDate: string | null;
  searchTerm: string;
  selectedSources: string[]; // Added selectedSources prop
  activeCategory: string; // Kept for now, but might be redundant with source filtering
}

// Helper function to extract domain from URL
const getDomainFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url; // Return original URL if parsing fails
  }
};


function NewsFeed({ selectedTopics, startDate, endDate, searchTerm, selectedSources, activeCategory }: NewsFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety

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
      } catch (err: unknown) { // Use unknown for better type safety
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Grid layout for news articles */}
      {filteredArticles.map(article => (
        <Card key={article.id} className="flex flex-col"> {/* Use Card component */}
          {article.thumbnail_url && (
            <div className="relative w-full h-48 overflow-hidden rounded-t-md"> {/* Container for thumbnail */}
              <img src={article.thumbnail_url} alt={article.title} className="w-full h-full object-cover" /> {/* Styled thumbnail */}
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-xl font-heading">{article.title}</CardTitle> {/* Styled title with custom font */}
            <CardDescription className="text-sm text-muted-foreground">
              <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {getDomainFromUrl(article.source_url)} {/* Display source domain */}
              </a>
              {article.author && ( // Display author if available
                <span> | By {article.author}</span>
              )}
               <span> | Published: {
                new Date(article.publication_date).getFullYear() === 2001
                  ? new Date(article.publication_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  : new Date(article.publication_date).toLocaleDateString()
              }</span>
              {/* Display date added to database */}
              <span> | Added: {
                new Date(article.created_at).getFullYear() === 2001
                  ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                  : new Date(article.created_at).toLocaleDateString()
              }</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow"> {/* Allow content to grow */}
              <p className="text-body">{article.summary}</p> {/* Styled summary with custom font */}
          </CardContent>
          <CardFooter>
            <Link href={`/article/${article.id}`} className="text-brandPrimary hover:underline">Read More</Link> {/* Styled link with custom color */}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default NewsFeed;
