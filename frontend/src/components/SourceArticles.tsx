import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"; // Added CardDescription
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"; // Assuming you have a Table component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"; // Import Select components
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"; // Import Shadcn Pagination components

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

  // Helper function to generate pagination items
  const generatePaginationItems = (currentPage: number, totalPages: number) => {
    const paginationItems: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    const maxPagesToShow = 5; // Number of page links to show directly

    // Always show first page
    if (totalPages > 0) {
      paginationItems.push(1);
    }

    // Determine start and end for the main block of pages
    let startPage = Math.max(2, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPagesToShow / 2));

    // Adjust start/end if near boundaries
    if (currentPage <= Math.ceil(maxPagesToShow / 2) && totalPages > maxPagesToShow) {
      endPage = maxPagesToShow;
    } else if (currentPage > totalPages - Math.floor(maxPagesToShow / 2) && totalPages > maxPagesToShow) {
      startPage = totalPages - maxPagesToShow + 1;
    }

    // Add ellipsis if needed at the beginning
    if (startPage > 2) {
      paginationItems.push('ellipsis-start');
    }

    // Add main page numbers
    for (let i = startPage; i <= endPage; i++) {
      paginationItems.push(i);
    }

    // Add ellipsis if needed at the end
    if (endPage < totalPages - 1) {
      paginationItems.push('ellipsis-end');
    }

    // Always show last page if not already included
    if (totalPages > 1 && !paginationItems.includes(totalPages)) {
      paginationItems.push(totalPages);
    }

    return paginationItems;
  };
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{ [articleId: number]: { summary?: string | null; tags?: string | null; image?: string | null; translations?: string | null; deleting?: string | null } }>({});
  const [processingLoading, setProcessingLoading] = useState<{ [articleId: number]: { summary?: boolean; tags?: boolean; image?: boolean; translations?: boolean; deleting?: boolean } }>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [articlesPerPage, setArticlesPerPage] = useState(5); // Default articles per page
  const [totalArticles, setTotalArticles] = useState(0);

  // Filtering and Sorting states
  const [filterByAiStatus, setFilterByAiStatus] = useState<string>('all'); // 'all', 'missing_summary', 'has_summary', etc.
  const [sortBy, setSortBy] = useState<string>('publication_date'); // 'publication_date', 'title'
  const [sortOrder, setSortOrder] = useState<string>('DESC'); // 'ASC', 'DESC'

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
      const fetchUrl = `${apiUrl}/api/sources/${sourceId}/articles?page=${currentPage}&limit=${articlesPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&filterByAiStatus=${filterByAiStatus}`;
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
  }, [sourceId, currentPage, articlesPerPage, sortBy, sortOrder, filterByAiStatus]); // Refetch articles when sourceId, currentPage, articlesPerPage, sortBy, sortOrder, or filterByAiStatus changes

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


  return (
    <Card className="mb-6 pt-4">
      <CardHeader className="flex flex-col items-start space-y-2 pb-2"> {/* Adjusted for button */}
        <CardTitle className="pb-0">Articles for Source ID: {sourceId}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          title="Go back to Settings"
        >
          <a href={`/settings?tab=sources`}>Back to Settings</a>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading articles...</div>
        ) : error ? (
          <div className="text-red-500">Error loading articles: {error}</div>
        ) : (
          <>
            {/* Filter and Sort Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 p-4 border-b">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Filter by AI Status:</span>
                <Select
                  value={filterByAiStatus}
                  onValueChange={(value) => {
                    setFilterByAiStatus(value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Articles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Articles</SelectItem>
                    <SelectItem value="missing_summary">Missing Summary</SelectItem>
                    <SelectItem value="has_summary">Has Summary</SelectItem>
                    <SelectItem value="missing_tags">Missing Tags</SelectItem>
                    <SelectItem value="has_tags">Has Tags</SelectItem>
                    <SelectItem value="missing_image">Missing Image</SelectItem>
                    <SelectItem value="has_image">Has Image</SelectItem>
                    <SelectItem value="missing_translations">Missing Translations</SelectItem>
                    <SelectItem value="has_translations">Has Translations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Sort By:</span>
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value);
                    setCurrentPage(1); // Reset to first page when sort changes
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Publication Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publication_date">Publication Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortOrder}
                  onValueChange={(value) => {
                    setSortOrder(value);
                    setCurrentPage(1); // Reset to first page when sort order changes
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="DESC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESC">Descending</SelectItem>
                    <SelectItem value="ASC">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Display "No articles found" message if articles.length is 0 AFTER loading */}
            {articles.length === 0 && !loading && !error && (
              <div className="text-gray-600 p-4">No articles found for this source with the current filters.</div>
            )}

            {/* Table View for larger screens (md and up) */}
            <div className="hidden md:block"> {/* Removed overflow-x-auto */}
              <Table className="table-fixed w-full"> {/* Added table-fixed and w-full */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead className="w-[200px]">Title</TableHead>
                    <TableHead className="w-[200px]">URL</TableHead>
                    <TableHead className="w-[100px]">Thumbnail</TableHead>
                    <TableHead className="w-[100px]">Publication Date</TableHead>
                    <TableHead>AI Summary</TableHead>
                    <TableHead>AI Tags</TableHead>
                    <TableHead>AI Image</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article, index) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium w-[50px]">{index + 1}</TableCell>
                      <TableCell className="font-medium w-[200px]">
                        <div className="break-all whitespace-normal overflow-hidden">
                          {article.title}
                        </div>
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <div className="break-all whitespace-normal overflow-hidden">
                          <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {article.source_url}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="w-[100px]">
                         {article.thumbnail_url || article.ai_image_path ? (
                           <a href={article.thumbnail_url || article.ai_image_path || '#'} target="_blank" rel="noopener noreferrer">
                             <img src={article.thumbnail_url || article.ai_image_path || ''} alt="Thumbnail" className="max-w-20 max-h-20 object-cover" />
                           </a>
                         ) : (
                           <span className="text-gray-500">N/A</span>
                         )}
                      </TableCell>
                      <TableCell className="w-[100px]">
                        {article.publication_date ? new Date(article.publication_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell> {/* Removed max-w-xs */}
                        <div className="flex flex-col space-y-2 items-start">
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
                            className="w-full"
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
                      <TableCell> {/* Removed max-w-xs */}
                         <div className="flex flex-col space-y-2 items-start">
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
                             className="w-full"
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
                      <TableCell> {/* Removed max-w-xs */}
                        <div className="flex flex-col space-y-2 items-start">
                          {article.ai_image_path ? (
                            <a href={article.ai_image_path} target="_blank" rel="noopener noreferrer">
                              <img src={article.ai_image_path} alt="AI Image" className="max-w-20 max-h-20 object-cover" />
                            </a>
                          ) : article.thumbnail_url ? (
                            <span className="text-gray-500">Article Image Exists</span>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                          <Button
                            onClick={() => handleProcessAi(article.id, 'image')}
                            disabled={processingLoading[article.id]?.image}
                            size="sm"
                            variant="secondary"
                            className="w-full"
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
                            className="w-full"
                          >
                            {processingLoading[article.id]?.translations ? '...' : 'Rerun Translations'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteArticle(article.id)}
                            disabled={processingLoading[article.id]?.deleting}
                            size="sm"
                            variant="destructive"
                            className="w-full"
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
                      {article.publication_date ? new Date(article.publication_date).toLocaleDateString() : 'N/A'}
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
                      <p className="text-sm font-semibold">AI Image:</p>
                      {article.ai_image_path ? (
                        <a href={article.ai_image_path} target="_blank" rel="noopener noreferrer">
                          <img src={article.ai_image_path} alt="AI Image" className="w-full h-32 object-cover rounded-md" />
                        </a>
                      ) : article.thumbnail_url ? (
                        <span className="text-gray-500">Article Image Exists</span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
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

      {/* Filter and Sort Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 p-4 border-b">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Filter by AI Status:</span>
          <Select
            value={filterByAiStatus}
            onValueChange={(value) => {
              setFilterByAiStatus(value);
              setCurrentPage(1); // Reset to first page when filter changes
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Articles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Articles</SelectItem>
              <SelectItem value="missing_summary">Missing Summary</SelectItem>
              <SelectItem value="has_summary">Has Summary</SelectItem>
              <SelectItem value="missing_tags">Missing Tags</SelectItem>
              <SelectItem value="has_tags">Has Tags</SelectItem>
              <SelectItem value="missing_image">Missing Image</SelectItem>
              <SelectItem value="has_image">Has Image</SelectItem>
              <SelectItem value="missing_translations">Missing Translations</SelectItem>
              <SelectItem value="has_translations">Has Translations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Sort By:</span>
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value);
              setCurrentPage(1); // Reset to first page when sort changes
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Publication Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publication_date">Publication Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(value) => {
              setSortOrder(value);
              setCurrentPage(1); // Reset to first page when sort order changes
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="DESC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">Descending</SelectItem>
              <SelectItem value="ASC">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                  aria-disabled={currentPage === 1}
                />
              </PaginationItem>

              {generatePaginationItems(currentPage, Math.ceil(totalArticles / articlesPerPage)).map((item, index) => (
                <PaginationItem key={index}>
                  {typeof item === 'number' ? (
                    <PaginationLink
                      onClick={() => setCurrentPage(item)}
                      isActive={currentPage === item}
                    >
                      {item}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className={currentPage * articlesPerPage >= totalArticles ? 'opacity-50 cursor-not-allowed' : ''}
                  aria-disabled={currentPage * articlesPerPage >= totalArticles}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
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
