import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from 'lucide-react';

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
  sundayEditionLoading: boolean;
  purgeLoading: boolean;
  handleTriggerScraper: () => void;
  handleGenerateSundayEdition: () => void;
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
  sundayEditionLoading,
  purgeLoading,
  handleTriggerScraper,
  handleGenerateSundayEdition,
  handlePurgeArticles,
}) => {
  return (
    <div className="space-y-6">
      {/* Manual Scrape */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="pb-1">Manual Scrape</CardTitle>
          <CardDescription>
            These AI options are saved per-browser and apply to the next manual scrape run below.
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

      {/* Sunday Edition */}
      <Card className="pt-4">
        <CardHeader>
          <CardTitle className="pb-1">Sunday Edition</CardTitle>
          <CardDescription>Manually generate this week's Sunday edition digest.</CardDescription>
        </CardHeader>
        <CardFooter className="pt-2">
          <Button onClick={handleGenerateSundayEdition} disabled={sundayEditionLoading} variant="outline">
            {sundayEditionLoading ? 'Generating…' : 'Generate Sunday Edition'}
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 pt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-red-200 p-4">
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
