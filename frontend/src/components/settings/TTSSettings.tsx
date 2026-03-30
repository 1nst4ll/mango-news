import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

interface Option { id: string; label: string; }

interface TtsData {
  current: {
    provider: string;
    us_voice: string;
    us_speed: number;
    us_pitch: number;
    us_bitrate: string;
    fal_gemini_voice: string;
    fal_minimax_voice: string;
    fal_minimax_speed: number;
  };
  defaults: Record<string, string | number>;
  options: {
    providers: Option[];
    us_voices: Option[];
    us_bitrates: string[];
    fal_gemini_voices: Option[];
    fal_minimax_voices: Option[];
  };
}

const TTSSettings: React.FC = () => {
  const [data, setData] = useState<TtsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [provider, setProvider] = useState('unreal-speech');
  const [usVoice, setUsVoice] = useState('Charlotte');
  const [usSpeed, setUsSpeed] = useState(0);
  const [usPitch, setUsPitch] = useState(1);
  const [usBitrate, setUsBitrate] = useState('192k');
  const [falGeminiVoice, setFalGeminiVoice] = useState('Kore');
  const [falMinimaxVoice, setFalMinimaxVoice] = useState('Wise_Woman');
  const [falMinimaxSpeed, setFalMinimaxSpeed] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/settings/tts');
        if (!res.ok) throw new Error('Failed to load');
        const d: TtsData = await res.json();
        setData(d);
        setProvider(d.current.provider);
        setUsVoice(d.current.us_voice);
        setUsSpeed(d.current.us_speed);
        setUsPitch(d.current.us_pitch);
        setUsBitrate(d.current.us_bitrate);
        setFalGeminiVoice(d.current.fal_gemini_voice);
        setFalMinimaxVoice(d.current.fal_minimax_voice);
        setFalMinimaxSpeed(d.current.fal_minimax_speed);
      } catch {
        toast.error('Failed to load TTS settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;
  if (!data) return null;

  return (
    <Card className="pt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 pb-1">
          <Mic className="h-5 w-5" />
          Sunday Edition Narration (TTS)
        </CardTitle>
        <CardDescription>
          Configure the text-to-speech provider and voice for Sunday Edition audio narration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Provider */}
        <div className="space-y-1.5 max-w-sm">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {data.options.providers.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* UnrealSpeech options */}
        {provider === 'unreal-speech' && (
          <div className="space-y-4 border rounded-md p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">UnrealSpeech Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Voice</Label>
                <Select value={usVoice} onValueChange={setUsVoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data.options.us_voices.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bitrate</Label>
                <Select value={usBitrate} onValueChange={setUsBitrate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data.options.us_bitrates.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Speed</Label>
                <Input type="number" min={-1} max={1} step={0.1} value={usSpeed}
                  onChange={e => setUsSpeed(parseFloat(e.target.value))} className="max-w-xs" />
                <p className="text-xs text-muted-foreground">-1 (slowest) to 1 (fastest), 0 = normal</p>
              </div>
              <div className="space-y-1.5">
                <Label>Pitch</Label>
                <Input type="number" min={0.5} max={1.5} step={0.05} value={usPitch}
                  onChange={e => setUsPitch(parseFloat(e.target.value))} className="max-w-xs" />
                <p className="text-xs text-muted-foreground">0.5 (low) to 1.5 (high), 1 = normal</p>
              </div>
            </div>
          </div>
        )}

        {/* fal.ai Gemini options */}
        {provider === 'fal-gemini' && (
          <div className="space-y-4 border rounded-md p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">fal.ai — Gemini TTS Settings</p>
            <div className="space-y-1.5 max-w-xs">
              <Label>Voice</Label>
              <Select value={falGeminiVoice} onValueChange={setFalGeminiVoice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.options.fal_gemini_voices.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Synchronous — audio is ready immediately, no webhook needed.</p>
          </div>
        )}

        {/* fal.ai MiniMax options */}
        {provider === 'fal-minimax' && (
          <div className="space-y-4 border rounded-md p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">fal.ai — MiniMax Speech-02 HD Settings</p>
            <div className="space-y-1.5 max-w-xs">
              <Label>Voice</Label>
              <Select value={falMinimaxVoice} onValueChange={setFalMinimaxVoice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.options.fal_minimax_voices.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Speed</Label>
              <Input type="number" min={0.5} max={2} step={0.1} value={falMinimaxSpeed}
                onChange={e => setFalMinimaxSpeed(parseFloat(e.target.value))} className="max-w-xs" />
              <p className="text-xs text-muted-foreground">0.5 (slowest) to 2.0 (fastest), 1 = normal</p>
            </div>
            <p className="text-xs text-muted-foreground">Synchronous — audio is ready immediately, no webhook needed.</p>
          </div>
        )}

      </CardContent>
      <CardFooter className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save TTS Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TTSSettings;
