import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { MoreHorizontal, Search, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";
import { apiFetch } from '../../lib/api';
import type { Source } from './types';

interface SearchResult {
  id: number;
  title: string;
  source_url: string;
  source_name: string;
  source_id: number;
  is_blocked: boolean;
  publication_date: string | null;
}

export interface SourceManagementProps {
  sources: Source[];
  filteredSources: Source[];
  sourcesLoading: boolean;
  sourcesError: unknown;
  sourceSearch: string;
  setSourceSearch: (v: string) => void;
  sourceFilterStatus: 'all' | 'active' | 'inactive';
  setSourceFilterStatus: (v: 'all' | 'active' | 'inactive') => void;
  selectedSources: Set<number>;
  articleCountMap: Map<string, number>;
  sourceScrapingLoading: { [key: number]: boolean };
  sourceArticleDeletionLoading: { [key: number]: boolean };
  sourceScrapeResult: { [key: number]: string | null };
  bulkActionLoading: boolean;
  openAddModal: () => void;
  openEditModal: (source: Source) => void;
  handleToggleSelectSource: (id: number) => void;
  handleSelectAllFiltered: () => void;
  handleBulkToggleActive: (active: boolean) => void;
  handleBulkDelete: () => void;
  handleTriggerScraperForSource: (sourceId: number) => void;
  handleDeleteArticlesForSource: (sourceId: number) => void;
  handleDeleteSource: (id: number) => void;
}

const SourceManagement: React.FC<SourceManagementProps> = ({
  sources,
  filteredSources,
  sourcesLoading,
  sourcesError,
  sourceSearch,
  setSourceSearch,
  sourceFilterStatus,
  setSourceFilterStatus,
  selectedSources,
  articleCountMap,
  sourceScrapingLoading,
  sourceArticleDeletionLoading,
  sourceScrapeResult,
  bulkActionLoading,
  openAddModal,
  openEditModal,
  handleToggleSelectSource,
  handleSelectAllFiltered,
  handleBulkToggleActive,
  handleBulkDelete,
  handleTriggerScraperForSource,
  handleDeleteArticlesForSource,
  handleDeleteSource,
}) => {
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [articleSearchResults, setArticleSearchResults] = useState<SearchResult[]>([]);
  const [articleSearching, setArticleSearching] = useState(false);

  const handleArticleSearch = useCallback(async (query: string) => {
    setArticleSearchQuery(query);
    if (query.trim().length < 2) { setArticleSearchResults([]); return; }
    setArticleSearching(true);
    try {
      const res = await apiFetch(`/api/articles/admin/search?q=${encodeURIComponent(query.trim())}&limit=15`);
      if (res.ok) setArticleSearchResults(await res.json());
    } catch { /* ignore */ } finally {
      setArticleSearching(false);
    }
  }, []);

  return (
    <>
    {/* Global Article Search */}
    <Card className="mb-6 pt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" />
          Article Search
        </CardTitle>
        <CardDescription>Search across all sources by title or URL.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search articles across all sources..."
          value={articleSearchQuery}
          onChange={(e) => handleArticleSearch(e.target.value)}
        />
        {articleSearching && <p className="text-sm text-muted-foreground mt-2">Searching...</p>}
        {articleSearchResults.length > 0 && (
          <div className="mt-3 space-y-1 max-h-80 overflow-y-auto">
            {articleSearchResults.map(article => (
              <div
                key={article.id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted text-sm group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {article.is_blocked && <Badge variant="destructive" className="text-[10px] px-1 py-0">Blocked</Badge>}
                    <a
                      href={`/en/article/${article.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-medium hover:underline text-primary"
                    >
                      {article.title}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>ID: {article.id}</span>
                    <span>·</span>
                    <a
                      href={`/settings/source/${article.source_id}`}
                      className="hover:underline"
                    >
                      {article.source_name}
                    </a>
                    {article.publication_date && (
                      <>
                        <span>·</span>
                        <span>{new Date(article.publication_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                  title="Open source URL"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>
            ))}
          </div>
        )}
        {articleSearchQuery.trim().length >= 2 && !articleSearching && articleSearchResults.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">No articles found.</p>
        )}
      </CardContent>
    </Card>

    <Card className="mb-6 pt-4">
      <CardHeader>
        <div className="flex items-center justify-between pb-2">
          <CardTitle>Sources</CardTitle>
          <Button onClick={openAddModal} size="sm">Add New Source</Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Input
            placeholder="Search by name or URL…"
            value={sourceSearch}
            onChange={e => setSourceSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={sourceFilterStatus} onValueChange={v => setSourceFilterStatus(v as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sourcesLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : sourcesError ? (
          <Alert variant="destructive">
            <AlertDescription>Error loading sources: {sourcesError instanceof Error ? sourcesError.message : 'An unknown error occurred'}</AlertDescription>
          </Alert>
        ) : sources.length === 0 ? (
          <div className="text-muted-foreground">No sources found.</div>
        ) : (
          <>
            {/* Bulk toolbar */}
            {filteredSources.length > 0 && (
              <div className="flex items-center gap-3 mb-4 p-2 rounded-md bg-muted/50">
                <Checkbox
                  id="selectAll"
                  checked={filteredSources.length > 0 && filteredSources.every(s => selectedSources.has(s.id))}
                  onCheckedChange={handleSelectAllFiltered}
                />
                <Label htmlFor="selectAll" className="text-sm cursor-pointer">
                  {selectedSources.size > 0 ? `${selectedSources.size} selected` : 'Select all'}
                </Label>
                {selectedSources.size > 0 && (
                  <div className="flex gap-2 ml-2">
                    <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggleActive(true)}>
                      {bulkActionLoading ? '…' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggleActive(false)}>
                      {bulkActionLoading ? '…' : 'Deactivate'}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={bulkActionLoading} onClick={handleBulkDelete}>
                      {bulkActionLoading ? '…' : 'Delete'}
                    </Button>
                  </div>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{filteredSources.length} of {sources.length} sources</span>
              </div>
            )}

            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSources.map(source => (
                <Card key={source.id} className={`p-4 shadow-sm pt-4 flex flex-col ${selectedSources.has(source.id) ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          checked={selectedSources.has(source.id)}
                          onCheckedChange={() => handleToggleSelectSource(source.id)}
                        />
                        <Badge variant={source.is_active ? 'default' : 'secondary'} className="text-xs">
                          {source.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{source.scraping_method || 'opensource'}</Badge>
                        {sourceScrapeResult[source.id] && (
                          <Badge variant="outline" className="text-xs text-success border-success/30">
                            {sourceScrapeResult[source.id]}
                          </Badge>
                        )}
                      </div>

                      {/* Name with tooltip for truncation */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CardTitle className="text-base font-medium truncate cursor-default">{source.name}</CardTitle>
                        </TooltipTrigger>
                        <TooltipContent side="top">{source.name}</TooltipContent>
                      </Tooltip>

                      <CardDescription className="text-xs truncate">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {source.url}
                        </a>
                      </CardDescription>
                      <CardDescription className="text-xs mt-1">
                        {(articleCountMap.get(source.name) ?? 0).toLocaleString()} articles
                      </CardDescription>

                      {/* AI feature badges — always show all 4, dim disabled ones */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {([
                          { key: 'enable_ai_summary', label: 'Summary' },
                          { key: 'enable_ai_tags', label: 'Tags' },
                          { key: 'enable_ai_image', label: 'Image' },
                          { key: 'enable_ai_translations', label: 'Translations' },
                        ] as const).map(({ key, label }) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className={`text-xs ${source[key] ? '' : 'opacity-30'}`}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 md:mt-0 md:ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleTriggerScraperForSource(source.id)}
                            disabled={sourceScrapingLoading[source.id]}
                          >
                            {sourceScrapingLoading[source.id] ? 'Scraping…' : 'Scrape Now'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteArticlesForSource(source.id)}
                            disabled={sourceArticleDeletionLoading[source.id]}
                            className="text-destructive"
                          >
                            {sourceArticleDeletionLoading[source.id] ? 'Deleting…' : 'Delete Articles'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditModal(source)}>Edit Source</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteSource(source.id)} className="text-destructive">
                            Delete Source
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border">
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <a href={`/settings/source/${source.id}`}>View Articles</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </ul>

            {filteredSources.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No sources match your search.</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default SourceManagement;
