import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

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

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
    {children}
  </div>
);

const ArticleEditDialog: React.FC<ArticleEditDialogProps> = ({ isOpen, onClose, articleId, onSaveSuccess }) => {
  const [articleData, setArticleData] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('en');
  const [rawMode, setRawMode] = useState<Record<string, boolean>>({ en: false, es: false, ht: false });

  useEffect(() => {
    if (typeof window !== 'undefined') setJwtToken(localStorage.getItem('jwtToken'));
  }, []);

  useEffect(() => {
    if (isOpen && articleId) {
      const fetchArticle = async () => {
        setLoading(true);
        setError(null);
        try {
          const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
          const response = await fetch(`${apiUrl}/api/articles/${articleId}`, { headers });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data: Article = await response.json();
          setArticleData(data);
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
    }
  }, [isOpen, articleId, jwtToken]);

  const set = (field: keyof Article, value: any) =>
    setArticleData(prev => prev ? { ...prev, [field]: value } : null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(e.target.name as keyof Article, e.target.value);

  const handleSave = async () => {
    if (!articleData || !articleId) return;
    setSaving(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
      const response = await fetch(`${apiUrl}/api/articles/${articleId}`, {
        method: 'PUT', headers, body: JSON.stringify(articleData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update article');
      toast.success('Article Updated', { description: `"${articleData.title}" saved.` });
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] w-[80vw] max-h-[96vh] h-[96vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{articleData ? `Edit: ${articleData.title}` : 'Edit Article'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : articleData ? (
            <div className="flex flex-col gap-6">

              {/* Meta fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Title">
                  <Input name="title" value={articleData.title || ''} onChange={handleInputChange} />
                </Field>
                <Field label="Author">
                  <Input name="author" value={articleData.author || ''} onChange={handleInputChange} />
                </Field>
                <Field label="Publication Date">
                  <Input name="publication_date" type="datetime-local"
                    value={articleData.publication_date ? new Date(articleData.publication_date).toISOString().slice(0, 16) : ''}
                    onChange={handleInputChange} />
                </Field>
                <Field label="Source URL">
                  <Input name="source_url" value={articleData.source_url || ''} onChange={handleInputChange} />
                </Field>
                <Field label="Thumbnail URL">
                  <Input name="thumbnail_url" value={articleData.thumbnail_url || ''} onChange={handleInputChange} />
                </Field>
                <Field label="Topics (comma-separated)">
                  <Input name="topics"
                    value={articleData.topics?.join(', ') || ''}
                    onChange={e => set('topics', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} />
                </Field>
              </div>

              <Field label="Summary">
                <Textarea name="summary" value={articleData.summary || ''} onChange={handleInputChange} className="min-h-[80px]" />
              </Field>

              {/* Content tabs per language */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="es">Spanish</TabsTrigger>
                  <TabsTrigger value="ht">Haitian Creole</TabsTrigger>
                </TabsList>

                {([
                  { lang: 'en', label: 'English',        contentKey: 'raw_content',    titleKey: null,       summaryKey: null,       topicsKey: null },
                  { lang: 'es', label: 'Spanish',        contentKey: 'raw_content_es', titleKey: 'title_es', summaryKey: 'summary_es', topicsKey: 'topics_es' },
                  { lang: 'ht', label: 'Haitian Creole', contentKey: 'raw_content_ht', titleKey: 'title_ht', summaryKey: 'summary_ht', topicsKey: 'topics_ht' },
                ] as const).map(({ lang, label, contentKey, titleKey, summaryKey, topicsKey }) => (
                  <TabsContent key={lang} value={lang} className="flex flex-col gap-4 mt-4">
                    {titleKey && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={`Title (${label})`}>
                          <Input name={titleKey} value={(articleData as any)[titleKey] || ''} onChange={handleInputChange} />
                        </Field>
                        <Field label={`Topics (${label}, comma-separated)`}>
                          <Input value={(articleData as any)[topicsKey!]?.join(', ') || ''}
                            onChange={e => set(topicsKey! as keyof Article, e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))} />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label={`Summary (${label})`}>
                            <Textarea name={summaryKey!} value={(articleData as any)[summaryKey!] || ''} onChange={handleInputChange} className="min-h-[60px]" />
                          </Field>
                        </div>
                      </div>
                    )}

                    {/* Editor + Preview */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Content ({label})</Label>
                        <button
                          type="button"
                          onClick={() => setRawMode(prev => ({ ...prev, [lang]: !prev[lang] }))}
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors font-mono"
                        >
                          {rawMode[lang] ? 'WYSIWYG' : '</> HTML'}
                        </button>
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
                            <Suspense fallback={<div className="h-48 border rounded animate-pulse bg-muted" />}>
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
                          <div
                            className="border rounded-md px-4 py-3 overflow-y-auto prose prose-sm max-w-none"
                            style={{ minHeight: 400 }}
                            dangerouslySetInnerHTML={{ __html: (articleData as any)[contentKey] || '' }}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No article data available.</div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleEditDialog;
