import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { DataTable } from "./ui/data-table";
import { getColumns, Article } from "./columns";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useSingleImageLightbox } from "./ui/ImageLightbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Skeleton } from "./ui/skeleton";
import ArticleEditDialog from './ArticleEditDialog';

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
  const [allSources, setAllSources] = useState<{ id: number; name: string }[]>([]);

  // New state for processing missing AI data for the current source
  const [articleProcessingLoading, setArticleProcessingLoading] = useState<{ summary?: boolean; tags?: boolean; image?: boolean; translations?: boolean } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [processingLoading, setProcessingLoading] = useState<{ [articleId: number]: { summary?: boolean; tags?: boolean; image?: boolean; translations?: boolean; deleting?: boolean } }>({});
  const [isRescraping, setIsRescraping] = useState<boolean>(false); // New state for rescraping loading

  const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev

  // State for ArticleEditDialog
  const [isArticleEditDialogOpen, setIsArticleEditDialogOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  // Image lightbox
  const { openLightbox, lightboxElement } = useSingleImageLightbox();

  // Bulk delete state
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pagination state for server-side pagination
  const STORAGE_KEY = 'source-articles-table';
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    try { const s = localStorage.getItem(`${STORAGE_KEY}:pageSize`); if (s) return Number(s); } catch {}
    return 10;
  });
  const [pageCount, setPageCount] = useState(0); // Total number of pages
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');


  const handleProcessAi = async (articleId: number, featureType: 'summary' | 'tags' | 'image' | 'translations') => {
    setProcessingLoading(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], [featureType]: true }
    }));

    try {
      const response = await apiFetch(`/api/articles/${articleId}/process-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      fetchArticles(pageIndex, pageSize);
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
      const response = await apiFetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
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
      fetchArticles(pageIndex, pageSize); // Refetch articles to update pagination if needed
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
      const response = await apiFetch(`/api/articles/${articleId}/rescrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to rescrape article ${articleId}`);
      }
      toast.success("Rescrape Complete", {
        description: data.message || `Successfully rescraped article ${articleId}.`,
      });
      fetchArticles(pageIndex, pageSize); // Refetch articles after rescraping
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

  const handleEditArticle = (articleId: number) => {
    setSelectedArticleId(articleId);
    setIsArticleEditDialogOpen(true);
  };

  const handleCloseArticleEditDialog = () => {
    setIsArticleEditDialogOpen(false);
    setSelectedArticleId(null);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const ids = selectedArticles.map(a => a.id);
    let successCount = 0;
    let failCount = 0;
    await Promise.all(ids.map(async (id) => {
      try {
        const response = await apiFetch(`/api/articles/${id}`, { method: 'DELETE' });
        if (response.ok) { successCount++; } else { failCount++; }
      } catch { failCount++; }
    }));
    setIsBulkDeleting(false);
    setIsBulkDeleteDialogOpen(false);
    if (successCount > 0) toast.success(`Deleted ${successCount} article${successCount !== 1 ? 's' : ''}`);
    if (failCount > 0) toast.error(`Failed to delete ${failCount} article${failCount !== 1 ? 's' : ''}`);
    fetchArticles(pageIndex, pageSize);
  };

  const handleArticleSaveSuccess = () => {
    fetchArticles(pageIndex, pageSize); // Refresh articles after a successful save
  };

  const handleToggleBlock = async (articleId: number, blocked: boolean) => {
    try {
      const response = await apiFetch(`/api/articles/${articleId}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      });
      if (!response.ok) throw new Error('Failed to update block status');
      toast.success(`Article ${blocked ? 'blocked' : 'unblocked'}`);
      fetchArticles(pageIndex, pageSize);
    } catch {
      toast.error('Failed to update block status');
    }
  };

  const columns = getColumns({ handleProcessAi, handleDeleteArticle, handleRescrapeArticle, handleEditArticle, handleImageClick: (url: string) => openLightbox(url), handleToggleBlock });

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
    const fetchAllSources = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/sources`);
        if (!response.ok) return;
        const data = await response.json();
        // Sort by id so prev/next order is consistent
        setAllSources((data as { id: number; name: string }[]).sort((a, b) => a.id - b.id));
      } catch {}
    };
    fetchSourceSettings();
    fetchAllSources();
  }, [sourceId, apiUrl]);


  const fetchArticles = async (page: number, limit: number, search?: string) => {
    setLoading(true);
    try {
      const searchParam = (search ?? debouncedSearch) ? `&search=${encodeURIComponent(search ?? debouncedSearch)}` : '';
      const fetchUrl = `${apiUrl}/api/sources/${sourceId}/articles?page=${page + 1}&limit=${limit}${searchParam}`;
      console.log(`[Frontend] Fetching articles from: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const total = parseInt(response.headers.get('X-Total-Count') || '0', 10);
      const data: Article[] = await response.json();
      console.log(`[Frontend] Received ${data.length} articles. Total count: ${total}`);
      setArticles(data);
      setTotalCount(total);
      setPageCount(Math.ceil(total / limit));
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

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageIndex(0); // Reset to first page on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchArticles(pageIndex, pageSize, debouncedSearch);
  }, [sourceId, pageIndex, pageSize, debouncedSearch]);

  // New handler function to process all missing AI data for a source
  const handleProcessAllMissingAi = async () => {
    if (!sourceSettings) return;

    const processingPromises: Promise<void>[] = [];

    // Reset all processing statuses and loading states
    setArticleProcessingLoading({ summary: false, tags: false, image: false, translations: false });

    if (sourceSettings.enable_ai_summary) {
      setArticleProcessingLoading(prev => ({ ...prev, summary: true }));
      processingPromises.push(
        apiFetch(`/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        apiFetch(`/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        apiFetch(`/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        apiFetch(`/api/process-missing-ai/${sourceId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    fetchArticles(pageIndex, pageSize); // Refetch articles after all processing is done
  };

  const handleRescrapeAllArticles = () => {
    setIsRescraping(true);
    // withCredentials: true ensures cookies are sent on cross-origin requests
    const eventSource = new EventSource(`${apiUrl}/api/sources/${sourceId}/rescrape-stream`, { withCredentials: true });

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
        fetchArticles(pageIndex, pageSize); // Refetch articles after rescraping is complete
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
          <div className="flex items-center gap-2">
            {(() => {
              const currentIndex = allSources.findIndex(s => s.id === Number(sourceId));
              const prev = currentIndex > 0 ? allSources[currentIndex - 1] : null;
              const next = currentIndex >= 0 && currentIndex < allSources.length - 1 ? allSources[currentIndex + 1] : null;
              return (
                <>
                  <Button
                    size="sm" variant="outline" className="h-8 w-8 p-0"
                    disabled={!prev}
                    onClick={() => prev && (window.location.href = `/settings/source/${prev.id}`)}
                    title={prev ? `Previous: ${prev.name}` : undefined}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">{prev ? `Previous: ${prev.name}` : 'No previous source'}</span>
                  </Button>
                  <div>
                    <CardTitle className="pb-0">Articles for Source ID: {sourceId}</CardTitle>
                    {sourceSettings && <CardDescription>{sourceSettings.name}</CardDescription>}
                  </div>
                  <Button
                    size="sm" variant="outline" className="h-8 w-8 p-0"
                    disabled={!next}
                    onClick={() => next && (window.location.href = `/settings/source/${next.id}`)}
                    title={next ? `Next: ${next.name}` : undefined}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">{next ? `Next: ${next.name}` : 'No next source'}</span>
                  </Button>
                </>
              );
            })()}
          </div>
          <Button asChild size="sm" variant="outline" title="Go back to Settings">
            <a href={`/settings?tab=sources`}>Back to Settings</a>
          </Button>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <Button
            onClick={handleRescrapeAllArticles}
            disabled={isRescraping}
            size="sm"
            variant="outline"
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
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
            <DataTable
              columns={columns}
              data={articles}
              pageCount={pageCount}
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalCount={totalCount}
              storageKey={STORAGE_KEY}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              onPaginationChange={({ pageIndex, pageSize }) => {
                setPageIndex(pageIndex);
                setPageSize(pageSize);
              }}
              onRowSelectionChange={(rows) => setSelectedArticles(rows as Article[])}
              bulkActions={
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete selected
                </Button>
              }
            />
        )}
      </CardContent>
      <ArticleEditDialog
        isOpen={isArticleEditDialogOpen}
        onClose={handleCloseArticleEditDialog}
        articleId={selectedArticleId}
        onSaveSuccess={handleArticleSaveSuccess}
      />

      {/* Bulk delete confirmation */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedArticles.length} article{selectedArticles.length !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedArticles.length} selected article{selectedArticles.length !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lightboxElement}
    </Card>
  );
};

export default SourceArticles;
