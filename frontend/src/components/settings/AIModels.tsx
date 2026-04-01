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
  FileText, Languages, Tag, ImageIcon, Mic,
  ChevronDown, ChevronRight, RotateCcw, Save,
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

interface PodcastData {
  current: {
    format: string; host1_voice: string; host1_id: string;
    host2_voice: string; host2_id: string; gemini_model: string;
    temperature: number; style_instructions: string;
  };
  defaults: Record<string, string | number>;
  options: {
    formats: ModelOption[]; gemini_voices: ModelOption[];
    gemini_models: ModelOption[];
  };
}

// ── Shared sub-components ──────────────────────────────────────────────────

function ModelSelect({
  label, value, onChange, options, defaultValue,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: ModelOption[]; defaultValue: string;
}) {
  const isDirty = value !== defaultValue;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(m => (
            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isDirty && (
        <p className="text-[11px] text-muted-foreground">
          Default: <span className="font-mono">{defaultValue}</span>
        </p>
      )}
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
              <Button size="sm" onClick={onSave} disabled={saving || !isDirty}>
                {saving ? 'Saving...' : 'Save prompt'}
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
  const [savingModels, setSavingModels] = useState(false);

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

  // Podcast
  const [podcastData, setPodcastData] = useState<PodcastData | null>(null);
  const [podFormat, setPodFormat] = useState('monologue');
  const [podHost1Voice, setPodHost1Voice] = useState('Charon');
  const [podHost1Id, setPodHost1Id] = useState('Kayo');
  const [podHost2Voice, setPodHost2Voice] = useState('Kore');
  const [podHost2Id, setPodHost2Id] = useState('Nala');
  const [podModel, setPodModel] = useState('gemini-2.5-flash-tts');
  const [podTemp, setPodTemp] = useState(1.0);
  const [podStyle, setPodStyle] = useState('');
  const [savingPodcast, setSavingPodcast] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [mRes, iRes, pRes, tRes, podRes] = await Promise.all([
          apiFetch('/api/settings/ai-models'),
          apiFetch('/api/settings/image-settings'),
          apiFetch('/api/settings/prompts'),
          apiFetch('/api/settings/tts'),
          apiFetch('/api/settings/podcast'),
        ]);
        if (!mRes.ok || !iRes.ok || !pRes.ok || !tRes.ok || !podRes.ok) throw new Error('Failed to load');

        const [m, i, p, t, pod]: [AiModelsData, ImageSettingsData, PromptsData, TtsData, PodcastData] =
          await Promise.all([mRes.json(), iRes.json(), pRes.json(), tRes.json(), podRes.json()]);

        setModelsData(m);
        setSummary(m.current.SUMMARY);
        setTranslation(m.current.TRANSLATION);
        setTopics(m.current.TOPICS);
        setPromptModel(m.current.PROMPT_OPTIMIZATION);
        setImage(m.current.IMAGE);

        setImageData(i);
        // Initialise edits: merge defaults with current for every model
        const allEdits: Record<string, Record<string, unknown>> = {};
        for (const modelId of Object.keys(i.schemas)) {
          allEdits[modelId] = { ...(i.defaults[modelId] ?? {}), ...(i.current[modelId] ?? {}) };
        }
        setImageEdits(allEdits);

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

        setPodcastData(pod);
        setPodFormat(pod.current.format);
        setPodHost1Voice(pod.current.host1_voice);
        setPodHost1Id(pod.current.host1_id);
        setPodHost2Voice(pod.current.host2_voice);
        setPodHost2Id(pod.current.host2_id);
        setPodModel(pod.current.gemini_model);
        setPodTemp(pod.current.temperature);
        setPodStyle(pod.current.style_instructions);
      } catch {
        toast.error('Failed to load AI settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Dirty tracking ────────────────────────────────────────────────────────

  const modelsAreDirty = modelsData != null && (
    summary !== modelsData.current.SUMMARY ||
    translation !== modelsData.current.TRANSLATION ||
    topics !== modelsData.current.TOPICS ||
    promptModel !== modelsData.current.PROMPT_OPTIMIZATION ||
    image !== modelsData.current.IMAGE
  );

  const ttsIsDirty = ttsData != null && (
    provider !== ttsData.current.provider ||
    usVoice !== ttsData.current.us_voice ||
    usSpeed !== ttsData.current.us_speed ||
    usPitch !== ttsData.current.us_pitch ||
    usBitrate !== ttsData.current.us_bitrate ||
    falGeminiVoice !== ttsData.current.fal_gemini_voice ||
    falMinimaxVoice !== ttsData.current.fal_minimax_voice ||
    falMinimaxSpeed !== ttsData.current.fal_minimax_speed
  );

  const podcastIsDirty = podcastData != null && (
    podFormat !== podcastData.current.format ||
    podHost1Voice !== podcastData.current.host1_voice ||
    podHost1Id !== podcastData.current.host1_id ||
    podHost2Voice !== podcastData.current.host2_voice ||
    podHost2Id !== podcastData.current.host2_id ||
    podModel !== podcastData.current.gemini_model ||
    podTemp !== podcastData.current.temperature ||
    podStyle !== podcastData.current.style_instructions
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const saveModelsHandler = async () => {
    setSavingModels(true);
    try {
      const res = await apiFetch('/api/settings/ai-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary, translation, topics, prompt: promptModel, image,
        }),
      });
      if (!res.ok) throw new Error();
      // Update baseline so dirty tracking clears
      setModelsData(prev => prev ? {
        ...prev,
        current: {
          SUMMARY: summary, TRANSLATION: translation, TOPICS: topics,
          PROMPT_OPTIMIZATION: promptModel, IMAGE: image,
        },
      } : prev);
      toast.success('Model settings saved');
    } catch {
      toast.error('Failed to save model settings');
    } finally {
      setSavingModels(false);
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
      // Update baseline for this model
      setImageData(prev => prev ? {
        ...prev,
        current: { ...prev.current, [image]: { ...imageEdits[image] } },
      } : prev);
      toast.success('Image settings saved');
    } catch {
      toast.error('Failed to save image settings');
    } finally {
      setSavingImageSettings(false);
    }
  };

  const resetImageSettings = () => {
    if (!imageData) return;
    setImageEdits(prev => ({
      ...prev,
      [image]: { ...(imageData.defaults[image] ?? {}) },
    }));
  };

  const setImageField = (key: string, value: unknown) => {
    setImageEdits(prev => ({
      ...prev,
      [image]: {
        ...(imageData?.defaults[image] ?? {}),
        ...(prev[image] ?? {}),
        [key]: value,
      },
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
      // Update baseline so dirty tracking clears
      setTtsData(prev => prev ? {
        ...prev,
        current: {
          provider, us_voice: usVoice, us_speed: usSpeed, us_pitch: usPitch, us_bitrate: usBitrate,
          fal_gemini_voice: falGeminiVoice,
          fal_minimax_voice: falMinimaxVoice, fal_minimax_speed: falMinimaxSpeed,
        },
      } : prev);
      toast.success('TTS settings saved');
    } catch {
      toast.error('Failed to save TTS settings');
    } finally {
      setSavingTts(false);
    }
  };

  const savePodcast = async () => {
    setSavingPodcast(true);
    try {
      const res = await apiFetch('/api/settings/podcast', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: podFormat, host1_voice: podHost1Voice, host1_id: podHost1Id,
          host2_voice: podHost2Voice, host2_id: podHost2Id, gemini_model: podModel,
          temperature: podTemp, style_instructions: podStyle,
        }),
      });
      if (!res.ok) throw new Error();
      setPodcastData(prev => prev ? {
        ...prev,
        current: {
          format: podFormat, host1_voice: podHost1Voice, host1_id: podHost1Id,
          host2_voice: podHost2Voice, host2_id: podHost2Id, gemini_model: podModel,
          temperature: podTemp, style_instructions: podStyle,
        },
      } : prev);
      toast.success('Podcast settings saved');
    } catch {
      toast.error('Failed to save podcast settings');
    } finally {
      setSavingPodcast(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
            <div className="h-5 w-48 bg-muted rounded mb-3" />
            <div className="h-4 w-72 bg-muted rounded mb-4" />
            <div className="h-9 w-80 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (!modelsData || !imageData || !promptsData || !ttsData || !podcastData) return null;

  const groqOptions = modelsData.options.groq;
  const imageOptions = modelsData.options.image;

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
  const currentImageEdits = imageEdits[image] ?? imageData.defaults[image] ?? {};

  return (
    <div className="space-y-4">

      {/* ── Card 1: Text Generation (3 internal sections) ─────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="pb-1">Text Generation</CardTitle>
          <CardDescription>
            Groq language models for summarisation, translation, and topic classification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Summarisation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Summarisation</h4>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Article summaries and the weekly Sunday Edition digest.
            </p>
            <ModelSelect
              label="Model" value={summary} onChange={setSummary}
              options={groqOptions} defaultValue={modelsData.defaults.SUMMARY}
            />
            <div className="space-y-2">
              {promptEditor('prompt_summary')}
              {promptEditor('prompt_weekly_summary')}
            </div>
          </section>

          <div className="border-t" />

          {/* Translation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Translation</h4>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Translates articles to Spanish and Haitian Creole.
            </p>
            <ModelSelect
              label="Model" value={translation} onChange={setTranslation}
              options={groqOptions} defaultValue={modelsData.defaults.TRANSLATION}
            />
            <div className="space-y-2">
              {promptEditor('prompt_translation')}
              {promptEditor('prompt_translation_title')}
            </div>
          </section>

          <div className="border-t" />

          {/* Topic Classification */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Topic Classification</h4>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Assigns topic tags for filtering and discovery.
            </p>
            <ModelSelect
              label="Model" value={topics} onChange={setTopics}
              options={groqOptions} defaultValue={modelsData.defaults.TOPICS}
            />
            <div className="space-y-2">
              {promptEditor('prompt_topics')}
            </div>
          </section>

        </CardContent>
      </Card>

      {/* ── Card 2: Image Generation ─────────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <ImageIcon className="h-5 w-5" />
            Image Generation
          </CardTitle>
          <CardDescription>
            AI-generated thumbnails for articles and Sunday Editions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Prompt optimisation */}
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Prompt Optimisation
              </p>
              <p className="text-xs text-muted-foreground">
                Groq model that rewrites article context into an image prompt.
              </p>
            </div>
            <ModelSelect
              label="Model" value={promptModel} onChange={setPromptModel}
              options={groqOptions} defaultValue={modelsData.defaults.PROMPT_OPTIMIZATION}
            />
            <div className="space-y-2">
              {promptEditor('prompt_image')}
              {promptEditor('prompt_image_fallback')}
            </div>
          </section>

          <div className="border-t" />

          {/* Generation model + inline settings */}
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Generation Model
              </p>
              <p className="text-xs text-muted-foreground">
                fal.ai model used to render the final image.
              </p>
            </div>
            <ModelSelect
              label="Image Model" value={image} onChange={setImage}
              options={imageOptions} defaultValue={modelsData.defaults.IMAGE}
            />

            {currentImageSchema && currentImageSchema.fields.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {currentImageSchema.label} — Settings
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {savingImageSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetImageSettings} disabled={savingImageSettings}>
                    Reset to Default
                  </Button>
                </div>
              </div>
            )}
          </section>

        </CardContent>
      </Card>

      {/* ── Card 3: Sunday Edition Audio ─────────────────────────────────── */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Mic className="h-5 w-5" />
            Sunday Edition Audio
          </CardTitle>
          <CardDescription>
            Choose the audio format for Sunday Editions and configure its settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Format toggle — always visible */}
          <div className="space-y-1.5 max-w-sm">
            <Label>Edition Format</Label>
            <Select value={podFormat} onValueChange={setPodFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {podcastData.options.formats.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {podFormat === 'monologue'
                ? 'Single-narrator CNN-style digest using a text-to-speech provider.'
                : 'Two-host conversational podcast ("The Mango Rundown") via Gemini TTS multi-speaker.'}
            </p>
          </div>

          <div className="border-t" />

          {/* ── Monologue settings ──────────────────────────────────────────── */}
          {podFormat === 'monologue' && (
            <>
              <section className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    TTS Provider
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Voice engine for single-narrator audio generation.
                  </p>
                </div>

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
                        <p className="text-xs text-muted-foreground">-1 (slow) to 1 (fast), 0 = normal</p>
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
                      Asynchronous -- audio delivered via webhook callback.
                    </p>
                  </div>
                )}

                {provider === 'fal-gemini' && (
                  <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      fal.ai -- Gemini TTS Settings
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
                      Synchronous -- audio ready immediately, uploaded to S3.
                    </p>
                  </div>
                )}

                {provider === 'fal-minimax' && (
                  <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      fal.ai -- MiniMax Speech-02 HD Settings
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
                      Synchronous -- audio ready immediately, uploaded to S3.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {promptEditor('prompt_tts_cleanup')}
                </div>
              </section>

              <div className="flex gap-2 pt-2">
                <Button onClick={saveTts} disabled={savingTts || !ttsIsDirty}>
                  {savingTts ? 'Saving...' : 'Save TTS Settings'}
                </Button>
                {podcastIsDirty && (
                  <Button onClick={savePodcast} disabled={savingPodcast} variant="outline">
                    {savingPodcast ? 'Saving...' : 'Save Format'}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ── Podcast settings ───────────────────────────────────────────── */}
          {podFormat === 'podcast' && (
            <>
              {/* Host 1 */}
              <section className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Host Configuration
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gemini TTS multi-speaker voices. Each host needs a voice and a speaker ID matching the script prompt.
                  </p>
                </div>

                <div className="rounded-md border p-4 space-y-3">
                  <p className="text-sm font-medium">Host 1 — Kayo (Anchor)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Voice</Label>
                      <Select value={podHost1Voice} onValueChange={setPodHost1Voice}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {podcastData.options.gemini_voices.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Speaker ID</Label>
                      <Input value={podHost1Id} onChange={e => setPodHost1Id(e.target.value)} className="max-w-48" placeholder="Kayo" />
                      <p className="text-[11px] text-muted-foreground">Must match the name prefix in the podcast prompt</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4 space-y-3">
                  <p className="text-sm font-medium">Host 2 — Nala (Color Commentator)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Voice</Label>
                      <Select value={podHost2Voice} onValueChange={setPodHost2Voice}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {podcastData.options.gemini_voices.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Speaker ID</Label>
                      <Input value={podHost2Id} onChange={e => setPodHost2Id(e.target.value)} className="max-w-48" placeholder="Nala" />
                      <p className="text-[11px] text-muted-foreground">Must match the name prefix in the podcast prompt</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t" />

              {/* TTS Model & Generation */}
              <section className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Audio Generation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gemini TTS model and style for multi-speaker synthesis.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">TTS Model</Label>
                    <Select value={podModel} onValueChange={setPodModel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {podcastData.options.gemini_models.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Temperature ({podTemp})</Label>
                    <Input type="number" min={0} max={2} step={0.1} value={podTemp}
                      onChange={e => setPodTemp(parseFloat(e.target.value) || 1)} className="max-w-32" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Style Instructions</Label>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[100px] resize-y"
                    value={podStyle}
                    onChange={e => setPodStyle(e.target.value)}
                    maxLength={4000}
                    placeholder="Caribbean news podcast style guidance for Gemini TTS..."
                  />
                  <p className="text-[11px] text-muted-foreground">{podStyle.length}/4,000 characters</p>
                </div>
              </section>

              <div className="border-t" />

              {/* Prompts */}
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Prompts
                  </p>
                </div>
                <div className="space-y-2">
                  {promptEditor('prompt_weekly_podcast')}
                  {promptEditor('prompt_tts_cleanup')}
                </div>
              </section>

              <div className="pt-2">
                <Button onClick={savePodcast} disabled={savingPodcast || !podcastIsDirty}>
                  {savingPodcast ? 'Saving...' : 'Save Podcast Settings'}
                </Button>
              </div>
            </>
          )}

        </CardContent>
      </Card>

      {/* ── Sticky save bar for model selections ─────────────────────────── */}
      {modelsAreDirty && (
        <div className="sticky bottom-0 z-10 rounded-lg border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            You have unsaved model changes
          </p>
          <Button onClick={saveModelsHandler} disabled={savingModels}>
            <Save className="h-4 w-4 mr-2" />
            {savingModels ? 'Saving...' : 'Save Model Settings'}
          </Button>
        </div>
      )}

    </div>
  );
};

export default AIModels;
