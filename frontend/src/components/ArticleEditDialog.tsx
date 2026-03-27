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
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[92vh] flex flex-col p-0 gap-0">
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

                <TabsContent value="en" className="flex flex-col gap-4 mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Content (English)</Label>
                      <Suspense fallback={<div className="h-48 border rounded animate-pulse bg-muted" />}>
                        <HtmlEditor
                          value={articleData.raw_content || ''}
                          onChange={v => set('raw_content', v)}
                          minHeight={300}
                        />
                      </Suspense>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
                      <div
                        className="border rounded-md px-4 py-3 overflow-y-auto prose prose-sm max-w-none"
                        style={{ minHeight: 300 }}
                        dangerouslySetInnerHTML={{ __html: articleData.raw_content || '' }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="es" className="flex flex-col gap-4 mt-4">
                  <Field label="Title (Spanish)">
                    <Input name="title_es" value={articleData.title_es || ''} onChange={handleInputChange} />
                  </Field>
                  <Field label="Summary (Spanish)">
                    <Textarea name="summary_es" value={articleData.summary_es || ''} onChange={handleInputChange} className="min-h-[80px]" />
                  </Field>
                  <Field label="Topics (Spanish, comma-separated)">
                    <Input name="topics_es"
                      value={articleData.topics_es?.join(', ') || ''}
                      onChange={e => set('topics_es', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} />
                  </Field>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Content (Spanish)</Label>
                      <Suspense fallback={<div className="h-48 border rounded animate-pulse bg-muted" />}>
                        <HtmlEditor
                          value={articleData.raw_content_es || ''}
                          onChange={v => set('raw_content_es', v)}
                          minHeight={300}
                        />
                      </Suspense>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
                      <div
                        className="border rounded-md px-4 py-3 overflow-y-auto prose prose-sm max-w-none"
                        style={{ minHeight: 300 }}
                        dangerouslySetInnerHTML={{ __html: articleData.raw_content_es || '' }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ht" className="flex flex-col gap-4 mt-4">
                  <Field label="Title (Haitian Creole)">
                    <Input name="title_ht" value={articleData.title_ht || ''} onChange={handleInputChange} />
                  </Field>
                  <Field label="Summary (Haitian Creole)">
                    <Textarea name="summary_ht" value={articleData.summary_ht || ''} onChange={handleInputChange} className="min-h-[80px]" />
                  </Field>
                  <Field label="Topics (Haitian Creole, comma-separated)">
                    <Input name="topics_ht"
                      value={articleData.topics_ht?.join(', ') || ''}
                      onChange={e => set('topics_ht', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} />
                  </Field>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Content (Haitian Creole)</Label>
                      <Suspense fallback={<div className="h-48 border rounded animate-pulse bg-muted" />}>
                        <HtmlEditor
                          value={articleData.raw_content_ht || ''}
                          onChange={v => set('raw_content_ht', v)}
                          minHeight={300}
                        />
                      </Suspense>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
                      <div
                        className="border rounded-md px-4 py-3 overflow-y-auto prose prose-sm max-w-none"
                        style={{ minHeight: 300 }}
                        dangerouslySetInnerHTML={{ __html: articleData.raw_content_ht || '' }}
                      />
                    </div>
                  </div>
                </TabsContent>
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
