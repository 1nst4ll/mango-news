import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import {
  FileText, Languages, Tag, ImageIcon, Mic, ChevronDown, ChevronRight, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface ModelOption { id: string; label: string; }

interface AiModelsData {
  current: {
    SUMMARY: string; TRANSLATION: string; TOPICS: string;
    PROMPT_OPTIMIZATION: string; IMAGE: string;
  };
  defaults: {
    SUMMARY: string; TRANSLATION: string; TOPICS: string;
    PROMPT_OPTIMIZATION: string; IMAGE: string;
  };
  options: { groq: ModelOption[]; image: ModelOption[]; };
}

interface FieldSchema {
  key: string;
  type: 'select' | 'number' | 'boolean' | 'text';
  label: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface ImageSettingsData {
  current: Record<string, Record<string, unknown>>;
  defaults: Record<string, Record<string, unknown>>;
  schemas: Record<string, { label: string; fields: FieldSchema[] }>;
}

interface PromptsData {
  prompts: Record<string, string>;
  meta: Record<string, { label: string; description: string }>;
}

interface TtsData {
  current: {
    provider: string; us_voice: string; us_speed: number;
    us_pitch: number; us_bitrate: string; fal_gemini_voice: string;
    fal_minimax_voice: string; fal_minimax_speed: number;
  };
  defaults: Record<string, string | number>;
  options: {
    providers: ModelOption[]; us_voices: ModelOption[]; us_bitrates: string[];
    fal_gemini_voices: ModelOption[]; fal_minimax_voices: ModelOption[];
  };
}

// ── Shared sub-components ──────────────────────────────────────────────────

function ModelSelect({
  label, value, onChange, options, defaultValue,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: ModelOption[]; defaultValue: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(m => (
            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Default: {defaultValue}</p>
    </div>
  );
}

function PromptEditor({
  label, description, value, original, saving, onChange, onSave, onRevert,
}: {
  label: string; description: string; value: string; original: string; saving: boolean;
  onChange: (v: string) => void; onSave: () => void; onRevert: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDirty = value !== original;

  return (
    <div className="rounded-md border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          {expanded
            ? <ChevronDown className="h-3 w-3 shrink-0" />
            : <ChevronRight className="h-3 w-3 shrink-0" />}
          <span className="font-medium text-foreground">{label}</span>
          {isDirty && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
              Unsaved
            </Badge>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground/60">Edit prompt</span>
      </button>

      {expanded && (
        <div className="border-t px-3 py-3 bg-muted/20 space-y-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          <textarea
            className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={value}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{value.length} chars</span>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                onClick={onRevert} disabled={saving || !isDirty}
              >
                <RotateCcw className="h-3 w-3 mr-1" />Revert
              </Button>
              <Button
                size="sm"
                onClick={onSave} disabled={saving || !isDirty}
              >
                {saving ? 'Saving…' : 'Save prompt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const AIModels: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Model selections
  const [modelsData, setModelsData] = useState<AiModelsData | null>(null);
  const [summary, setSummary] = useState('');
  const [translation, setTranslation] = useState('');
  const [topics, setTopics] = useState('');
  const [promptModel, setPromptModel] = useState('');
  const [image, setImage] = useState('');
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Image settings
  const [imageData, setImageData] = useState<ImageSettingsData | null>(null);
  const [imageEdits, setImageEdits] = useState<Record<string, Record<string, unknown>>>({});
  const [savingImageSettings, setSavingImageSettings] = useState(false);

  // Prompts
  const [promptsData, setPromptsData] = useState<PromptsData | null>(null);
  const [promptEdits, setPromptEdits] = useState<Record<string, string>>({});
  const [promptOriginals, setPromptOriginals] = useState<Record<string, string>>({});
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);

  // TTS
  const [ttsData, setTtsData] = useState<TtsData | null>(null);
  const [provider, setProvider] = useState('unreal-speech');
  const [usVoice, setUsVoice] = useState('');
  const [usSpeed, setUsSpeed] = useState(0);
  const [usPitch, setUsPitch] = useState(1);
  const [usBitrate, setUsBitrate] = useState('192k');
  const [falGeminiVoice, setFalGeminiVoice] = useState('');
  const [falMinimaxVoice, setFalMinimaxVoice] = useState('');
  const [falMinimaxSpeed, setFalMinimaxSpeed] = useState(1);
  const [savingTts, setSavingTts] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mRes, iRes, pRes, tRes] = await Promise.all([
          apiFetch('/api/settings/ai-models'),
          apiFetch('/api/settings/image-settings'),
          apiFetch('/api/settings/prompts'),
          apiFetch('/api/settings/tts'),
        ]);
        if (!mRes.ok || !iRes.ok || !pRes.ok || !tRes.ok) throw new Error('Failed to load');

        const [m, i, p, t]: [AiModelsData, ImageSettingsData, PromptsData, TtsData] =
          await Promise.all([mRes.json(), iRes.json(), pRes.json(), tRes.json()]);

        setModelsData(m);
        setSummary(m.current.SUMMARY);
        setTranslation(m.current.TRANSLATION);
        setTopics(m.current.TOPICS);
        setPromptModel(m.current.PROMPT_OPTIMIZATION);
        setImage(m.current.IMAGE);

        setImageData(i);
        setImageEdits(JSON.parse(JSON.stringify(i.current)));

        setPromptsData(p);
        setPromptEdits({ ...p.prompts });
        setPromptOriginals({ ...p.prompts });

        setTtsData(t);
        setProvider(t.current.provider);
        setUsVoice(t.current.us_voice);
        setUsSpeed(t.current.us_speed);
        setUsPitch(t.current.us_pitch);
        setUsBitrate(t.current.us_bitrate);
        setFalGeminiVoice(t.current.fal_gemini_voice);
        setFalMinimaxVoice(t.current.fal_minimax_voice);
        setFalMinimaxSpeed(t.current.fal_minimax_speed);
      } catch {
        toast.error('Failed to load AI settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Saves all model selections — idempotent, safe to call from any section
  const saveModels = async (section: string) => {
    setSavingSection(section);
    try {
      const res = await apiFetch('/api/settings/ai-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary, translation, topics, prompt: promptModel, image,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Model settings saved');
    } catch {
      toast.error('Failed to save model settings');
    } finally {
      setSavingSection(null);
    }
  };

  const saveImageSettings = async () => {
    setSavingImageSettings(true);
    try {
      const res = await apiFetch('/api/settings/image-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: image, settings: imageEdits[image] }),
      });
      if (!res.ok) throw new Error();
      toast.success('Image settings saved');
    } catch {
      toast.error('Failed to save image settings');
    } finally {
      setSavingImageSettings(false);
    }
  };

  const resetImageSettings = () => {
    if (!imageData) return;
    setImageEdits(prev => ({ ...prev, [image]: { ...imageData.defaults[image] } }));
  };

  const setImageField = (key: string, value: unknown) => {
    setImageEdits(prev => ({
      ...prev,
      [image]: { ...(prev[image] ?? {}), [key]: value },
    }));
  };

  const savePrompt = async (key: string) => {
    setSavingPrompt(key);
    try {
      const res = await apiFetch(`/api/settings/prompts/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: promptEdits[key] }),
      });
      if (!res.ok) throw new Error();
      setPromptOriginals(prev => ({ ...prev, [key]: promptEdits[key] }));
      toast.success('Prompt saved');
    } catch {
      toast.error('Failed to save prompt');
    } finally {
      setSavingPrompt(null);
    }
  };

  const saveTts = async () => {
    setSavingTts(true);
    try {
      const res = await apiFetch('/api/settings/tts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          us_voice: usVoice, us_speed: usSpeed, us_pitch: usPitch, us_bitrate: usBitrate,
          fal_gemini_voice: falGeminiVoice,
          fal_minimax_voice: falMinimaxVoice, fal_minimax_speed: falMinimaxSpeed,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('TTS settings saved');
    } catch {
      toast.error('Failed to save TTS settings');
    } finally {
      setSavingTts(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  if (!modelsData || !imageData || !promptsData || !ttsData) return null;

  const groqOptions = modelsData.options.groq;
  const imageOptions = modelsData.options.image;

  // Helper: render a PromptEditor for a given key
  const promptEditor = (key: string) => {
    const meta = promptsData.meta[key];
    if (!meta) return null;
    return (
      <PromptEditor
        key={key}
        label={meta.label}
        description={meta.description}
        value={promptEdits[key] ?? ''}
        original={promptOriginals[key] ?? ''}
        saving={savingPrompt === key}
        onChange={v => setPromptEdits(prev => ({ ...prev, [key]: v }))}
        onSave={() => savePrompt(key)}
        onRevert={() => setPromptEdits(prev => ({ ...prev, [key]: promptOriginals[key] }))}
      />
    );
  };

  const currentImageSchema = imageData.schemas[image];
  const currentImageEdits = imageEdits[image] ?? {};

  return (
    <div className="space-y-4">

      {/* ── 1. Summarisation ──────────────────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <FileText className="h-5 w-5" />
            Summarisation
          </CardTitle>
          <CardDescription>
            Generates article summaries and the weekly Sunday Edition digest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModelSelect
            label="Groq Model"
            value={summary} onChange={setSummary}
            options={groqOptions}
            defaultValue={modelsData.defaults.SUMMARY}
          />
          <div className="space-y-2">
            {promptEditor('prompt_summary')}
            {promptEditor('prompt_weekly_summary')}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => saveModels('summary')}
            disabled={savingSection === 'summary'}
          >
            {savingSection === 'summary' ? 'Saving…' : 'Save'}
          </Button>
        </CardFooter>
      </Card>

      {/* ── 2. Translation ────────────────────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Languages className="h-5 w-5" />
            Translation
          </CardTitle>
          <CardDescription>
            Translates article content to Spanish and Haitian Creole.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModelSelect
            label="Groq Model"
            value={translation} onChange={setTranslation}
            options={groqOptions}
            defaultValue={modelsData.defaults.TRANSLATION}
          />
          <div className="space-y-2">
            {promptEditor('prompt_translation')}
            {promptEditor('prompt_translation_title')}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => saveModels('translation')}
            disabled={savingSection === 'translation'}
          >
            {savingSection === 'translation' ? 'Saving…' : 'Save'}
          </Button>
        </CardFooter>
      </Card>

      {/* ── 3. Topic Classification ───────────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Tag className="h-5 w-5" />
            Topic Classification
          </CardTitle>
          <CardDescription>
            Assigns topic tags to each article for filtering and discovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModelSelect
            label="Groq Model"
            value={topics} onChange={setTopics}
            options={groqOptions}
            defaultValue={modelsData.defaults.TOPICS}
          />
          <div className="space-y-2">
            {promptEditor('prompt_topics')}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => saveModels('topics')}
            disabled={savingSection === 'topics'}
          >
            {savingSection === 'topics' ? 'Saving…' : 'Save'}
          </Button>
        </CardFooter>
      </Card>

      {/* ── 4. Image Generation ───────────────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <ImageIcon className="h-5 w-5" />
            Image Generation
          </CardTitle>
          <CardDescription>
            Creates AI-generated thumbnails for articles and Sunday Editions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Prompt optimisation sub-section */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Prompt Optimisation
              </p>
              <p className="text-xs text-muted-foreground">
                Groq model that rewrites article context into an image-generation prompt.
              </p>
            </div>
            <ModelSelect
              label="Groq Model"
              value={promptModel} onChange={setPromptModel}
              options={groqOptions}
              defaultValue={modelsData.defaults.PROMPT_OPTIMIZATION}
            />
            <div className="space-y-2">
              {promptEditor('prompt_image')}
              {promptEditor('prompt_image_fallback')}
            </div>
          </div>

          <div className="border-t" />

          {/* Image model + inline settings */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Generation Model
              </p>
              <p className="text-xs text-muted-foreground">
                fal.ai model used to render the final image.
              </p>
            </div>
            <ModelSelect
              label="Image Model"
              value={image} onChange={setImage}
              options={imageOptions}
              defaultValue={modelsData.defaults.IMAGE}
            />

            {/* Settings for currently selected model */}
            {currentImageSchema && currentImageSchema.fields.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {currentImageSchema.label} — Settings
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {currentImageSchema.fields.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs">{field.label}</Label>
                      {field.type === 'select' && field.options && (
                        <Select
                          value={String(currentImageEdits[field.key] ?? '')}
                          onValueChange={v => setImageField(field.key, v)}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {field.options.map(o => (
                              <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === 'number' && (
                        <Input
                          type="number" className="h-8 text-xs"
                          min={field.min} max={field.max} step={field.step}
                          value={currentImageEdits[field.key] as number ?? ''}
                          onChange={e => setImageField(field.key, parseFloat(e.target.value))}
                        />
                      )}
                      {field.type === 'boolean' && (
                        <div className="flex items-center h-8">
                          <Switch
                            checked={Boolean(currentImageEdits[field.key])}
                            onCheckedChange={v => setImageField(field.key, v)}
                          />
                        </div>
                      )}
                      {field.type === 'text' && (
                        <Input
                          className="h-8 text-xs"
                          value={String(currentImageEdits[field.key] ?? '')}
                          onChange={e => setImageField(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveImageSettings} disabled={savingImageSettings}>
                    {savingImageSettings ? 'Saving…' : 'Save Settings'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetImageSettings} disabled={savingImageSettings}>
                    Reset to Default
                  </Button>
                </div>
              </div>
            )}
          </div>

        </CardContent>
        <CardFooter>
          <Button
            onClick={() => saveModels('image')}
            disabled={savingSection === 'image'}
          >
            {savingSection === 'image' ? 'Saving…' : 'Save Model Selections'}
          </Button>
        </CardFooter>
      </Card>

      {/* ── 5. Audio Narration (TTS) ──────────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Mic className="h-5 w-5" />
            Audio Narration
          </CardTitle>
          <CardDescription>
            Text-to-speech provider and voice for the Sunday Edition audio narration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-1.5 max-w-sm">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ttsData.options.providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider === 'unreal-speech' && (
            <div className="rounded-md border bg-muted/20 p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Unreal Speech Settings
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Voice</Label>
                  <Select value={usVoice} onValueChange={setUsVoice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ttsData.options.us_voices.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bitrate</Label>
                  <Select value={usBitrate} onValueChange={setUsBitrate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ttsData.options.us_bitrates.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Speed</Label>
                  <Input
                    type="number" min={-1} max={1} step={0.1} value={usSpeed}
                    onChange={e => setUsSpeed(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">−1 (slow) to 1 (fast), 0 = normal</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Pitch</Label>
                  <Input
                    type="number" min={0.5} max={1.5} step={0.05} value={usPitch}
                    onChange={e => setUsPitch(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">0.5 (low) to 1.5 (high), 1 = normal</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Asynchronous — audio is delivered via webhook callback, usually within a few seconds.
              </p>
            </div>
          )}

          {provider === 'fal-gemini' && (
            <div className="rounded-md border bg-muted/20 p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                fal.ai — Gemini TTS Settings
              </p>
              <div className="space-y-1.5 max-w-xs">
                <Label>Voice</Label>
                <Select value={falGeminiVoice} onValueChange={setFalGeminiVoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ttsData.options.fal_gemini_voices.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Synchronous — audio is ready immediately and uploaded to S3, no webhook needed.
              </p>
            </div>
          )}

          {provider === 'fal-minimax' && (
            <div className="rounded-md border bg-muted/20 p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                fal.ai — MiniMax Speech-02 HD Settings
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Voice</Label>
                  <Select value={falMinimaxVoice} onValueChange={setFalMinimaxVoice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ttsData.options.fal_minimax_voices.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Speed</Label>
                  <Input
                    type="number" min={0.5} max={2} step={0.1} value={falMinimaxSpeed}
                    onChange={e => setFalMinimaxSpeed(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">0.5 (slow) to 2.0 (fast), 1 = normal</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Synchronous — audio is ready immediately and uploaded to S3, no webhook needed.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {promptEditor('prompt_tts_cleanup')}
          </div>

        </CardContent>
        <CardFooter>
          <Button onClick={saveTts} disabled={savingTts}>
            {savingTts ? 'Saving…' : 'Save TTS Settings'}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
};

export default AIModels;
