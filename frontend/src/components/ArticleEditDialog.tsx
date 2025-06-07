import React, { useState, useEffect } from 'react';
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
import { Switch } from './ui/switch';
import { toast } from 'sonner';

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

const ArticleEditDialog: React.FC<ArticleEditDialogProps> = ({ isOpen, onClose, articleId, onSaveSuccess }) => {
  const [articleData, setArticleData] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJwtToken(localStorage.getItem('jwtToken'));
    }
  }, []);

  useEffect(() => {
    if (isOpen && articleId) {
      const fetchArticle = async () => {
        setLoading(true);
        setError(null);
        try {
          const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
          }

          const response = await fetch(`${apiUrl}/api/articles/${articleId}`, { headers });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Article = await response.json();
          setArticleData(data);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
          toast.error("Error Loading Article", { description: errorMessage });
        } finally {
          setLoading(false);
        }
      };
      fetchArticle();
    } else {
      setArticleData(null); // Clear data when dialog is closed
    }
  }, [isOpen, articleId, jwtToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArticleData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSwitchChange = (checked: boolean, name: keyof Article) => {
    setArticleData(prev => prev ? { ...prev, [name]: checked } : null);
  };

  const handleSave = async () => {
    if (!articleData || !articleId) return;

    setSaving(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/articles/${articleId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(articleData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update article');
      }
      toast.success("Article Updated", { description: `Article "${articleData.title}" updated successfully.` });
      onSaveSuccess();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast.error("Error Updating Article", { description: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] md:max-w-[1000px] lg:max-w-[1200px] overflow-y-scroll max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{articleData ? `Edit Article: ${articleData.title}` : 'Edit Article'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8">Loading article data...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : articleData ? (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
            {/* Column 1 */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" name="title" value={articleData.title || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="author" className="text-right">Author</Label>
                <Input id="author" name="author" value={articleData.author || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="publication_date" className="text-right">Publication Date</Label>
                <Input id="publication_date" name="publication_date" type="datetime-local" value={articleData.publication_date ? new Date(articleData.publication_date).toISOString().slice(0, 16) : ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="source_url" className="text-right">Source URL</Label>
                <Input id="source_url" name="source_url" value={articleData.source_url || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="thumbnail_url" className="text-right">Thumbnail URL</Label>
                <Input id="thumbnail_url" name="thumbnail_url" value={articleData.thumbnail_url || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="topics" className="text-right">Topics (comma-separated)</Label>
                <Input id="topics" name="topics" value={articleData.topics?.join(', ') || ''} onChange={(e) => setArticleData(prev => prev ? { ...prev, topics: e.target.value.split(',').map(t => t.trim()) } : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="summary" className="text-right">Summary</Label>
                <Textarea id="summary" name="summary" value={articleData.summary || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="raw_content" className="text-right">Raw Content (HTML)</Label>
                <Textarea id="raw_content" name="raw_content" value={articleData.raw_content || ''} onChange={handleInputChange} className="col-span-3 min-h-[150px]" />
              </div>
            </div>

            {/* Column 2 - Translated Fields */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold mt-4 col-span-full">Translated Fields</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title_es" className="text-right">Title (Spanish)</Label>
                <Input id="title_es" name="title_es" value={articleData.title_es || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="summary_es" className="text-right">Summary (Spanish)</Label>
                <Textarea id="summary_es" name="summary_es" value={articleData.summary_es || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="raw_content_es" className="text-right">Raw Content (Spanish)</Label>
                <Textarea id="raw_content_es" name="raw_content_es" value={articleData.raw_content_es || ''} onChange={handleInputChange} className="col-span-3 min-h-[150px]" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="topics_es" className="text-right">Topics (Spanish, comma-separated)</Label>
                <Input id="topics_es" name="topics_es" value={articleData.topics_es?.join(', ') || ''} onChange={(e) => setArticleData(prev => prev ? { ...prev, topics_es: e.target.value.split(',').map(t => t.trim()) } : null)} className="col-span-3" />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title_ht" className="text-right">Title (Haitian Creole)</Label>
                <Input id="title_ht" name="title_ht" value={articleData.title_ht || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="summary_ht" className="text-right">Summary (Haitian Creole)</Label>
                <Textarea id="summary_ht" name="summary_ht" value={articleData.summary_ht || ''} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="raw_content_ht" className="text-right">Raw Content (Haitian Creole)</Label>
                <Textarea id="raw_content_ht" name="raw_content_ht" value={articleData.raw_content_ht || ''} onChange={handleInputChange} className="col-span-3 min-h-[150px]" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="topics_ht" className="text-right">Topics (Haitian Creole, comma-separated)</Label>
                <Input id="topics_ht" name="topics_ht" value={articleData.topics_ht?.join(', ') || ''} onChange={(e) => setArticleData(prev => prev ? { ...prev, topics_ht: e.target.value.split(',').map(t => t.trim()) } : null)} className="col-span-3" />
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">No article data available.</div>
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose} variant="outline">Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleEditDialog;
