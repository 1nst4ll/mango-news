import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import DOMPurify from 'dompurify';
import { apiFetch } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Loader2, ExternalLink, FileText } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent } from './ui/card';

const HtmlEditor = lazy(() => import('./HtmlEditor'));

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
  thumbnail_url?: string;
  topics?: string[];
  category?: string;
  title_es?: string;
  summary_es?: string;
  raw_content_es?: string;
  topics_es?: string[];
  title_ht?: string;
  summary_ht?: string;
  raw_content_ht?: string;
  topics_ht?: string[];
}

interface ArticleEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: number | null;
  onSaveSuccess: () => void;
}

const Field = ({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={htmlFor} className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
    {children}
  </div>
);

// Pill-style topics display with inline editing
const TopicsField = ({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) => {
  const [raw, setRaw] = useState(value.join(', '));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(value.join(', '));
  }, [value, focused]);

  return (
    <Field label={label}>
      <div className="flex flex-col gap-1">
        <Input
          value={raw}
          onChange={e => { setRaw(e.target.value); onChange(e.target.value.split(',').map(t => t.trim()).filter(Boolean)); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setRaw(value.join(', ')); }}
          placeholder="tag1, tag2, tag3"
          className="h-8 text-sm"
        />
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {value.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          </div>
        )}
      </div>
    </Field>
  );
};

const LANG_CONFIGS = [
  { lang: 'en', label: 'English',        contentKey: 'raw_content',    titleKey: null,       summaryKey: null,        topicsKey: null },
  { lang: 'es', label: 'Spanish',        contentKey: 'raw_content_es', titleKey: 'title_es', summaryKey: 'summary_es', topicsKey: 'topics_es' },
  { lang: 'ht', label: 'Haitian Creole', contentKey: 'raw_content_ht', titleKey: 'title_ht', summaryKey: 'summary_ht', topicsKey: 'topics_ht' },
] as const;

