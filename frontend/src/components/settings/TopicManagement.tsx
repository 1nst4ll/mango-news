import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Skeleton } from "../ui/skeleton";
import { Plus, Pencil, Trash2, Merge, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

interface Topic {
  id: number;
  name: string;
  name_es: string | null;
  name_ht: string | null;
  article_count: number;
}

const TopicManagement: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState({ name: '', name_es: '', name_ht: '' });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Merge dialog
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<Topic | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [merging, setMerging] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/topics');
      if (res.ok) setTopics(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTopics(); }, []);

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const q = searchQuery.toLowerCase();
    return topics.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.name_es?.toLowerCase().includes(q) ||
      t.name_ht?.toLowerCase().includes(q)
    );
  }, [topics, searchQuery]);

  const openAdd = () => {
    setEditingTopic(null);
    setForm({ name: '', name_es: '', name_ht: '' });
    setDialogOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setForm({ name: topic.name, name_es: topic.name_es || '', name_ht: topic.name_ht || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Topic name is required'); return; }
    setSaving(true);
    try {
      const body = { name: form.name.trim(), name_es: form.name_es.trim() || null, name_ht: form.name_ht.trim() || null };
      const res = editingTopic
        ? await apiFetch(`/api/admin/topics/${editingTopic.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await apiFetch('/api/admin/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast.success(editingTopic ? 'Topic updated' : 'Topic created');
      setDialogOpen(false);
      fetchTopics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/topics/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`Topic "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchTopics();
    } catch {
      toast.error('Failed to delete topic');
    } finally {
      setDeleting(false);
    }
  };

  const openMerge = (topic: Topic) => {
    setMergeSource(topic);
    setMergeTargetId('');
    setMergeOpen(true);
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTargetId) return;
    setMerging(true);
    try {
      const res = await apiFetch('/api/admin/topics/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: mergeSource.id, targetId: parseInt(mergeTargetId) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast.success(`"${mergeSource.name}" merged successfully`);
      setMergeOpen(false);
      fetchTopics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to merge');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Card className="pt-4">
      <CardHeader>
        <div className="flex items-center justify-between pb-2">
          <div>
            <CardTitle>Topics</CardTitle>
            <CardDescription className="mt-1">{topics.length} topics · Manage names and translations.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Topic</Button>
            <Button onClick={fetchTopics} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filteredTopics.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No topics match your search.' : 'No topics found.'}
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Name (EN)</th>
                  <th className="text-left p-2 font-medium hidden sm:table-cell">Spanish</th>
                  <th className="text-left p-2 font-medium hidden sm:table-cell">Haitian Creole</th>
                  <th className="text-right p-2 font-medium">Articles</th>
                  <th className="text-right p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map(topic => (
                  <tr key={topic.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2 font-medium">{topic.name}</td>
                    <td className="p-2 text-muted-foreground hidden sm:table-cell">{topic.name_es || <span className="text-warning">—</span>}</td>
                    <td className="p-2 text-muted-foreground hidden sm:table-cell">{topic.name_ht || <span className="text-warning">—</span>}</td>
                    <td className="p-2 text-right">
                      <Badge variant="secondary" className="text-xs">{topic.article_count}</Badge>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(topic)} title="Edit">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMerge(topic)} title="Merge into another topic">
                          <Merge className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(topic)} title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
            <DialogDescription>{editingTopic ? `Editing "${editingTopic.name}"` : 'Create a new topic with translations.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic-name">Name (English) *</Label>
              <Input id="topic-name" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Politics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-name-es">Name (Spanish)</Label>
              <Input id="topic-name-es" value={form.name_es} onChange={e => setForm(prev => ({ ...prev, name_es: e.target.value }))} placeholder="e.g. Política" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-name-ht">Name (Haitian Creole)</Label>
              <Input id="topic-name-ht" value={form.name_ht} onChange={e => setForm(prev => ({ ...prev, name_ht: e.target.value }))} placeholder="e.g. Politik" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editingTopic ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the topic and unlink it from {deleteTarget?.article_count ?? 0} article{deleteTarget?.article_count !== 1 ? 's' : ''}. Articles will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Topic</DialogTitle>
            <DialogDescription>
              Move all {mergeSource?.article_count ?? 0} articles from "{mergeSource?.name}" into another topic, then delete "{mergeSource?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Merge into:</Label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target topic..." />
              </SelectTrigger>
              <SelectContent>
                {topics.filter(t => t.id !== mergeSource?.id).map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.article_count} articles)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>Cancel</Button>
            <Button onClick={handleMerge} disabled={merging || !mergeTargetId}>
              {merging ? 'Merging…' : 'Merge & Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TopicManagement;
