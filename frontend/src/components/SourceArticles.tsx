import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"; // Added CardDescription
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"; // Assuming you have a Table component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"; // Import Select components

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"; // For confirmation dialog


// Interface for Article data (matching the backend endpoint response)
interface Article {
  id: number;
  title: string;
  source_url: string;
  thumbnail_url: string | null;
  ai_summary: string | null;
  ai_tags: string[] | null; // English topics
  ai_image_path: string | null;
  topics_es: string | null; // Spanish translated topics (comma-separated string)
  topics_ht: string | null; // Haitian Creole translated topics (comma-separated string)
  publication_date: string | null; // Add publication_date
}

interface SourceArticlesProps {
  sourceId: string; // sourceId will be a string from Astro.params
}

const SourceArticles: React.FC<SourceArticlesProps> = ({ sourceId }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{ [articleId: number]: { summary?: string | null; tags?: string | null; image?: string | null; translations?: string | null; deleting?: string | null } }>({});
  const [processingLoading, setProcessingLoading] = useState<{ [articleId: number]: { summary?: boolean; tags?: boolean; image?: boolean; translations?: boolean; deleting?: boolean } }>({});
  const [reprocessLoading, setReprocessLoading] = useState<boolean>(false); // New state for reprocess button
  const [reprocessStatus, setReprocessStatus] = useState<string | null>(null); // New state for reprocess status

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [articlesPerPage, setArticlesPerPage] = useState(15); // Default articles per page
  const [totalArticles, setTotalArticles] = useState(0);

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogArticleId, setConfirmDialogArticleId] = useState<number | null>(null);

  const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve the token from localStorage when the component mounts
    const token = localStorage.getItem('jwtToken');
    setJwtToken(token);
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchUrl = `${apiUrl}/api/sources/${sourceId}/articles?page=${currentPage}&limit=${articlesPerPage}`;
      console.log(`[Frontend] Fetching articles from: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const totalCount = response.headers.get('X-Total-Count');
      console.log(`[Frontend] Received X-Total-Count header: ${totalCount}`);
      if (totalCount) {
        setTotalArticles(parseInt(totalCount, 10));
      }
      const data: Article[] = await response.json();
      console.log(`[Frontend] Received ${data.length} articles.`);
      setArticles(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Error fetching articles: ${err.message}`);
        console.error(`[Frontend] Error fetching articles:`, err);
      } else {
        setError('An unknown error occurred while fetching articles.');
        console.error(`[Frontend] An unknown error occurred while fetching articles.`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [sourceId, currentPage, articlesPerPage]); // Refetch articles when sourceId, currentPage, or articlesPerPage changes

  const handleProcessAi = async (articleId: number, featureType: 'summary' | 'tags' | 'image' | 'translations') => {
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
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }), // Add Authorization header if token exists
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


  const handleReprocessTopics = async () => {
    setReprocessLoading(true);
    setReprocessStatus(null);
    try {
      const response = await fetch(`${apiUrl}/api/sources/${sourceId}/reprocess-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }), // Add Authorization header if token exists
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to reprocess topics for source ${sourceId}`);
      }
      setReprocessStatus(data.message || `Reprocessed topics for source ${sourceId}.`);
      // Optionally refetch articles after processing to show updated status/data
      fetchArticles();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setReprocessStatus(`Error: ${err.message}`);
      } else {
        setReprocessStatus('An unknown error occurred during topic re-processing.');
      }
    } finally {
      setReprocessLoading(false);
    }
  };

  return (
    <Card className="mb-6 pt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> {/* Adjusted for button */}
        <CardTitle className="pb-0">Articles for Source ID: {sourceId}</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleReprocessTopics}
            disabled={reprocessLoading}
            size="sm"
            variant="outline"
            title="Re-evaluates and updates Spanish and Haitian Creole topic translations for all articles from this source."
          >
            {reprocessLoading ? 'Updating...' : 'Update Translated Topics'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reprocessStatus && (
          <div className={`text-sm mb-4 ${reprocessStatus.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
            {reprocessStatus}
          </div>
        )}
        {loading ? (
          <div>Loading articles...</div>
        ) : error ? (
          <div className="text-red-500">Error loading articles: {error}</div>
        ) : articles.length === 0 ? (
          <div className="text-gray-600">No articles found for this source.</div>
        ) : (
          <>
            {/* Table View for larger screens (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Thumbnail</TableHead> {/* New Header */}
                    <TableHead>Publication Date</TableHead> {/* New Header */}
                    <TableHead>AI Summary</TableHead>
                    <TableHead>AI Tags</TableHead>
                    <TableHead>AI Image Path</TableHead> {/* Updated Header */}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium max-w-xs truncate">{article.title}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {article.source_url}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs">
                         {article.thumbnail_url || article.ai_image_path ? (
                           <a href={article.thumbnail_url || article.ai_image_path || '#'} target="_blank" rel="noopener noreferrer">
                             <img src={article.thumbnail_url || article.ai_image_path || ''} alt="Thumbnail" className="max-w-20 max-h-20 object-cover" />
                           </a>
                         ) : (
                           <span className="text-gray-500">N/A</span>
                         )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {article.publication_date ? new Date(article.publication_date).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center space-x-2">
                          <textarea
                            value={article.ai_summary || ''}
                            readOnly
                            className="flex-grow border rounded-md p-1 text-sm min-h-[50px] max-h-[100px] overflow-y-auto"
                            placeholder="No summary generated"
                          />
                          <Button
                            onClick={() => handleProcessAi(article.id, 'summary')}
                            disabled={processingLoading[article.id]?.summary}
                            size="sm"
                            variant="secondary"
                          >
                            {processingLoading[article.id]?.summary ? '...' : 'Rerun Summary'}
                          </Button>
                        </div>
                         {processingStatus[article.id]?.summary && (
                            <div className={`text-xs mt-1 ${processingStatus[article.id]?.summary?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                              Summary: {processingStatus[article.id]?.summary}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                         <div className="flex items-center space-x-2">
                           <textarea
                             value={article.ai_tags && article.ai_tags.length > 0 ? article.ai_tags.join(', ') : ''}
                             readOnly
                             className="flex-grow border rounded-md p-1 text-sm min-h-[50px] max-h-[100px] overflow-y-auto"
                             placeholder="No tags generated"
                           />
                           <Button
                             onClick={() => handleProcessAi(article.id, 'tags')}
                             disabled={processingLoading[article.id]?.tags}
                             size="sm"
                             variant="secondary"
                           >
                             {processingLoading[article.id]?.tags ? '...' : 'Rerun Tags'}
                           </Button>
                         </div>
                         {processingStatus[article.id]?.tags && (
                            <div className={`text-xs mt-1 ${processingStatus[article.id]?.tags?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                              Tags: {processingStatus[article.id]?.tags}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                         <div className="flex items-center space-x-2">
                           <input
                             type="text"
                             value={article.ai_image_path || ''}
                             readOnly
                             className="flex-grow border rounded-md p-1 text-sm"
                             placeholder="No image URL"
                           />
                           <Button
                             onClick={() => handleProcessAi(article.id, 'image')}
                             disabled={processingLoading[article.id]?.image}
                             size="sm"
                             variant="secondary"
                           >
                             {processingLoading[article.id]?.image ? '...' : 'Rerun Image'}
                           </Button>
                         </div>
                         {processingStatus[article.id]?.image && (
                            <div className={`text-xs mt-1 ${processingStatus[article.id]?.image?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                              Image: {processingStatus[article.id]?.image}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col space-y-2 justify-end">
                          <Button
                            onClick={() => handleProcessAi(article.id, 'translations')}
                            disabled={processingLoading[article.id]?.translations}
                            size="sm"
                            variant="secondary"
                          >
                            {processingLoading[article.id]?.translations ? '...' : 'Rerun Translations'}
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
                           {processingStatus[article.id]?.deleting && (
                            <div className={`text-xs mt-1 ${processingStatus[article.id]?.deleting?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                              Deletion: {processingStatus[article.id]?.deleting}
                            </div>
                          )}
                          {processingStatus[article.id]?.translations && (
                            <div className={`text-xs mt-1 ${processingStatus[article.id]?.translations?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                              Translations: {processingStatus[article.id]?.translations}
                            </div>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Card View for smaller screens (hidden on md and up) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {articles.map((article) => (
                <Card key={article.id} className="p-4 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">{article.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {article.publication_date ? new Date(article.publication_date).toLocaleString() : 'N/A'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {article.thumbnail_url || article.ai_image_path ? (
                      <a href={article.thumbnail_url || article.ai_image_path || '#'} target="_blank" rel="noopener noreferrer">
                        <img src={article.thumbnail_url || article.ai_image_path || ''} alt="Thumbnail" className="w-full h-32 object-cover rounded-md" />
                      </a>
                    ) : (
                      <div className="text-gray-500 text-sm">No Thumbnail</div>
                    )}
                    <p className="text-sm text-muted-foreground break-words">
                      URL: <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{article.source_url}</a>
                    </p>
                    <div>
                      <p className="text-sm font-semibold">AI Summary:</p>
                      <textarea
                        value={article.ai_summary || ''}
                        readOnly
                        className="w-full border rounded-md p-1 text-sm min-h-[50px] max-h-[100px] overflow-y-auto"
                        placeholder="No summary generated"
                      />
                      <Button
                        onClick={() => handleProcessAi(article.id, 'summary')}
                        disabled={processingLoading[article.id]?.summary}
                        size="sm"
                        variant="secondary"
                        className="mt-1 w-full"
                      >
                        {processingLoading[article.id]?.summary ? '...' : 'Rerun Summary'}
                      </Button>
                      {processingStatus[article.id]?.summary && (
                        <div className={`text-xs mt-1 ${processingStatus[article.id]?.summary?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                          Summary: {processingStatus[article.id]?.summary}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">AI Tags:</p>
                      <textarea
                        value={article.ai_tags && article.ai_tags.length > 0 ? article.ai_tags.join(', ') : ''}
                        readOnly
                        className="w-full border rounded-md p-1 text-sm min-h-[50px] max-h-[100px] overflow-y-auto"
                        placeholder="No tags generated"
                      />
                      <Button
                        onClick={() => handleProcessAi(article.id, 'tags')}
                        disabled={processingLoading[article.id]?.tags}
                        size="sm"
                        variant="secondary"
                        className="mt-1 w-full"
                      >
                        {processingLoading[article.id]?.tags ? '...' : 'Rerun Tags'}
                      </Button>
                      {processingStatus[article.id]?.tags && (
                        <div className={`text-xs mt-1 ${processingStatus[article.id]?.tags?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                          Tags: {processingStatus[article.id]?.tags}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">AI Image Path:</p>
                      <input
                        type="text"
                        value={article.ai_image_path || ''}
                        readOnly
                        className="w-full border rounded-md p-1 text-sm"
                        placeholder="No image URL"
                      />
                      <Button
                        onClick={() => handleProcessAi(article.id, 'image')}
                        disabled={processingLoading[article.id]?.image}
                        size="sm"
                        variant="secondary"
                        className="mt-1 w-full"
                      >
                        {processingLoading[article.id]?.image ? '...' : 'Rerun Image'}
                      </Button>
                      {processingStatus[article.id]?.image && (
                        <div className={`text-xs mt-1 ${processingStatus[article.id]?.image?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                          Image: {processingStatus[article.id]?.image}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Translations:</p>
                      <Button
                        onClick={() => handleProcessAi(article.id, 'translations')}
                        disabled={processingLoading[article.id]?.translations}
                        size="sm"
                        variant="secondary"
                        className="mt-1 w-full"
                      >
                        {processingLoading[article.id]?.translations ? '...' : 'Rerun Translations'}
                      </Button>
                      {processingStatus[article.id]?.translations && (
                        <div className={`text-xs mt-1 ${processingStatus[article.id]?.translations?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                          Translations: {processingStatus[article.id]?.translations}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleDeleteArticle(article.id)}
                      disabled={processingLoading[article.id]?.deleting}
                      size="sm"
                      variant="destructive"
                      className="mt-4 w-full"
                    >
                      {processingLoading[article.id]?.deleting ? 'Deleting...' : 'Delete Article'}
                    </Button>
                    {processingStatus[article.id]?.deleting && (
                      <div className={`text-xs mt-1 ${processingStatus[article.id]?.deleting?.startsWith('Error:') ? 'text-red-500' : 'text-green-600'}`}>
                        Deletion: {processingStatus[article.id]?.deleting}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Pagination Controls */}
      {articles.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 p-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Articles per page:</span>
            <Select
              value={articlesPerPage.toString()}
              onValueChange={(value) => {
                setArticlesPerPage(parseInt(value, 10));
                setCurrentPage(1); // Reset to first page when articles per page changes
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={articlesPerPage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {Math.ceil(totalArticles / articlesPerPage)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage * articlesPerPage >= totalArticles}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
