import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { validateCron, parseCron } from './types';

export interface ScheduledTasksProps {
  mainScraperFrequency: string;
  setMainScraperFrequency: (v: string) => void;
  mainScraperEnabled: boolean;
  setMainScraperEnabled: (v: boolean) => void;
  missingAiFrequency: string;
  setMissingAiFrequency: (v: string) => void;
  missingAiEnabled: boolean;
  setMissingAiEnabled: (v: boolean) => void;
  enableScheduledMissingSummary: boolean;
  setEnableScheduledMissingSummary: (v: boolean) => void;
  enableScheduledMissingTags: boolean;
  setEnableScheduledMissingTags: (v: boolean) => void;
  enableScheduledMissingImage: boolean;
  setEnableScheduledMissingImage: (v: boolean) => void;
  enableScheduledMissingTranslations: boolean;
  setEnableScheduledMissingTranslations: (v: boolean) => void;
  sundayEditionFrequency: string;
  setSundayEditionFrequency: (v: string) => void;
  sundayEditionEnabled: boolean;
  setSundayEditionEnabled: (v: boolean) => void;
  savingSchedule: boolean;
  handleSaveScheduleSettings: () => void;
  mainCronError: string | null;
  setMainCronError: (v: string | null) => void;
  missingAiCronError: string | null;
  setMissingAiCronError: (v: string | null) => void;
  sundayCronError: string | null;
  setSundayCronError: (v: string | null) => void;
}

const CronField = ({
  id, value, onChange, error, onBlur,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  onBlur: () => void;
}) => (
  <div className="grid gap-1">
    <Input
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder="e.g., 0 * * * *"
      className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
    />
    {error ? (
      <p className="text-xs text-destructive">{error}</p>
    ) : (
      <p className="text-xs text-muted-foreground">
        {parseCron(value) || 'Custom schedule'} &mdash;{' '}
        <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cron Helper</a>
      </p>
    )}
  </div>
);

const ScheduledTasks: React.FC<ScheduledTasksProps> = ({
  mainScraperFrequency,
  setMainScraperFrequency,
  mainScraperEnabled,
  setMainScraperEnabled,
  missingAiFrequency,
  setMissingAiFrequency,
  missingAiEnabled,
  setMissingAiEnabled,
  enableScheduledMissingSummary,
  setEnableScheduledMissingSummary,
  enableScheduledMissingTags,
  setEnableScheduledMissingTags,
  enableScheduledMissingImage,
  setEnableScheduledMissingImage,
  enableScheduledMissingTranslations,
  setEnableScheduledMissingTranslations,
  sundayEditionFrequency,
  setSundayEditionFrequency,
  sundayEditionEnabled,
  setSundayEditionEnabled,
  savingSchedule,
  handleSaveScheduleSettings,
  mainCronError,
  setMainCronError,
  missingAiCronError,
  setMissingAiCronError,
  sundayCronError,
  setSundayCronError,
}) => {
  return (
    <Card className="mb-6 pt-4">
      <CardHeader>
        <CardTitle className="pb-2">Scheduled Tasks</CardTitle>
        <CardDescription>Configure cron schedules for automated background jobs. Changes take effect after saving.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Main Scraper */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Main Scraper</h5>
              <div className="flex items-center gap-2">
                <Switch
                  id="mainScraperEnabled"
                  checked={mainScraperEnabled}
                  onCheckedChange={setMainScraperEnabled}
                  className="scale-90"
                />
                <Label htmlFor="mainScraperEnabled" className="text-xs text-muted-foreground cursor-pointer">
                  {mainScraperEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
            <div className={mainScraperEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <Label htmlFor="mainScraperFrequency" className="text-xs mb-1 block">Cron Schedule</Label>
              <CronField
                id="mainScraperFrequency"
                value={mainScraperFrequency}
                onChange={v => { setMainScraperFrequency(v); setMainCronError(null); }}
                error={mainCronError}
                onBlur={() => setMainCronError(validateCron(mainScraperFrequency))}
              />
            </div>
          </div>

          {/* Missing AI Processor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Missing AI Processor</h5>
              <div className="flex items-center gap-2">
                <Switch
                  id="missingAiEnabled"
                  checked={missingAiEnabled}
                  onCheckedChange={setMissingAiEnabled}
                  className="scale-90"
                />
                <Label htmlFor="missingAiEnabled" className="text-xs text-muted-foreground cursor-pointer">
                  {missingAiEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
            <div className={missingAiEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <Label htmlFor="missingAiFrequency" className="text-xs mb-1 block">Cron Schedule</Label>
              <CronField
                id="missingAiFrequency"
                value={missingAiFrequency}
                onChange={v => { setMissingAiFrequency(v); setMissingAiCronError(null); }}
                error={missingAiCronError}
                onBlur={() => setMissingAiCronError(validateCron(missingAiFrequency))}
              />
              <div className="mt-3 space-y-2">
                {([
                  { id: 'enableScheduledMissingSummary', label: 'Process Missing Summaries', value: enableScheduledMissingSummary, set: setEnableScheduledMissingSummary },
                  { id: 'enableScheduledMissingTags', label: 'Process Missing Tags', value: enableScheduledMissingTags, set: setEnableScheduledMissingTags },
                  { id: 'enableScheduledMissingImage', label: 'Process Missing Images', value: enableScheduledMissingImage, set: setEnableScheduledMissingImage },
                  { id: 'enableScheduledMissingTranslations', label: 'Process Missing Translations', value: enableScheduledMissingTranslations, set: setEnableScheduledMissingTranslations },
                ] as const).map(({ id, label, value, set }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Switch id={id} checked={value} onCheckedChange={set} />
                    <Label htmlFor={id} className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sunday Edition */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Sunday Edition</h5>
              <div className="flex items-center gap-2">
                <Switch
                  id="sundayEditionEnabled"
                  checked={sundayEditionEnabled}
                  onCheckedChange={setSundayEditionEnabled}
                  className="scale-90"
                />
                <Label htmlFor="sundayEditionEnabled" className="text-xs text-muted-foreground cursor-pointer">
                  {sundayEditionEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
            <div className={sundayEditionEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <Label htmlFor="sundayEditionFrequency" className="text-xs mb-1 block">Cron Schedule</Label>
              <CronField
                id="sundayEditionFrequency"
                value={sundayEditionFrequency}
                onChange={v => { setSundayEditionFrequency(v); setSundayCronError(null); }}
                error={sundayCronError}
                onBlur={() => setSundayCronError(validateCron(sundayEditionFrequency))}
              />
            </div>
          </div>

        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button onClick={handleSaveScheduleSettings} disabled={savingSchedule}>
          {savingSchedule ? 'Saving…' : 'Save Schedule Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScheduledTasks;
