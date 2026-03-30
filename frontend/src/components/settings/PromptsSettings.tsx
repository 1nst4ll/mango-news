import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Badge } from "../ui/badge";
import { MessageSquare, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

interface PromptMeta {
  label: string;
  description: string;
}

interface PromptsData {
  prompts: Record<string, string>;
  meta: Record<string, PromptMeta>;
}

const PromptsSettings: React.FC = () => {
  const [data, setData] = useState<PromptsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/settings/prompts');
        if (!res.ok) throw new Error();
        const d: PromptsData = await res.json();
        setData(d);
        setEdits({ ...d.prompts });
        setOriginals({ ...d.prompts });
      } catch {
        toast.error('Failed to load prompts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await apiFetch(`/api/settings/prompts/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: edits[key] }),
      });
      if (!res.ok) throw new Error();
      setOriginals(prev => ({ ...prev, [key]: edits[key] }));
      toast.success(`Prompt saved: ${data?.meta[key]?.label ?? key}`);
    } catch {
      toast.error('Failed to save prompt');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (key: string) => {
    setEdits(prev => ({ ...prev, [key]: originals[key] }));
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;
  if (!data) return null;

  const keys = Object.keys(data.meta);

  return (
    <Card className="pt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 pb-1">
          <MessageSquare className="h-5 w-5" />
          AI Prompts
        </CardTitle>
        <CardDescription>
          Edit the system prompts used for each AI task. Template variables are shown in each description.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {keys.map(key => {
            const meta = data.meta[key];
            const current = edits[key] ?? '';
            const original = originals[key] ?? '';
            const isDirty = current !== original;
            const isSaving = saving === key;

            return (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    {meta.label}
                    {isDirty && <Badge variant="outline" className="text-xs">Unsaved</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 pb-4 space-y-3">
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs sr-only">Prompt</Label>
                      <textarea
                        className="w-full min-h-[240px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={current}
                        onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))}
                        spellCheck={false}
                      />
                      <p className="text-xs text-muted-foreground text-right">{current.length} chars</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(key)} disabled={isSaving || !isDirty}>
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReset(key)} disabled={isSaving || !isDirty}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Revert
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PromptsSettings;
