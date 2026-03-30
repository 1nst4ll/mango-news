import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { RefreshCw, AlertTriangle, FileText, ImagePlus, Volume2, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import type { SundayEditionAdmin } from './types';

export interface SundayEditionsAdminProps {
  sundayEditions: SundayEditionAdmin[];
  sundayEditionsLoading: boolean;
  sundayEditionLoading: boolean;
  sundayEditionEditId: number | null;
  sundayEditionEditForm: { title: string; summary: string };
  setSundayEditionEditForm: React.Dispatch<React.SetStateAction<{ title: string; summary: string }>>;
  sundayEditionSaving: boolean;
  sundayEditionPurgeLoading: boolean;
  sundayEditionImageLoading: { [key: number]: boolean };
  sundayEditionAudioLoading: { [key: number]: boolean };
  handleGenerateSundayEdition: () => void;
  fetchSundayEditions: () => void;
  handlePurgeSundayEditions: () => void;
  handleStartEditSundayEdition: (edition: SundayEditionAdmin) => void;
  handleCancelEditSundayEdition: () => void;
  handleSaveSundayEdition: (id: number) => void;
  handleRegenerateImage: (id: number) => void;
  handleRegenerateAudio: (id: number) => void;
  handleDeleteSundayEdition: (id: number) => void;
  handleToggleStatus: (id: number, newStatus: 'draft' | 'published') => void;
  setLightboxImage: (v: { src: string; alt: string } | null) => void;
}

const SundayEditionsAdminTab: React.FC<SundayEditionsAdminProps> = ({
  sundayEditions,
  sundayEditionsLoading,
  sundayEditionLoading,
  sundayEditionEditId,
  sundayEditionEditForm,
  setSundayEditionEditForm,
  sundayEditionSaving,
  sundayEditionPurgeLoading,
  sundayEditionImageLoading,
  sundayEditionAudioLoading,
  handleGenerateSundayEdition,
  fetchSundayEditions,
  handlePurgeSundayEditions,
  handleStartEditSundayEdition,
  handleCancelEditSundayEdition,
  handleSaveSundayEdition,
  handleRegenerateImage,
  handleRegenerateAudio,
  handleDeleteSundayEdition,
  handleToggleStatus,
  setLightboxImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEditions = useMemo(() => {
    if (!searchQuery.trim()) return sundayEditions;
    const q = searchQuery.toLowerCase();
    return sundayEditions.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.summary?.toLowerCase().includes(q) ||
      new Date(e.publication_date).toLocaleDateString().includes(q)
    );
  }, [sundayEditions, searchQuery]);

  return (
    <div className="space-y-6">

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Editions</p>
            <p className="text-2xl font-bold">{sundayEditions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">With Image</p>
            <p className="text-2xl font-bold text-success">{sundayEditions.filter(e => e.image_url).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">With Audio</p>
            <p className="text-2xl font-bold text-success">{sundayEditions.filter(e => e.narration_url).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Pending Audio</p>
            <p className="text-2xl font-bold text-warning">{sundayEditions.filter(e => !e.narration_url).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main management card */}
      <Card className="pt-4">
        <CardHeader>
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sunday Editions</CardTitle>
                <CardDescription className="mt-1">View, edit, and manage all generated Sunday Edition digests.</CardDescription>
              </div>
              <div className="flex gap-2">
              <Button onClick={() => { handleGenerateSundayEdition(); }} disabled={sundayEditionLoading} size="sm">
                {sundayEditionLoading ? 'Generating…' : 'Generate New'}
              </Button>
              <Button onClick={fetchSundayEditions} variant="outline" size="sm" disabled={sundayEditionsLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${sundayEditionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {sundayEditions.length > 0 && (
                <Button onClick={handlePurgeSundayEditions} disabled={sundayEditionPurgeLoading} variant="destructive" size="sm">
                  {sundayEditionPurgeLoading ? 'Purging…' : 'Purge All'}
                </Button>
              )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search editions by title or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sundayEditionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : sundayEditions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No Sunday Editions found. Generate one to get started.
            </div>
          ) : filteredEditions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No editions match your search.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEditions.map(edition => (
                <div key={edition.id} className="rounded-lg border p-4">
                  {sundayEditionEditId === edition.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`edit-title-${edition.id}`} className="text-xs mb-1 block">Title</Label>
                        <Input
                          id={`edit-title-${edition.id}`}
                          value={sundayEditionEditForm.title}
                          onChange={e => setSundayEditionEditForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-summary-${edition.id}`} className="text-xs mb-1 block">Summary (Markdown)</Label>
                        <textarea
                          id={`edit-summary-${edition.id}`}
                          value={sundayEditionEditForm.summary}
                          onChange={e => setSundayEditionEditForm(prev => ({ ...prev, summary: e.target.value }))}
                          rows={10}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{sundayEditionEditForm.summary.length} characters</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveSundayEdition(edition.id)} disabled={sundayEditionSaving}>
                          {sundayEditionSaving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEditSundayEdition}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      {/* Thumbnail preview — click to open lightbox */}
                      {edition.image_url && (
                        <div
                          className="flex-shrink-0 hidden sm:block cursor-pointer"
                          onClick={() => setLightboxImage({ src: edition.image_url!, alt: edition.title })}
                        >
                          <img
                            src={edition.image_url}
                            alt={edition.title}
                            className="w-28 h-20 object-cover rounded-md border hover:opacity-80 transition-opacity"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={`/en/sunday-edition/${edition.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-sm truncate hover:underline"
                          >
                            {edition.title}
                          </a>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">ID: {edition.id}</Badge>
                          <Badge
                            variant={edition.status === 'draft' ? 'outline' : 'default'}
                            className={`text-xs flex-shrink-0 cursor-pointer ${edition.status === 'draft' ? 'text-warning border-warning' : ''}`}
                            onClick={() => handleToggleStatus(edition.id, edition.status === 'draft' ? 'published' : 'draft')}
                          >
                            {edition.status === 'draft' ? 'Draft' : 'Published'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Published: {new Date(edition.publication_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          {edition.updated_at && (
                            <span className="ml-2">Updated: {new Date(edition.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {edition.summary?.substring(0, 250)}{(edition.summary?.length ?? 0) > 250 ? '…' : ''}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          {edition.image_url ? (
                            <span className="text-success font-medium">Image: Yes</span>
                          ) : (
                            <span className="text-warning font-medium">Image: Missing</span>
                          )}
                          {edition.narration_url ? (
                            <span className="text-success font-medium">Audio: Yes</span>
                          ) : (
                            <span className="text-warning font-medium">Audio: Pending</span>
                          )}
                          <span className="text-muted-foreground">{edition.summary?.length ?? 0} chars</span>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => handleStartEditSundayEdition(edition)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit title and summary</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              disabled={!!sundayEditionImageLoading[edition.id]}
                              onClick={() => handleRegenerateImage(edition.id)}
                            >
                              {sundayEditionImageLoading[edition.id]
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <ImagePlus className="h-3.5 w-3.5" />
                              }
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Regenerate AI image</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              disabled={!!sundayEditionAudioLoading[edition.id]}
                              onClick={() => handleRegenerateAudio(edition.id)}
                            >
                              {sundayEditionAudioLoading[edition.id]
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                : <Volume2 className="h-3.5 w-3.5" />
                              }
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Regenerate audio narration</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteSundayEdition(edition.id)}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete this edition</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SundayEditionsAdminTab;
