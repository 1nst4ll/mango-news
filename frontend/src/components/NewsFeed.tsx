'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, Globe, Shield, Facebook, BadgeCheck, Landmark } from 'lucide-react'; // Import icons


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
  imageUrl?: string; // Added optional imageUrl property
  topics?: string[]; // Added optional topics property
  isOfficial?: boolean; // Added optional isOfficial property
  isVerified?: boolean; // Added optional isVerified property
  isFacebook?: boolean; // Added optional isFacebook property
}

interface NewsFeedProps {
  selectedTopic: string;
  startDate: string | null;
  endDate: string | null;
  searchTerm: string; // Added searchTerm prop
  activeCategory: string; // Added activeCategory prop
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


function NewsFeed({ selectedTopic, startDate, endDate, searchTerm, activeCategory }: NewsFeedProps) {
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
      } catch (err: unknown) { // Use unknown for better type safety
        setError(err);
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
                          article.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          article.raw_content?.toLowerCase().includes(searchTerm.toLowerCase()); // Include raw_content in search

    // Basic category matching - assuming article object has a 'category' property
    // If not, this logic needs to be adjusted based on available article data
    const matchesCategory = activeCategory === 'all' ||
                            article.category?.toLowerCase() === activeCategory.toLowerCase();

    // Note: Topic filtering is handled by the API call based on selectedTopic prop

    return matchesSearch && matchesCategory;
  });

  // Helper function to get category icon
  const getCategoryIcon = (category?: string) => {
    switch(category?.toLowerCase()) {
      case 'news':
        return <Newspaper className="h-4 w-4 mr-1 text-blue-500" />;
      case 'government':
        return <Landmark className="h-4 w-4 mr-1 text-green-600" />; // Using Landmark for government
      case 'police':
        return <Shield className="h-4 w-4 mr-1 text-red-600" />;
      case 'social':
        return <Facebook className="h-4 w-4 mr-1 text-blue-600" />;
      case 'international':
        return <Globe className="h-4 w-4 mr-1 text-purple-600" />;
      default:
        return <Newspaper className="h-4 w-4 mr-1 text-gray-500" />;
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-foreground"> {/* Styled loading state */}
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div> {/* Styled spinner */}
        <p className="mt-4 text-muted-foreground">Loading latest news...</p> {/* Styled loading text */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-center py-8"> {/* Styled error state */}
        Error loading articles: {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (filteredArticles.length === 0) {
     return (
      <div className="text-muted-foreground text-center py-8"> {/* Styled empty state */}
        No news articles found matching your criteria.
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredArticles.map(article => (
        <div key={article.id} className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg">
          {article.imageUrl && ( // Display image if available
            <div className="h-48 bg-muted relative"> {/* Styled image container */}
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
               {article.category && ( // Display category if available
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full uppercase font-semibold">
                  {article.category}
                </div>
              )}
              {article.topics && article.topics.length > 0 && ( // Display topics if available
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
                  {article.topics.slice(0, 3).map(topic => (
                    <span key={topic} className="bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded-full">
                      {topic}
                    </span>
                  ))}
                  {article.topics.length > 3 && (
                    <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded-full">
                      +{article.topics.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-3 text-primary">{article.title}</h3> {/* Increased bottom margin */}
            <div className="flex items-center text-base text-muted-foreground mb-4"> {/* Increased bottom margin */}
              <div className="flex items-center mr-4">
                {getCategoryIcon(article.category)} {/* Display category icon */}
                <span className="flex items-center">
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {getDomainFromUrl(article.source_url)} {/* Display source domain */}
                  </a>
                  {article.isVerified && ( // Display verified indicator
                    <BadgeCheck className="h-4 w-4 ml-1 text-green-500" /> // Using BadgeCheck for verified
                  )}
                  {article.isOfficial && ( // Display official indicator
                    <Shield className="h-4 w-4 ml-1 text-blue-500" /> // Using Shield for official
                  )}
                  {article.isFacebook && ( // Display Facebook indicator
                    <Facebook className="h-4 w-4 ml-1 text-blue-600" /> // Using Facebook for Facebook
                  )}
                </span>
              </div>
              <span>{new Date(article.publication_date).toLocaleDateString()}</span> {/* Display formatted date */}
            </div>
              <p className="text-foreground mb-5 leading-relaxed">{article.summary}</p> {/* Increased bottom margin and added relaxed line height */}
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
