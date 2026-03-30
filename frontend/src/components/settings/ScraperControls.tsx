import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

export interface ScraperControlsProps {
  enableGlobalAiSummary: boolean;
  setEnableGlobalAiSummary: (v: boolean) => void;
  enableGlobalAiTags: boolean;
  setEnableGlobalAiTags: (v: boolean) => void;
  enableGlobalAiImage: boolean;
  setEnableGlobalAiImage: (v: boolean) => void;
  enableGlobalAiTranslations: boolean;
  setEnableGlobalAiTranslations: (v: boolean) => void;
  loading: boolean;
  purgeLoading: boolean;
  handleTriggerScraper: () => void;
  handlePurgeArticles: () => void;
}

const ScraperControls: React.FC<ScraperControlsProps> = ({
  enableGlobalAiSummary,
  setEnableGlobalAiSummary,
  enableGlobalAiTags,
  setEnableGlobalAiTags,
  enableGlobalAiImage,
  setEnableGlobalAiImage,
  enableGlobalAiTranslations,
  setEnableGlobalAiTranslations,
  loading,
  purgeLoading,
  handleTriggerScraper,
  handlePurgeArticles,
}) => {
  const [emergencyEnabled, setEmergencyEnabled] = useState(false);
  const [emergencyText, setEmergencyText] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencySaving, setEmergencySaving] = useState(false);

  useEffect(() => {
    const fetchEmergency = async () => {
      setEmergencyLoading(true);
      try {
        const res = await apiFetch('/api/settings/emergency');
        if (res.ok) {
          const data = await res.json();
          setEmergencyEnabled(data.enabled);
          setEmergencyText(data.text || '');
        }
      } catch { /* ignore */ } finally {
        setEmergencyLoading(false);
      }
    };
    fetchEmergency();
  }, []);

  const handleSaveEmergency = async () => {
    setEmergencySaving(true);
    try {
      const res = await apiFetch('/api/settings/emergency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: emergencyEnabled, text: emergencyText }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Emergency Banner Updated');
    } catch {
      toast.error('Failed to update emergency banner');
    } finally {
      setEmergencySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Scrape */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="pb-1">Manual Scrape</CardTitle>
          <CardDescription>
            These AI options apply to the next manual scrape run below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="enableGlobalAiSummary" checked={enableGlobalAiSummary} onCheckedChange={setEnableGlobalAiSummary} />
              <Label htmlFor="enableGlobalAiSummary">Generate AI Summaries</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableGlobalAiTags" checked={enableGlobalAiTags} onCheckedChange={setEnableGlobalAiTags} />
              <Label htmlFor="enableGlobalAiTags">Generate AI Tags</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableGlobalAiImage" checked={enableGlobalAiImage} onCheckedChange={setEnableGlobalAiImage} />
              <Label htmlFor="enableGlobalAiImage">Generate AI Images</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="enableGlobalAiTranslations" checked={enableGlobalAiTranslations} onCheckedChange={setEnableGlobalAiTranslations} />
              <Label htmlFor="enableGlobalAiTranslations">Generate AI Translations</Label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleTriggerScraper} disabled={loading}>
                {loading ? 'Triggering…' : 'Run Scraper'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Triggers a full scrape run for all active sources.</TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>

      {/* Emergency Banner */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pb-1">
            <Megaphone className="h-5 w-5" />
            Emergency Banner
          </CardTitle>
          <CardDescription>Display an urgent alert banner at the top of the public site.</CardDescription>
        </CardHeader>
        <CardContent>
          {emergencyLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="emergencyEnabled"
                  checked={emergencyEnabled}
                  onCheckedChange={setEmergencyEnabled}
                />
                <Label htmlFor="emergencyEnabled">{emergencyEnabled ? 'Banner is visible' : 'Banner is hidden'}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyText">Banner Message</Label>
                <Input
                  id="emergencyText"
                  placeholder="Enter emergency alert message..."
                  value={emergencyText}
                  onChange={(e) => setEmergencyText(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          <Button onClick={handleSaveEmergency} disabled={emergencySaving || emergencyLoading} variant="outline">
            {emergencySaving ? 'Saving…' : 'Save Banner Settings'}
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-destructive/30 p-4">
            <div>
              <p className="font-medium text-sm">Purge All Articles</p>
              <p className="text-xs text-muted-foreground">Permanently deletes every article in the database.</p>
            </div>
            <Button onClick={handlePurgeArticles} disabled={purgeLoading} variant="destructive" size="sm">
              {purgeLoading ? 'Purging…' : 'Purge All'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScraperControls;
