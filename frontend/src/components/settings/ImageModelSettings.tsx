import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

interface FieldSchema {
  key: string;
  type: 'select' | 'number' | 'boolean' | 'text';
  label: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface ModelSchema {
  label: string;
  fields: FieldSchema[];
}

interface ImageSettingsData {
  current: Record<string, Record<string, unknown>>;
  defaults: Record<string, Record<string, unknown>>;
  schemas: Record<string, ModelSchema>;
}

const ImageModelSettings: React.FC = () => {
  const [data, setData] = useState<ImageSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  // Local edits: { [modelId]: { [fieldKey]: value } }
  const [edits, setEdits] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/settings/image-settings');
        if (!res.ok) throw new Error();
        const d: ImageSettingsData = await res.json();
        setData(d);
        // Initialise edits from current settings
        setEdits(JSON.parse(JSON.stringify(d.current)));
      } catch {
        toast.error('Failed to load image model settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setField = (modelId: string, key: string, value: unknown) => {
    setEdits(prev => ({
      ...prev,
      [modelId]: { ...(prev[modelId] || {}), [key]: value },
    }));
  };

  const handleSave = async (modelId: string) => {
    setSaving(modelId);
    try {
      const res = await apiFetch('/api/settings/image-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, settings: edits[modelId] }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Settings saved for ${data?.schemas[modelId]?.label ?? modelId}`);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (modelId: string) => {
    if (!data) return;
    setEdits(prev => ({ ...prev, [modelId]: { ...data.defaults[modelId] } }));
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;
  if (!data) return null;

  const modelIds = Object.keys(data.schemas);

  return (
    <Card className="pt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 pb-1">
          <SlidersHorizontal className="h-5 w-5" />
          Image Model Settings
        </CardTitle>
        <CardDescription>
          Configure per-model parameters for each image generation provider.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {modelIds.map(modelId => {
            const schema = data.schemas[modelId];
            const modelEdits = edits[modelId] || {};
            const isSaving = saving === modelId;

            return (
              <AccordionItem key={modelId} value={modelId}>
                <AccordionTrigger className="text-sm font-medium">
                  {schema.label}
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{modelId}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 pb-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {schema.fields.map(field => (
                        <div key={field.key} className="space-y-1.5">
                          <Label className="text-xs">{field.label}</Label>

                          {field.type === 'select' && field.options && (
                            <Select
                              value={String(modelEdits[field.key] ?? '')}
                              onValueChange={v => setField(modelId, field.key, v)}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {field.options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}

                          {field.type === 'number' && (
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={modelEdits[field.key] as number ?? ''}
                              onChange={e => setField(modelId, field.key, parseFloat(e.target.value))}
                            />
                          )}

                          {field.type === 'boolean' && (
                            <div className="flex items-center h-8">
                              <Switch
                                checked={Boolean(modelEdits[field.key])}
                                onCheckedChange={v => setField(modelId, field.key, v)}
                              />
                            </div>
                          )}

                          {field.type === 'text' && (
                            <Input
                              className="h-8 text-xs"
                              value={String(modelEdits[field.key] ?? '')}
                              onChange={e => setField(modelId, field.key, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleSave(modelId)} disabled={isSaving}>
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReset(modelId)} disabled={isSaving}>
                        Reset to Default
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

export default ImageModelSettings;
