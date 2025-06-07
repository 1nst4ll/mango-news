import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { DataTable } from "./ui/data-table";
import { getColumns, Article } from "./columns";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

// Interface for Source data (matching the backend endpoint response)
interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean;
  enable_ai_image: boolean;
  enable_ai_translations: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null;
  exclude_patterns: string | null;
  scrape_after_date: string | null;
}

interface SourceArticlesProps {
  sourceId: string; // sourceId will be a string from Astro.params
}

const SourceArticles: React.FC<SourceArticlesProps> = ({ sourceId }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sourceSettings, setSourceSettings] = useState<any>(null); // State to hold source settings

  // New state for processing missing AI data for the current source
  const [articleProcessingLoading, setArticleProcessingLoading] = useState<{ summary?: boolean; tags?: boolean; image?: boolean; translations?: boolean } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [processingLoading, setProcessingLoading] = useState<{ [articleId: number]: { summary?: boolean; tags?: boolean; image?: boolean; translations?: boolean; deleting?: boolean } }>({});
  const [isRescraping, setIsRescraping] = useState<boolean>(false); // New state for rescraping loading

  const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve the token from localStorage when the component mounts
    const token = localStorage.getItem('jwtToken');
    setJwtToken(token);
  }, []);

  const handleProcessAi = async (articleId: number, featureType: 'summary' | 'tags' | 'image' | 'translations') => {
    setProcessingLoading(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], [featureType]: true }
    }));

    try {
      const response = await fetch(`${apiUrl}/api/articles/${articleId}/process-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }), // Add Authorization header if token exists
        },
        body: JSON.stringify({ featureType }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to process ${featureType} for article ${articleId}`);
      }
      toast.success("Processing Complete", {
        description: data.message || `Successfully processed ${featureType} for article ${articleId}.`,
      });
      // Optionally refetch articles after processing to show updated status/data
      fetchArticles();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error("Error", {
          description: `Error: ${err.message}`,
        });
      } else {
        toast.error("Error", {
          description: `An unknown error occurred during ${featureType} processing.`,
        });
      }
    } finally {
      setProcessingLoading(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], [featureType]: false }
      }));
    }
  };

  const handleDeleteArticle = async (articleId: number) => {
    setProcessingLoading(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], deleting: true }
    }));

    try {
      const response = await fetch(`${apiUrl}/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }), // Add Authorization header if token exists
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete article ${articleId}`);
      }

      // Remove the deleted article from the state
      setArticles(articles.filter(article => article.id !== articleId));
      toast.success("Article Deleted", {
        description: `Article ${articleId} has been successfully deleted.`,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error("Error", {
          description: `Error: ${err.message}`,
        });
      } else {
        toast.error("Error", {
          description: 'An unknown error occurred during deletion.',
        });
      }
    } finally {
      setProcessingLoading(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], deleting: false }
      }));
    }
  };

  const handleRescrapeArticle = async (articleId: number) => {
    setProcessingLoading(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], rescraping: true } // Add a rescraping state for individual articles
    }));
    try {
      const response = await fetch(`${apiUrl}/api/articles/${articleId}/rescrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to rescrape article ${articleId}`);
      }
      toast.success("Rescrape Complete", {
        description: data.message || `Successfully rescraped article ${articleId}.`,
      });
      fetchArticles(); // Refetch articles after rescraping
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error("Error", {
          description: `Error: ${err.message}`,
        });
      } else {
        toast.error("Error", {
          description: `An unknown error occurred during rescraping article ${articleId}.`,
        });
      }
    } finally {
      setProcessingLoading(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], rescraping: false }
      }));
    }
  };

  const columns = getColumns({ handleProcessAi, handleDeleteArticle, handleRescrapeArticle });

  // Fetch source settings
  useEffect(() => {
    const fetchSourceSettings = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/sources/${sourceId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Source = await response.json();
        setSourceSettings(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching source settings.';
        console.error("Error fetching source settings:", err);
        toast.error("Error Fetching Source Settings", {
          description: errorMessage,
        });
      }
    };
    fetchSourceSettings();
  }, [sourceId, apiUrl]);


  const fetchArticles = async () => {
    setLoading(true);
    try {
      const fetchUrl = `${apiUrl}/api/sources/${sourceId}/articles`;
      console.log(`[Frontend] Fetching articles from: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Article[] = await response.json();
      console.log(`[Frontend] Received ${data.length} articles.`);
      setArticles(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching articles.';
      console.error(`[Frontend] Error fetching articles:`, err);
      toast.error("Error Fetching Articles", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [sourceId]);

  // New handler function to process all missing AI data for a source
  const handleProcessAllMissingAi = async () => {
    if (!sourceSettings) return;

    const processingPromises: Promise<void>[] = [];

    // Reset all processing statuses and loading states
    setArticleProcessingLoading({ summary: false, tags: false, image: false, translations: false });

    if (sourceSettings.enable_ai_summary) {
      setArticleProcessingLoading(prev => ({ ...prev, summary: true }));
      processingPromises.push(
        fetch(`${apiUrl}/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }),
          },
          body: JSON.stringify({ featureType: 'summary' }),
        })
        .then(response => response.json())
        .then(data => {
          if (!data.error) {
            toast.success("Processing Complete", {
              description: data.message || `Processed missing summaries for ${data.processedCount} articles.`,
            });
          } else {
            toast.error("Error", {
              description: `Error: ${data.error}`,
            });
          }
        })
        .catch(err => toast.error("Error", {
          description: `Error: ${err.message}`,
        }))
        .finally(() => setArticleProcessingLoading(prev => ({ ...prev, summary: false })))
        .then(() => {}) // Ensure the promise resolves to void
      );
    }
    if (sourceSettings.enable_ai_tags) {
      setArticleProcessingLoading(prev => ({ ...prev, tags: true }));
      processingPromises.push(
        fetch(`${apiUrl}/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }),
          },
          body: JSON.stringify({ featureType: 'tags' }),
        })
        .then(response => response.json())
        .then(data => {
          if (!data.error) {
            toast.success("Processing Complete", {
              description: data.message || `Processed missing tags for ${data.processedCount} articles.`,
            });
          } else {
            toast.error("Error", {
              description: `Error: ${data.error}`,
            });
          }
        })
        .catch(err => toast.error("Error", {
          description: `Error: ${err.message}`,
        }))
        .finally(() => setArticleProcessingLoading(prev => ({ ...prev, tags: false })))
        .then(() => {}) // Ensure the promise resolves to void
      );
    }
    if (sourceSettings.enable_ai_image) {
      setArticleProcessingLoading(prev => ({ ...prev, image: true }));
      processingPromises.push(
        fetch(`${apiUrl}/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }),
          },
          body: JSON.stringify({ featureType: 'image' }),
        })
        .then(response => response.json())
        .then(data => {
          if (!data.error) {
            toast.success("Processing Complete", {
              description: data.message || `Processed missing images for ${data.processedCount} articles.`,
            });
          } else {
            toast.error("Error", {
              description: `Error: ${data.error}`,
            });
          }
        })
        .catch(err => toast.error("Error", {
          description: `Error: ${err.message}`,
        }))
        .finally(() => setArticleProcessingLoading(prev => ({ ...prev, image: false })))
        .then(() => {}) // Ensure the promise resolves to void
      );
    }
    if (sourceSettings.enable_ai_translations) {
      setArticleProcessingLoading(prev => ({ ...prev, translations: true }));
      processingPromises.push(
        fetch(`${apiUrl}/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }),
          },
          body: JSON.stringify({ featureType: 'translations' }),
        })
        .then(response => response.json())
        .then(data => {
          if (!data.error) {
            toast.success("Processing Complete", {
              description: data.message || `Processed missing translations for ${data.processedCount} articles.`,
            });
          } else {
            toast.error("Error", {
              description: `Error: ${data.error}`,
            });
          }
        })
        .catch(err => toast.error("Error", {
          description: `Error: ${err.message}`,
        }))
        .finally(() => setArticleProcessingLoading(prev => ({ ...prev, translations: false })))
        .then(() => {}) // Ensure the promise resolves to void
      );
    }

    await Promise.all(processingPromises);
    fetchArticles(); // Refetch articles after all processing is done
  };

  const handleRescrapeAllArticles = () => {
    setIsRescraping(true);
    const eventSource = new EventSource(`${apiUrl}/api/sources/${sourceId}/rescrape-stream?token=${jwtToken}`); // Pass token as query param for SSE

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'success') {
        toast.success("Article Rescraped", {
          description: data.message,
          duration: 3000,
        });
      } else if (data.status === 'error') {
        toast.error("Rescrape Error", {
          description: data.message,
          duration: 5000,
        });
      } else if (data.status === 'info') {
        toast.info("Rescrape Info", {
          description: data.message,
          duration: 3000,
        });
      } else if (data.status === 'complete') {
        toast.success("Rescrape Complete", {
          description: data.message,
          duration: 5000,
        });
        setIsRescraping(false);
        eventSource.close();
        fetchArticles(); // Refetch articles after rescraping is complete
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      toast.error("Rescrape Connection Error", {
        description: "Failed to connect to rescrape stream or an error occurred during streaming.",
        duration: 5000,
      });
      setIsRescraping(false);
      eventSource.close();
    };
  };

  return (
    <Card className="mb-6 pt-4">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-2">
          <CardTitle className="pb-0">Articles for Source ID: {sourceId}</CardTitle>
          <Button
            size="sm"
            variant="outline"
            title="Go back to Settings"
          >
            <a href={`/settings?tab=sources`}>Back to Settings</a>
          </Button>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <Button
            onClick={handleRescrapeAllArticles}
            disabled={isRescraping}
            size="sm"
            variant="outline"
            className="mb-2" // Add some margin to separate buttons
          >
            {isRescraping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rescraping...
              </>
            ) : (
              'Rescrape All Articles'
            )}
          </Button>
          <Button
            onClick={handleProcessAllMissingAi}
            disabled={
              articleProcessingLoading?.summary ||
              articleProcessingLoading?.tags ||
              articleProcessingLoading?.image ||
              articleProcessingLoading?.translations
            }
            size="sm"
            variant="outline"
          >
            {
              (articleProcessingLoading?.summary ||
                articleProcessingLoading?.tags ||
                articleProcessingLoading?.image ||
                articleProcessingLoading?.translations) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
                  </>
                ) : 'Missing AI Data'
            }
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading articles...</div>
        ) : (
            <DataTable columns={columns} data={articles} />
        )}
      </CardContent>
    </Card>
  );
};

export default SourceArticles;