const ArticleEditDialog: React.FC<ArticleEditDialogProps> = ({ isOpen, onClose, articleId, onSaveSuccess }) => {
  const [articleData, setArticleData] = useState<Article | null>(null);
  const [originalData, setOriginalData] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('en');
  const [rawMode, setRawMode] = useState<Record<string, boolean>>({ en: false, es: false, ht: false });
  const [confirmClose, setConfirmClose] = useState(false);

  const isDirty = articleData !== null && JSON.stringify(articleData) !== JSON.stringify(originalData);

  useEffect(() => {
    if (isOpen && articleId) {
      setRawMode({ en: false, es: false, ht: false });
      setActiveTab('en');
      const fetchArticle = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await apiFetch(`/api/articles/${articleId}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data: Article = await response.json();
          setArticleData(data);
          setOriginalData(data);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(msg);
          toast.error('Error Loading Article', { description: msg });
        } finally {
          setLoading(false);
        }
      };
      fetchArticle();
    } else {
      setArticleData(null);
      setOriginalData(null);
    }
  }, [isOpen, articleId]);

  const set = (field: keyof Article, value: any) =>
    setArticleData(prev => prev ? { ...prev, [field]: value } : null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(e.target.name as keyof Article, e.target.value);

  const handleSave = async () => {
    if (!articleData || !articleId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update article');
      toast.success('Article Updated', { description: `"${articleData.title}" saved.` });
      setOriginalData(articleData);
      onSaveSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(msg);
      toast.error('Error Updating Article', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseRequest = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  // Check if a language tab has any translated content
  const hasTranslation = (lang: 'es' | 'ht') => {
    if (!articleData) return false;
    const titleKey = `title_${lang}` as keyof Article;
    const contentKey = `raw_content_${lang}` as keyof Article;
    return !!(articleData[titleKey] || articleData[contentKey]);
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCloseRequest}>
        <DialogContent className="max-w-[85vw] w-[85vw] max-h-[96vh] h-[96vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5 min-w-0">
                <DialogTitle className="truncate">
                  {articleData ? articleData.title : 'Edit Article'}
                </DialogTitle>
                {articleData && (
                  <DialogDescription className="flex items-center gap-2">
                    <span>ID: {articleData.id}</span>
                    {articleData.source_url && (
                      <>
                        <span>·</span>
                        <a
                          href={articleData.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[360px]"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{articleData.source_url}</span>
                        </a>
                      </>
                    )}
                    {isDirty && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500 font-medium">Unsaved changes</span>
                      </>
                    )}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {loading ? (
              <div className="flex flex-col gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive" className="my-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : articleData ? (
              <div className="flex flex-col gap-5">

                {/* Meta fields — title spans 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <Field label="Title" htmlFor="field-title">
                      <Input id="field-title" name="title" value={articleData.title || ''} onChange={handleInputChange} />
                    </Field>
                  </div>
                  <Field label="Author" htmlFor="field-author">
                    <Input id="field-author" name="author" value={articleData.author || ''} onChange={handleInputChange} />
                  </Field>
                  <Field label="Publication Date" htmlFor="field-date">
                    <Input id="field-date" name="publication_date" type="datetime-local"
                      value={articleData.publication_date ? new Date(articleData.publication_date).toISOString().slice(0, 16) : ''}
                      onChange={handleInputChange} />
                  </Field>
                  <Field label="Source URL" htmlFor="field-source-url">
                    <div className="flex gap-1.5">
                      <Input id="field-source-url" name="source_url" value={articleData.source_url || ''} onChange={handleInputChange} className="flex-1 min-w-0" />
                      {articleData.source_url && (
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
                          <a href={articleData.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Open source URL</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </Field>
                  <Field label="Thumbnail URL" htmlFor="field-thumbnail">
                    <div className="flex gap-1.5">
                      <Input id="field-thumbnail" name="thumbnail_url" value={articleData.thumbnail_url || ''} onChange={handleInputChange} className="flex-1 min-w-0" />
                      {articleData.thumbnail_url && (
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
                          <a href={articleData.thumbnail_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Open thumbnail URL</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </Field>
                </div>

                <TopicsField
                  label="Topics (EN)"
                  value={articleData.topics ?? []}
                  onChange={v => set('topics', v)}
                />

                <Field label="Summary" htmlFor="field-summary">
                  <Textarea id="field-summary" name="summary" value={articleData.summary || ''} onChange={handleInputChange} className="min-h-[80px] resize-y" />
                </Field>

                <Separator />

                {/* Language content tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="es" className="gap-1.5">
                      Spanish
                      {hasTranslation('es') && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
                    </TabsTrigger>
                    <TabsTrigger value="ht" className="gap-1.5">
                      Haitian Creole
                      {hasTranslation('ht') && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
                    </TabsTrigger>
                  </TabsList>

                  {LANG_CONFIGS.map(({ lang, label, contentKey, titleKey, summaryKey, topicsKey }) => (
                    <TabsContent key={lang} value={lang} className="flex flex-col gap-4 mt-4">
                      {titleKey && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label={`Title (${label})`} htmlFor={`field-title-${lang}`}>
                            <Input id={`field-title-${lang}`} name={titleKey} value={(articleData as any)[titleKey] || ''} onChange={handleInputChange} />
                          </Field>
                          <TopicsField
                            label={`Topics (${label})`}
                            value={(articleData as any)[topicsKey!] ?? []}
                            onChange={v => set(topicsKey! as keyof Article, v)}
                          />
                          <div className="sm:col-span-2">
                            <Field label={`Summary (${label})`} htmlFor={`field-summary-${lang}`}>
                              <Textarea id={`field-summary-${lang}`} name={summaryKey!} value={(articleData as any)[summaryKey!] || ''} onChange={handleInputChange} className="min-h-[60px] resize-y" />
                            </Field>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Content ({label})
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRawMode(prev => ({ ...prev, [lang]: !prev[lang] }))}
                            className="h-7 gap-1.5 text-xs font-mono"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {rawMode[lang] ? 'WYSIWYG' : 'HTML'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            {rawMode[lang] ? (
                              <Textarea
                                value={(articleData as any)[contentKey] || ''}
                                onChange={e => set(contentKey as keyof Article, e.target.value)}
                                className="font-mono text-xs min-h-[400px] resize-y"
                                spellCheck={false}
                              />
                            ) : (
                              <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-md" />}>
                                <HtmlEditor
                                  value={(articleData as any)[contentKey] || ''}
                                  onChange={v => set(contentKey as keyof Article, v)}
                                  minHeight={400}
                                />
                              </Suspense>
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
                            <Card className="overflow-hidden flex-1">
                              {(articleData as any)[contentKey] ? (
                                <CardContent
                                  className="px-4 py-3 overflow-y-auto prose prose-sm max-w-none min-h-[400px]"
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((articleData as any)[contentKey] || '') }}
                                />
                              ) : (
                                <CardContent className="px-4 py-3 min-h-[400px] flex items-center justify-center">
                                  <p className="text-sm text-muted-foreground">No content yet</p>
                                </CardContent>
                              )}
                            </Card>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

              </div>
            ) : (
              <Alert className="my-4">
                <AlertDescription>No article data available.</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button type="button" variant="outline" onClick={handleCloseRequest} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || loading || !articleData}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this article. They will be lost if you close now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmClose(false); onClose(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ArticleEditDialog;
