import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Bot, Image } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import TTSSettings from './TTSSettings';
import ImageModelSettings from './ImageModelSettings';

interface ModelOption {
  id: string;
  label: string;
}

interface AiModelsData {
  current: {
    SUMMARY: string;
    TRANSLATION: string;
    TOPICS: string;
    PROMPT_OPTIMIZATION: string;
    IMAGE: string;
  };
  defaults: {
    SUMMARY: string;
    TRANSLATION: string;
    TOPICS: string;
    PROMPT_OPTIMIZATION: string;
    IMAGE: string;
  };
  options: {
    groq: ModelOption[];
    image: ModelOption[];
  };
}

const AIModels: React.FC = () => {
  const [data, setData] = useState<AiModelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [summary, setSummary] = useState('');
  const [translation, setTranslation] = useState('');
  const [topics, setTopics] = useState('');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/settings/ai-models');
        if (!res.ok) throw new Error('Failed to load');
        const d: AiModelsData = await res.json();
        setData(d);
        setSummary(d.current.SUMMARY);
        setTranslation(d.current.TRANSLATION);
        setTopics(d.current.TOPICS);
        setPrompt(d.current.PROMPT_OPTIMIZATION);
        setImage(d.current.IMAGE);
      } catch {
        toast.error('Failed to load AI model settings');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/settings/ai-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, translation, topics, prompt, image }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('AI model settings saved');
    } catch {
      toast.error('Failed to save AI model settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;
  if (!data) return null;

  const groqOptions = data.options.groq;
  const imageOptions = data.options.image;

  return (
    <div className="space-y-6">
      {/* Text Generation Models */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Bot className="h-5 w-5" />
            Text Generation Models (Groq)
          </CardTitle>
          <CardDescription>
            Models used for summarisation, translation, topic tagging, and image prompt generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Summary Model</Label>
              <Select value={summary} onValueChange={setSummary}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groqOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default: {data.defaults.SUMMARY}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Translation Model</Label>
              <Select value={translation} onValueChange={setTranslation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groqOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default: {data.defaults.TRANSLATION}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Topics / Tagging Model</Label>
              <Select value={topics} onValueChange={setTopics}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groqOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default: {data.defaults.TOPICS}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Image Prompt Optimisation Model</Label>
              <Select value={prompt} onValueChange={setPrompt}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groqOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default: {data.defaults.PROMPT_OPTIMIZATION}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Generation Model */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Image className="h-5 w-5" />
            Image Generation Model (fal.ai)
          </CardTitle>
          <CardDescription>
            FLUX model used for AI-generated article images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-1.5">
            <Label>Image Model</Label>
            <Select value={image} onValueChange={setImage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {imageOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Default: {data.defaults.IMAGE}</p>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Model Settings'}
          </Button>
        </CardFooter>
      </Card>

      {/* Per-model Image Settings */}
      <ImageModelSettings />

      {/* TTS Settings */}
      <TTSSettings />
    </div>
  );
};

export default AIModels;
