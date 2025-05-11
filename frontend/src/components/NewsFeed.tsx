import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"; // Removed CardFooter

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


function NewsFeed({
  searchTerm = '', // Provide default empty string
  selectedSources = [], // Provide default empty array
  activeCategory = 'all' // Provide default 'all'
}: NewsFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
        let url = `${apiUrl}/api/articles`;
        const params = new URLSearchParams();

        // Log the filter values being used for the fetch
        console.log('Fetching articles with filters:', {
          searchTerm,
          selectedSources,
        });

        // Add selected sources to params (assuming backend handles comma-separated)
        if (selectedSources.length > 0) {
            params.append('sources', selectedSources.join(','));
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
        console.log('Fetched articles data:', data); // Log the fetched data
        setArticles(data);
      } catch (err: unknown) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    // Depend on all filter props for fetching
    fetchArticles();
  }, [searchTerm, selectedSources]); // Depend on all filter props for fetching

  // Client-client filtering based on activeCategory (kept for now)
  const filteredArticles = articles.filter(article => {
    // Basic category matching - assuming article object has a 'category' property
    // If not, this logic needs to be adjusted based on available article data
    const matchesCategory = activeCategory === 'all' ||
                            article.category?.toLowerCase() === activeCategory.toLowerCase();

    // Note: Topic, Source, Date Range, and Search filtering are now handled by the API call

    return matchesCategory;
  });

  // Group articles by date (Day, Month, Year)
  const groupedArticles = filteredArticles.reduce((acc, article) => {
    const date = new Date(article.publication_date);
    const year = date.getFullYear();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    const dateKey = `${month} ${day}, ${year}`;

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedArticles).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });


  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-xl font-semibold">Loading...</div>
        <p className="text-center text-gray-600">Loading latest news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-red-500">
        Error loading articles: {error instanceof Error ? error.message : 'An unknown error occurred'}
      </div>
    );
  }

  if (filteredArticles.length === 0) {
     return (
      <div className="container mx-auto p-4 text-center text-gray-600">
        No news articles found matching your criteria.
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4">
      {sortedDates.map((dateKey, index) => (
        <div key={dateKey}>
          {index > 0 && (
            <div className="relative my-8">
              <hr className="border-t border-gray-300" />
            </div>
          )}
          <h2 className="text-2xl font-bold mb-4">{dateKey}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedArticles[dateKey].map(article => {
              try {
                return (
                  <a href={`/article/${article.id}`} key={article.id} className="block"> {/* Wrap card with anchor tag */}
                    <Card className="flex flex-col h-full"> {/* Removed pb-6 from here */}
                      {article.thumbnail_url && (
                        <div className="relative w-full h-48 overflow-hidden rounded-t-xl"> {/* Added rounded top corners */}
                          <img src={article.thumbnail_url} alt={article.title} className="w-full h-full object-cover" />
                          {article.topics && article.topics.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                              <div className="flex flex-wrap gap-1">
                                {article.topics.map(topic => (
                                  <span key={topic} className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <CardHeader className={article.thumbnail_url ? "px-6 pt-4" : "px-6 pt-4"}> {/* Always add top padding to header */}
                        <CardTitle>{article.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          <span
                            className="hover:underline cursor-pointer" // Add cursor-pointer for visual indication
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              window.open(article.source_url, '_blank', 'noopener,noreferrer'); // Open in new tab
                            }}
                          >
                            {getDomainFromUrl(article.source_url)}
                          </span>
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
                      </CardHeader>
                      <CardContent className="flex-grow px-6 pb-4"> {/* Always add horizontal and bottom padding */}
                          {/* Format AI summary bold text with accent color */}
                          <p className="text-foreground" dangerouslySetInnerHTML={{ __html: article.summary?.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold;" class="text-accent-foreground">$1</span>') || '' }}></p>
                      </CardContent>
                      {/* Add WhatsApp Share Button */}
                      <div className="px-6 pb-4">
                        <button
                          className="text-sm text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            const articleUrl = `${window.location.origin}/article/${article.id}`;
                            const shareText = `Check out this article: ${article.title} - ${articleUrl}`;
                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                        >
                          Share on WhatsApp
                        </button>
                      </div>
                      {/* Removed CardFooter */}
                    </Card>
                  </a>
                );
              } catch (error) {
                console.error(`Error rendering article ${article.id}:`, error, article);
                return null; // Don't render the problematic article
              }
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
