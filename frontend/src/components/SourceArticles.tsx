import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"; // Assuming you have a Table component
import { Badge } from "./ui/badge"; // Assuming you have a Badge component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"; // For confirmation dialog


// Interface for Article data (matching the backend endpoint response)
interface Article {
  id: number;
  title: string;
  source_url: string;
  ai_summary: string | null;
  ai_tags: string[] | null; // Assuming tags are returned as an array of strings
  ai_image_url: string | null;
}

interface SourceArticlesProps {
  sourceId: string; // sourceId will be a string from Astro.params
}

const SourceArticles: React.FC<SourceArticlesProps> = ({ sourceId }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{ [articleId: number]: { summary?: string | null; tags?: string | null; image?: string | null; deleting?: string | null } }>({});
  const [processingLoading, setProcessingLoading] = useState<{ [articleId: number]: { summary?: boolean; tags?: boolean; image?: boolean; deleting?: boolean } }>({});

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogArticleId, setConfirmDialogArticleId] = useState<number | null>(null);

  const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/sources/${sourceId}/articles`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Article[] = await response.json();
      setArticles(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Error fetching articles: ${err.message}`);
      } else {
        setError('An unknown error occurred while fetching articles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [sourceId]); // Refetch articles when sourceId changes

  const handleProcessAi = async (articleId: number, featureType: 'summary' | 'tags' | 'image') => {
    setProcessingLoading(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], [featureType]: true }
    }));
    setProcessingStatus(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], [featureType]: null }
    }));

    try {
      const response = await fetch(`${apiUrl}/api/articles/${articleId}/process-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureType }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to process ${featureType} for article ${articleId}`);
      }
      setProcessingStatus(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], [featureType]: data.message || `Processed ${featureType} for article ${articleId}.` }
      }));
      // Optionally refetch articles after processing to show updated status/data
      fetchArticles();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProcessingStatus(prev => ({ ...prev, [articleId]: { ...prev[articleId], [featureType]: `Error: ${err.message}` } }));
      } else {
        setProcessingStatus(prev => ({ ...prev, [articleId]: { ...prev[articleId], [featureType]: `An unknown error occurred during ${featureType} processing.` } }));
      }
    } finally {
      setProcessingLoading(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], [featureType]: false }
      }));
    }
  };

  const handleDeleteArticle = (articleId: number) => {
    setConfirmDialogArticleId(articleId);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDeleteArticle = async () => {
    if (confirmDialogArticleId === null) return;

    const articleId = confirmDialogArticleId;
    setIsConfirmDialogOpen(false);
    setConfirmDialogArticleId(null);

    setProcessingLoading(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], deleting: true }
    }));
    setProcessingStatus(prev => ({
      ...prev,
      [articleId]: { ...prev[articleId], deleting: null }
    }));

    try {
      const response = await fetch(`${apiUrl}/api/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete article ${articleId}`);
      }

      // Remove the deleted article from the state
      setArticles(articles.filter(article => article.id !== articleId));
      setProcessingStatus(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], deleting: `Article ${articleId} deleted successfully.` }
      }));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setProcessingStatus(prev => ({ ...prev, [articleId]: { ...prev[articleId], deleting: `Error: ${err.message}` } }));
      } else {
        setProcessingStatus(prev => ({ ...prev, [articleId]: { ...prev[articleId], deleting: 'An unknown error occurred during deletion.' } }));
      }
    } finally {
      setProcessingLoading(prev => ({
        ...prev,
        [articleId]: { ...prev[articleId], deleting: false }
      }));
    }
  };


  return (
    <Card className="mb-6 pt-4">
      <CardHeader>
        <CardTitle className="pb-4">Articles for Source ID: {sourceId}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading articles...</div>
        ) : error ? (
          <div className="text-red-500">Error loading articles: {error}</div>
        ) : articles.length === 0 ? (
          <div className="text-gray-600">No articles found for this source.</div>
        ) : (
          <div className="overflow-x-auto"> {/* Add overflow for responsiveness */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>AI Summary</TableHead>
                  <TableHead>AI Tags</TableHead>
                  <TableHead>AI Image</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium max-w-xs truncate">{article.title}</TableCell> {/* Truncate long titles */}
                    <TableCell className="max-w-xs truncate">
                      <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {article.source_url}
                      </a>
                    </TableCell>
                    <TableCell>
                      {article.ai_summary ? (
                        <Badge variant="default">Generated</Badge>
                      ) : (
                        <Badge variant="secondary">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.ai_tags && article.ai_tags.length > 0 ? (
                        <Badge variant="default">Generated</Badge>
                      ) : (
                        <Badge variant="secondary">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                       {article.ai_image_url ? (
                        <Badge variant="default">Generated</Badge>
                      ) : (
                        <Badge variant="secondary">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 justify-end">
                        <Button
                          onClick={() => handleProcessAi(article.id, 'summary')}
                          disabled={processingLoading[article.id]?.summary}
                          size="sm"
                          variant="secondary"
                        >
                          {processingLoading[article.id]?.summary ? 'Processing...' : 'Rerun Summary'}
                        </Button>
                        <Button
                          onClick={() => handleProcessAi(article.id, 'tags')}
                          disabled={processingLoading[article.id]?.tags}
                          size="sm"
                          variant="secondary"
                        >
                          {processingLoading[article.id]?.tags ? 'Processing...' : 'Rerun Tags'}
                        </Button>
                        <Button
                          onClick={() => handleProcessAi(article.id, 'image')}
                          disabled={processingLoading[article.id]?.image}
                          size="sm"
                          variant="secondary"
                        >
                          {processingLoading[article.id]?.image ? 'Processing...' : 'Rerun Image'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteArticle(article.id)}
                          disabled={processingLoading[article.id]?.deleting}
                          size="sm"
                          variant="destructive"
                        >
                          {processingLoading[article.id]?.deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                       {/* Display processing status messages */}
                       {processingStatus[article.id]?.summary && (
                          <div className={`text-xs mt-1 ${processingStatus[article.id]?.summary?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                            Summary: {processingStatus[article.id]?.summary}
                          </div>
                        )}
                        {processingStatus[article.id]?.tags && (
                          <div className={`text-xs mt-1 ${processingStatus[article.id]?.tags?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                            Tags: {processingStatus[article.id]?.tags}
                          </div>
                        )}
                         {processingStatus[article.id]?.image && (
                          <div className={`text-xs mt-1 ${processingStatus[article.id]?.image?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                            Image: {processingStatus[article.id]?.image}
                          </div>
                        )}
                         {processingStatus[article.id]?.deleting && (
                          <div className={`text-xs mt-1 ${processingStatus[article.id]?.deleting?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                            Deletion: {processingStatus[article.id]?.deleting}
                          </div>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

       {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div>
            <p>Are you sure you want to delete this article? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsConfirmDialogOpen(false)} variant="outline">Cancel</Button>
            <Button
              onClick={handleConfirmDeleteArticle}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SourceArticles;
