import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '../lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { SourceDistributionPieChart } from "./charts/SourceDistributionPieChart";
import { ArticlesTimelineChart } from "./charts/ArticlesTimelineChart";
import { SourceBarChart } from "./charts/SourceBarChart";
import { AiCoverageChart } from "./charts/AiCoverageChart";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { MoreHorizontal, RefreshCw, AlertTriangle, Newspaper, Globe, Zap, FileText, Tag, Image, Languages } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";

// ---------------------------------------------------------------------------
// Cron helpers
// ---------------------------------------------------------------------------

/** Validate a 5-field cron expression. Returns null if valid, error string if not. */
function validateCron(expr: string): string | null {
  if (!expr || !expr.trim()) return 'Cron expression is required.';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Must have exactly 5 fields: minute hour day month weekday.';
  const ranges = [
    { name: 'minute',  min: 0, max: 59 },
    { name: 'hour',    min: 0, max: 23 },
    { name: 'day',     min: 1, max: 31 },
    { name: 'month',   min: 1, max: 12 },
    { name: 'weekday', min: 0, max: 7  },
  ];
  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    const { name, min, max } = ranges[i];
    if (field === '*') continue;
    // */n
    if (/^\*\/\d+$/.test(field)) {
      const n = parseInt(field.slice(2));
      if (n < 1) return `${name}: step must be ≥ 1.`;
      continue;
    }
    // n-m
    if (/^\d+-\d+$/.test(field)) {
      const [a, b] = field.split('-').map(Number);
      if (a < min || b > max || a > b) return `${name}: range ${field} is out of bounds (${min}-${max}).`;
      continue;
    }
    // list: 1,2,3 or ranges in list
    if (/^[\d,]+$/.test(field)) {
      const nums = field.split(',').map(Number);
      if (nums.some(n => n < min || n > max)) return `${name}: value out of bounds (${min}-${max}).`;
      continue;
    }
    // plain number
    if (/^\d+$/.test(field)) {
      const n = parseInt(field);
      if (n < min || n > max) return `${name}: ${n} is out of bounds (${min}-${max}).`;
      continue;
    }
    return `${name}: unrecognised pattern "${field}".`;
  }
  return null;
}

/** Parse a 5-field cron expression into a human-readable string. */
function parseCron(expr: string): string {
  if (!expr) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return '';
  const [min, hour, dom, month, dow] = parts;

  if (expr === '* * * * *') return 'Every minute';
  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(min.slice(2));
    return `Every ${n} minute${n !== 1 ? 's' : ''}`;
  }
  if (min === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2));
    return `Every ${n} hour${n !== 1 ? 's' : ''}`;
  }
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:00`;
  }
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = dow.split(',').map(d => days[parseInt(d)] ?? d).join(', ');
    return `Every ${dayNames} at ${hour.padStart(2, '0')}:00`;
  }
  if (min === '0' && hour !== '*' && dom !== '*' && month === '*' && dow === '*') {
    return `Monthly on day ${dom} at ${hour.padStart(2, '0')}:00`;
  }
  // step on hour field: */n with specific minute
  if (hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2));
    return `Every ${n} hour${n !== 1 ? 's' : ''} at :${min.padStart(2, '0')}`;
  }
  return 'Custom schedule';
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface ArticleStats {
  totalArticles: number | null;
  totalSources: number | null;
  articlesPerSource: { source_name: string; article_count: number }[];
  articlesPerYear: { year: number; article_count: number }[];
}

interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean;
  enable_ai_image: boolean;
  enable_ai_translations: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null;
  exclude_patterns: string | null;
  scrape_after_date: string | null;
}

interface ModalFormData {
  name: string;
  url: string;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean;
  enable_ai_image: boolean;
  enable_ai_translations: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null;
  exclude_patterns: string | null;
  scrape_after_date: string | null;
}

const emptyModalForm: ModalFormData = {
  name: '',
  url: '',
  enable_ai_summary: true,
  enable_ai_tags: true,
  enable_ai_image: true,
  enable_ai_translations: true,
  include_selectors: null,
  exclude_selectors: null,
  scraping_method: 'opensource',
  os_title_selector: null,
  os_content_selector: null,
  os_date_selector: null,
  os_author_selector: null,
  os_thumbnail_selector: null,
  os_topics_selector: null,
  article_link_template: null,
  exclude_patterns: null,
  scrape_after_date: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettingsPage: React.FC = () => {

  // --- Scheduler state ---
  const [mainScraperFrequency, setMainScraperFrequency] = useState<string>('0 * * * *');
  const [mainScraperEnabled, setMainScraperEnabled] = useState<boolean>(true);
  const [missingAiFrequency, setMissingAiFrequency] = useState<string>('*/20 * * * *');
  const [missingAiEnabled, setMissingAiEnabled] = useState<boolean>(true);
  const [enableScheduledMissingSummary, setEnableScheduledMissingSummary] = useState<boolean>(true);
  const [enableScheduledMissingTags, setEnableScheduledMissingTags] = useState<boolean>(true);
  const [enableScheduledMissingImage, setEnableScheduledMissingImage] = useState<boolean>(true);
  const [enableScheduledMissingTranslations, setEnableScheduledMissingTranslations] = useState<boolean>(true);
  const [sundayEditionFrequency, setSundayEditionFrequency] = useState<string>('0 0 * * 0');
  const [sundayEditionEnabled, setSundayEditionEnabled] = useState<boolean>(true);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Cron validation errors
  const [mainCronError, setMainCronError] = useState<string | null>(null);
  const [missingAiCronError, setMissingAiCronError] = useState<string | null>(null);
  const [sundayCronError, setSundayCronError] = useState<string | null>(null);

  // --- Overview / Actions state ---
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [sundayEditionLoading, setSundayEditionLoading] = useState<boolean>(false);
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(true);
  const [enableGlobalAiTags, setEnableGlobalAiTags] = useState<boolean>(true);
  const [enableGlobalAiImage, setEnableGlobalAiImage] = useState<boolean>(true);
  const [enableGlobalAiTranslations, setEnableGlobalAiTranslations] = useState<boolean>(true);
  const [stats, setStats] = useState<ArticleStats>({ totalArticles: null, totalSources: null, articlesPerSource: [], articlesPerYear: [] });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLastUpdated, setStatsLastUpdated] = useState<Date | null>(null);

  // --- Sources state ---
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(true);
  const [sourcesError, setSourcesError] = useState<unknown>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceScrapingLoading, setSourceScrapingLoading] = useState<{ [key: number]: boolean }>({});
  const [sourceArticleDeletionLoading, setSourceArticleDeletionLoading] = useState<{ [key: number]: boolean }>({});
  const [sourceScrapeResult, setSourceScrapeResult] = useState<{ [key: number]: string | null }>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState<ModalFormData>(emptyModalForm);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'purgeAll' | 'deleteSourceArticles' | 'deleteSource' | 'bulkDelete' | null>(null);
  const [confirmDialogSourceId, setConfirmDialogSourceId] = useState<number | null>(null);

  // Search / filter / bulk
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceFilterStatus, setSourceFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived / memoized
  // ---------------------------------------------------------------------------

  const articleCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats.articlesPerSource) {
      map.set(s.source_name, s.article_count);
    }
    return map;
  }, [stats.articlesPerSource]);

  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      const matchesSearch =
        source.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        source.url.toLowerCase().includes(sourceSearch.toLowerCase());
      const matchesStatus =
        sourceFilterStatus === 'all' ||
        (sourceFilterStatus === 'active' && source.is_active) ||
        (sourceFilterStatus === 'inactive' && !source.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [sources, sourceSearch, sourceFilterStatus]);

  const activeSources = useMemo(() => sources.filter(s => s.is_active).length, [sources]);

  // AI coverage stats across all sources
  const aiCoverage = useMemo(() => {
    const total = stats.totalArticles ?? 0;
    if (total === 0) return null;
    // Count per-source articles that have each feature enabled as a proxy for coverage
    // (Real coverage would need per-article data; this shows configured capacity)
    const withSummary = sources.filter(s => s.enable_ai_summary).reduce((acc, s) => acc + (articleCountMap.get(s.name) ?? 0), 0);
    const withTags = sources.filter(s => s.enable_ai_tags).reduce((acc, s) => acc + (articleCountMap.get(s.name) ?? 0), 0);
    const withImage = sources.filter(s => s.enable_ai_image).reduce((acc, s) => acc + (articleCountMap.get(s.name) ?? 0), 0);
    const withTranslations = sources.filter(s => s.enable_ai_translations).reduce((acc, s) => acc + (articleCountMap.get(s.name) ?? 0), 0);
    return { withSummary, withTags, withImage, withTranslations, total };
  }, [stats.totalArticles, sources, articleCountMap]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchSchedulerSettings = async () => {
      try {
        const response = await apiFetch('/api/settings/scheduler');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setMainScraperFrequency(data.main_scraper_frequency);
        setMissingAiFrequency(data.missing_ai_frequency);
        setEnableScheduledMissingSummary(data.enable_scheduled_missing_summary);
        setEnableScheduledMissingTags(data.enable_scheduled_missing_tags);
        setEnableScheduledMissingImage(data.enable_scheduled_missing_image);
        setEnableScheduledMissingTranslations(data.enable_scheduled_missing_translations);
        setSundayEditionFrequency(data.sunday_edition_frequency);
        if (data.main_scraper_enabled !== undefined) setMainScraperEnabled(data.main_scraper_enabled);
        if (data.missing_ai_enabled !== undefined) setMissingAiEnabled(data.missing_ai_enabled);
        if (data.sunday_edition_enabled !== undefined) setSundayEditionEnabled(data.sunday_edition_enabled);
      } catch (error: unknown) {
        toast.error("Error Loading Schedule Settings", {
          description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      }
    };
    fetchSchedulerSettings();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = localStorage.getItem('enableGlobalAiSummary');
    if (s !== null) setEnableGlobalAiSummary(JSON.parse(s));
    const t = localStorage.getItem('enableGlobalAiTags');
    if (t !== null) setEnableGlobalAiTags(JSON.parse(t));
    const im = localStorage.getItem('enableGlobalAiImage');
    if (im !== null) setEnableGlobalAiImage(JSON.parse(im));
    const tr = localStorage.getItem('enableGlobalAiTranslations');
    if (tr !== null) setEnableGlobalAiTranslations(JSON.parse(tr));

    fetchStats();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('enableGlobalAiSummary', JSON.stringify(enableGlobalAiSummary));
  }, [enableGlobalAiSummary]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('enableGlobalAiTags', JSON.stringify(enableGlobalAiTags));
  }, [enableGlobalAiTags]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('enableGlobalAiImage', JSON.stringify(enableGlobalAiImage));
  }, [enableGlobalAiImage]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('enableGlobalAiTranslations', JSON.stringify(enableGlobalAiTranslations));
  }, [enableGlobalAiTranslations]);

  useEffect(() => { fetchSources(); }, []);

  // ---------------------------------------------------------------------------
  // Data fetchers
  // ---------------------------------------------------------------------------

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await apiFetch('/api/stats');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: ArticleStats = await response.json();
      setStats(data);
      setStatsLastUpdated(new Date());
    } catch (err: unknown) {
      setStatsError(err instanceof Error ? err.message : 'An unknown error occurred while fetching stats.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const response = await apiFetch('/api/sources');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSources(data.map((source: Source) => ({
        ...source,
        enable_ai_summary: source.enable_ai_summary !== undefined ? source.enable_ai_summary : true,
        enable_ai_tags: source.enable_ai_tags !== undefined ? source.enable_ai_tags : true,
        enable_ai_translations: source.enable_ai_translations !== undefined ? source.enable_ai_translations : true,
        is_active: source.is_active !== undefined ? source.is_active : true,
        include_selectors: source.include_selectors ?? null,
        exclude_selectors: source.exclude_selectors ?? null,
        scraping_method: source.scraping_method ?? 'opensource',
        os_title_selector: source.os_title_selector ?? null,
        os_content_selector: source.os_content_selector ?? null,
        os_date_selector: source.os_date_selector ?? null,
        os_author_selector: source.os_author_selector ?? null,
        os_thumbnail_selector: source.os_thumbnail_selector ?? null,
        os_topics_selector: source.os_topics_selector ?? null,
        article_link_template: source.article_link_template ?? null,
        exclude_patterns: source.exclude_patterns ?? null,
      })));
    } catch (error: unknown) {
      setSourcesError(error);
      toast.error("Error Fetching Sources", {
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setSourcesLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers — scraper / global actions
  // ---------------------------------------------------------------------------

  const handleTriggerScraper = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/scrape/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to trigger scraper');
      toast.success("Scraper Triggered", { description: data.message || 'Scraper triggered successfully.' });
    } catch (error: unknown) {
      toast.error("Scraper Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSundayEdition = async () => {
    setSundayEditionLoading(true);
    try {
      const response = await apiFetch('/api/sunday-editions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate Sunday edition');
      toast.success("Sunday Edition Generated", { description: data.message || 'Sunday edition generated successfully.' });
    } catch (error: unknown) {
      toast.error("Sunday Edition Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSundayEditionLoading(false);
    }
  };

  const handlePurgeArticles = () => {
    setConfirmDialogAction('purgeAll');
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmPurgeArticles = async () => {
    setIsConfirmDialogOpen(false);
    setPurgeLoading(true);
    try {
      const response = await apiFetch('/api/articles/purge', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to purge articles');
      toast.success("Articles Purged", { description: data.message || 'All articles purged successfully.' });
    } catch (error: unknown) {
      toast.error("Purge Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setPurgeLoading(false);
    }
  };

  const handleTriggerScraperForSource = async (sourceId: number) => {
    setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    try {
      const response = await apiFetch(`/api/scrape/run/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to trigger scraper for source ${sourceId}`);
      setSourceScrapeResult(prev => ({ ...prev, [sourceId]: `+${data.articlesAdded ?? 0} articles` }));
      toast.success("Source Scrape Triggered", {
        description: `Found ${data.linksFound} links, added ${data.articlesAdded} new articles.`,
      });
    } catch (error: unknown) {
      toast.error("Source Scrape Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  const handleDeleteArticlesForSource = (sourceId: number) => {
    setConfirmDialogAction('deleteSourceArticles');
    setConfirmDialogSourceId(sourceId);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDeleteArticlesForSource = async () => {
    if (confirmDialogSourceId === null) return;
    const sourceId = confirmDialogSourceId;
    setIsConfirmDialogOpen(false);
    setConfirmDialogSourceId(null);
    setSourceArticleDeletionLoading(prev => ({ ...prev, [sourceId]: true }));
    try {
      const response = await apiFetch(`/api/articles/purge/${sourceId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to delete articles for source ${sourceId}`);
      toast.success("Articles Purged", { description: data.message || `Articles for source purged successfully.` });
    } catch (error: unknown) {
      toast.error("Article Deletion Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSourceArticleDeletionLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers — scheduler
  // ---------------------------------------------------------------------------

  const handleSaveScheduleSettings = async () => {
    const e1 = validateCron(mainScraperFrequency);
    const e2 = validateCron(missingAiFrequency);
    const e3 = validateCron(sundayEditionFrequency);
    setMainCronError(e1);
    setMissingAiCronError(e2);
    setSundayCronError(e3);
    if (e1 || e2 || e3) {
      toast.error("Invalid cron expression", { description: "Please fix the highlighted fields before saving." });
      return;
    }

    setSavingSchedule(true);
    try {
      const response = await apiFetch('/api/settings/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_scraper_frequency: mainScraperFrequency,
          main_scraper_enabled: mainScraperEnabled,
          missing_ai_frequency: missingAiFrequency,
          missing_ai_enabled: missingAiEnabled,
          enable_scheduled_missing_summary: enableScheduledMissingSummary,
          enable_scheduled_missing_tags: enableScheduledMissingTags,
          enable_scheduled_missing_image: enableScheduledMissingImage,
          enable_scheduled_missing_translations: enableScheduledMissingTranslations,
          sunday_edition_frequency: sundayEditionFrequency,
          sunday_edition_enabled: sundayEditionEnabled,
        }),
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to save schedule settings');
      toast.success("Schedule Settings Saved", { description: res.message || 'Scheduler settings updated successfully.' });
    } catch (error: unknown) {
      toast.error("Error Saving Schedule Settings", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSavingSchedule(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers — sources CRUD
  // ---------------------------------------------------------------------------

  const validateUrl = (url: string): string | null => {
    if (!url) return null;
    try {
      new URL(url);
      return null;
    } catch {
      return 'Please enter a valid URL (e.g. https://example.com).';
    }
  };

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModalFormData(prev => ({ ...prev, [name]: value || null }));
    if (name === 'url') setUrlError(validateUrl(value));
  };

  const handleAddSource = async () => {
    if (!modalFormData.name || !modalFormData.url) {
      toast.error("Missing Information", { description: "Please enter both source name and URL." });
      return;
    }
    const urlErr = validateUrl(modalFormData.url);
    if (urlErr) { setUrlError(urlErr); return; }
    try {
      const response = await apiFetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalFormData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const addedSource = await response.json();
      setSources(prev => [...prev, addedSource]);
      closeAddEditModal();
      toast.success("Source Added", { description: `"${addedSource.name}" added successfully.` });
    } catch (error: unknown) {
      toast.error("Error Adding Source", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  const handleEditSource = async () => {
    if (!editingSource) return;
    if (!modalFormData.name || !modalFormData.url) {
      toast.error("Missing Information", { description: "Please enter both source name and URL." });
      return;
    }
    const urlErr = validateUrl(modalFormData.url);
    if (urlErr) { setUrlError(urlErr); return; }
    try {
      const response = await apiFetch(`/api/sources/${editingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalFormData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const updatedSource = await response.json();
      setSources(prev => prev.map(s => s.id === updatedSource.id ? updatedSource : s));
      closeAddEditModal();
      toast.success("Source Updated", { description: `"${updatedSource.name}" updated successfully.` });
    } catch (error: unknown) {
      toast.error("Error Updating Source", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  const handleDeleteSource = (id: number) => {
    setConfirmDialogAction('deleteSource');
    setConfirmDialogSourceId(id);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDeleteSource = async () => {
    if (confirmDialogSourceId === null) return;
    const id = confirmDialogSourceId;
    setIsConfirmDialogOpen(false);
    setConfirmDialogSourceId(null);
    try {
      const response = await apiFetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setSources(prev => prev.filter(s => s.id !== id));
      toast.success("Source Deleted");
    } catch (error: unknown) {
      toast.error("Error Deleting Source", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers — bulk actions
  // ---------------------------------------------------------------------------

  const handleToggleSelectSource = (id: number) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allIds = filteredSources.map(s => s.id);
    const allSelected = allIds.every(id => selectedSources.has(id));
    if (allSelected) {
      setSelectedSources(prev => { const next = new Set(prev); allIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelectedSources(prev => new Set([...prev, ...allIds]));
    }
  };

  const handleBulkToggleActive = async (active: boolean) => {
    if (selectedSources.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all([...selectedSources].map(id =>
        apiFetch(`/api/sources/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: active }),
        })
      ));
      await fetchSources();
      setSelectedSources(new Set());
      toast.success(`${active ? 'Activated' : 'Deactivated'} ${selectedSources.size} source(s)`);
    } catch (error: unknown) {
      toast.error('Bulk action failed', { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedSources.size === 0) return;
    setConfirmDialogAction('bulkDelete');
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsConfirmDialogOpen(false);
    setBulkActionLoading(true);
    try {
      await Promise.all([...selectedSources].map(id => apiFetch(`/api/sources/${id}`, { method: 'DELETE' })));
      const count = selectedSources.size;
      setSources(prev => prev.filter(s => !selectedSources.has(s.id)));
      setSelectedSources(new Set());
      toast.success(`Deleted ${count} source(s)`);
    } catch (error: unknown) {
      toast.error('Bulk delete failed', { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  const openAddModal = () => {
    setEditingSource(null);
    setModalFormData(emptyModalForm);
    setUrlError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setModalFormData({
      name: source.name,
      url: source.url,
      enable_ai_summary: source.enable_ai_summary,
      enable_ai_tags: source.enable_ai_tags,
      enable_ai_image: source.enable_ai_image,
      enable_ai_translations: source.enable_ai_translations,
      include_selectors: source.include_selectors,
      exclude_selectors: source.exclude_selectors,
      scraping_method: source.scraping_method || 'opensource',
      os_title_selector: source.os_title_selector,
      os_content_selector: source.os_content_selector,
      os_date_selector: source.os_date_selector,
      os_author_selector: source.os_author_selector,
      os_thumbnail_selector: source.os_thumbnail_selector,
      os_topics_selector: source.os_topics_selector,
      article_link_template: source.article_link_template,
      exclude_patterns: source.exclude_patterns,
      scrape_after_date: source.scrape_after_date ? new Date(source.scrape_after_date).toISOString().split('T')[0] : null,
    });
    setUrlError(null);
    setIsModalOpen(true);
  };

  const closeAddEditModal = () => {
    setIsModalOpen(false);
    setEditingSource(null);
    setModalFormData(emptyModalForm);
    setUrlError(null);
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingSource) { await handleEditSource(); } else { await handleAddSource(); }
  };

  // ---------------------------------------------------------------------------
  // Cron field helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      <Tabs defaultValue="overview" className="container mx-auto p-4">
        <TabsList className="w-full flex flex-nowrap overflow-x-auto">
          <TabsTrigger value="overview" className="flex-shrink-0">Overview & Stats</TabsTrigger>
          <TabsTrigger value="global" className="flex-shrink-0">Scraper Controls</TabsTrigger>
          <TabsTrigger value="scheduled" className="flex-shrink-0">Scheduled Tasks</TabsTrigger>
          <TabsTrigger value="sources" className="flex-shrink-0">Source Management</TabsTrigger>
        </TabsList>

        {/* ================================================================
            TAB 1 — Overview & Stats
        ================================================================ */}
        <TabsContent value="overview">
          <div className="space-y-6">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
                <p className="text-sm text-muted-foreground">
                  Overview of your news aggregation platform
                </p>
              </div>
              <div className="flex items-center gap-3">
                {statsLastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Updated {format(statsLastUpdated, 'MMM d, HH:mm:ss')}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={fetchStats} disabled={statsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {statsError && (
              <Alert variant="destructive">
                <AlertDescription>{statsError}</AlertDescription>
              </Alert>
            )}

            {/* KPI stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                  <CardDescription className="text-xs font-medium">Total Articles</CardDescription>
                  <Newspaper className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">
                      {(stats.totalArticles ?? 0).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                  <CardDescription className="text-xs font-medium">Total Sources</CardDescription>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold tracking-tight">
                        {stats.totalSources ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-emerald-500 font-medium">{activeSources} active</span>
                        {(stats.totalSources ?? 0) - activeSources > 0 && (
                          <span> / {(stats.totalSources ?? 0) - activeSources} inactive</span>
                        )}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                  <CardDescription className="text-xs font-medium">Avg. per Source</CardDescription>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">
                      {stats.totalSources && stats.totalArticles
                        ? Math.round(stats.totalArticles / stats.totalSources).toLocaleString()
                        : '0'}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                  <CardDescription className="text-xs font-medium">Years Covered</CardDescription>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-4">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <>
                      <div className="text-3xl font-bold tracking-tight">
                        {stats.articlesPerYear.length}
                      </div>
                      {stats.articlesPerYear.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.min(...stats.articlesPerYear.map(y => y.year))} &ndash; {Math.max(...stats.articlesPerYear.map(y => y.year))}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline chart — spans 2 cols */}
              <div className="lg:col-span-2">
                {statsLoading ? (
                  <Card className="h-full">
                    <CardHeader className="pt-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-56 mt-1" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[200px] w-full" />
                    </CardContent>
                  </Card>
                ) : (
                  <ArticlesTimelineChart data={stats.articlesPerYear || []} />
                )}
              </div>

              {/* Pie chart — 1 col */}
              <div>
                {statsLoading ? (
                  <Card className="h-full">
                    <CardHeader className="pt-4 items-center">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-3 w-32 mt-1" />
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      <Skeleton className="h-[180px] w-[180px] rounded-full" />
                    </CardContent>
                  </Card>
                ) : (
                  <SourceDistributionPieChart data={stats.articlesPerSource || []} />
                )}
              </div>
            </div>

            {/* AI Coverage radial charts */}
            {aiCoverage && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">AI Coverage</h3>
                  <p className="text-xs text-muted-foreground">Processing status based on per-source configuration</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <AiCoverageChart
                    label="Summaries"
                    value={aiCoverage.withSummary}
                    total={aiCoverage.total}
                    color="var(--chart-1)"
                    icon={<FileText className="h-3 w-3" />}
                  />
                  <AiCoverageChart
                    label="Tags"
                    value={aiCoverage.withTags}
                    total={aiCoverage.total}
                    color="var(--chart-2)"
                    icon={<Tag className="h-3 w-3" />}
                  />
                  <AiCoverageChart
                    label="Images"
                    value={aiCoverage.withImage}
                    total={aiCoverage.total}
                    color="var(--chart-4)"
                    icon={<Image className="h-3 w-3" />}
                  />
                  <AiCoverageChart
                    label="Translations"
                    value={aiCoverage.withTranslations}
                    total={aiCoverage.total}
                    color="var(--chart-5)"
                    icon={<Languages className="h-3 w-3" />}
                  />
                </div>
              </div>
            )}

            {/* Full bar chart */}
            {!statsLoading && (stats.articlesPerSource?.length ?? 0) > 0 && (
              <SourceBarChart data={stats.articlesPerSource} />
            )}

          </div>
        </TabsContent>

        {/* ================================================================
            TAB 2 — Scraper Controls
        ================================================================ */}
        <TabsContent value="global">
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
        </TabsContent>

        {/* ================================================================
            TAB 3 — Scheduled Tasks
        ================================================================ */}
        <TabsContent value="scheduled">
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
        </TabsContent>

        {/* ================================================================
            TAB 4 — Source Management
        ================================================================ */}
        <TabsContent value="sources">
          <Card className="mb-6 pt-4">
            <CardHeader>
              <div className="flex items-center justify-between pb-2">
                <CardTitle>Sources</CardTitle>
                <Button onClick={openAddModal} size="sm">Add New Source</Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Input
                  placeholder="Search by name or URL…"
                  value={sourceSearch}
                  onChange={e => setSourceSearch(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Select value={sourceFilterStatus} onValueChange={v => setSourceFilterStatus(v as 'all' | 'active' | 'inactive')}>
                  <SelectTrigger className="sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {sourcesLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : sourcesError ? (
                <Alert variant="destructive">
                  <AlertDescription>Error loading sources: {sourcesError instanceof Error ? sourcesError.message : 'An unknown error occurred'}</AlertDescription>
                </Alert>
              ) : sources.length === 0 ? (
                <div className="text-muted-foreground">No sources found.</div>
              ) : (
                <>
                  {/* Bulk toolbar */}
                  {filteredSources.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 p-2 rounded-md bg-muted/50">
                      <Checkbox
                        id="selectAll"
                        checked={filteredSources.length > 0 && filteredSources.every(s => selectedSources.has(s.id))}
                        onCheckedChange={handleSelectAllFiltered}
                      />
                      <Label htmlFor="selectAll" className="text-sm cursor-pointer">
                        {selectedSources.size > 0 ? `${selectedSources.size} selected` : 'Select all'}
                      </Label>
                      {selectedSources.size > 0 && (
                        <div className="flex gap-2 ml-2">
                          <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggleActive(true)}>
                            {bulkActionLoading ? '…' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggleActive(false)}>
                            {bulkActionLoading ? '…' : 'Deactivate'}
                          </Button>
                          <Button size="sm" variant="destructive" disabled={bulkActionLoading} onClick={handleBulkDelete}>
                            {bulkActionLoading ? '…' : 'Delete'}
                          </Button>
                        </div>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{filteredSources.length} of {sources.length} sources</span>
                    </div>
                  )}

                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSources.map(source => (
                      <Card key={source.id} className={`p-4 shadow-sm pt-4 flex flex-col ${selectedSources.has(source.id) ? 'ring-2 ring-primary' : ''}`}>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Checkbox
                                checked={selectedSources.has(source.id)}
                                onCheckedChange={() => handleToggleSelectSource(source.id)}
                              />
                              <Badge variant={source.is_active ? 'default' : 'secondary'} className="text-xs">
                                {source.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{source.scraping_method || 'opensource'}</Badge>
                              {sourceScrapeResult[source.id] && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                  {sourceScrapeResult[source.id]}
                                </Badge>
                              )}
                            </div>

                            {/* Name with tooltip for truncation */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CardTitle className="text-base font-medium truncate cursor-default">{source.name}</CardTitle>
                              </TooltipTrigger>
                              <TooltipContent side="top">{source.name}</TooltipContent>
                            </Tooltip>

                            <CardDescription className="text-xs truncate">
                              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {source.url}
                              </a>
                            </CardDescription>
                            <CardDescription className="text-xs mt-1">
                              {(articleCountMap.get(source.name) ?? 0).toLocaleString()} articles
                            </CardDescription>

                            {/* AI feature badges — always show all 4, dim disabled ones */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {([
                                { key: 'enable_ai_summary', label: 'Summary' },
                                { key: 'enable_ai_tags', label: 'Tags' },
                                { key: 'enable_ai_image', label: 'Image' },
                                { key: 'enable_ai_translations', label: 'Translations' },
                              ] as const).map(({ key, label }) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className={`text-xs ${source[key] ? '' : 'opacity-30'}`}
                                >
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="mt-2 md:mt-0 md:ml-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleTriggerScraperForSource(source.id)}
                                  disabled={sourceScrapingLoading[source.id]}
                                >
                                  {sourceScrapingLoading[source.id] ? 'Scraping…' : 'Scrape Now'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteArticlesForSource(source.id)}
                                  disabled={sourceArticleDeletionLoading[source.id]}
                                  className="text-red-600"
                                >
                                  {sourceArticleDeletionLoading[source.id] ? 'Deleting…' : 'Delete Articles'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditModal(source)}>Edit Source</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteSource(source.id)} className="text-red-600">
                                  Delete Source
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-border">
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <a href={`/settings/source/${source.id}`}>View Articles</a>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </ul>

                  {filteredSources.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No sources match your search.</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================
          Add / Edit Source Dialog
      ================================================================ */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingSource ? 'Edit Source' : 'Add New Source'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleModalSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">

                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="name">Source Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={modalFormData.name}
                    onChange={handleModalInputChange}
                    required
                    placeholder="e.g. BBC News"
                  />
                </div>

                {/* URL */}
                <div className="space-y-1">
                  <Label htmlFor="url">Source URL</Label>
                  <Input
                    id="url"
                    name="url"
                    value={modalFormData.url ?? ''}
                    onChange={handleModalInputChange}
                    required
                    placeholder="https://example.com/news"
                    className={urlError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                </div>

                {/* Scraping Method */}
                <div className="space-y-1">
                  <Label htmlFor="scraping_method">Scraping Method</Label>
                  <Select
                    value={modalFormData.scraping_method || 'opensource'}
                    onValueChange={value => setModalFormData(prev => ({ ...prev, scraping_method: value }))}
                  >
                    <SelectTrigger id="scraping_method">
                      <SelectValue placeholder="Select scraping method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opensource">Open Source (Puppeteer/Playwright)</SelectItem>
                      <SelectItem value="firecrawl">Firecrawl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Features — grouped */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">AI Features</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                    {([
                      { id: 'enable_ai_summary', label: 'Summary' },
                      { id: 'enable_ai_tags', label: 'Tags' },
                      { id: 'enable_ai_image', label: 'Image' },
                      { id: 'enable_ai_translations', label: 'Translations' },
                    ] as const).map(({ id, label }) => (
                      <div key={id} className="flex items-center space-x-2">
                        <Switch
                          id={id}
                          checked={modalFormData[id]}
                          onCheckedChange={checked => setModalFormData(prev => ({ ...prev, [id]: Boolean(checked) }))}
                        />
                        <Label htmlFor={id} className="text-sm font-normal cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Open Source Selectors */}
                {modalFormData.scraping_method === 'opensource' && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="selectors">
                      <AccordionTrigger className="text-sm font-medium">Open Source Selectors</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {([
                            { id: 'os_title_selector', label: 'Title Selector', placeholder: 'h1.article-title' },
                            { id: 'os_content_selector', label: 'Content Selector', placeholder: 'div.article-body' },
                            { id: 'os_date_selector', label: 'Date Selector', placeholder: 'time[datetime]' },
                            { id: 'os_author_selector', label: 'Author Selector', placeholder: 'span.author-name' },
                            { id: 'os_thumbnail_selector', label: 'Thumbnail Selector', placeholder: 'img.hero-image' },
                            { id: 'os_topics_selector', label: 'Topics Selector', placeholder: 'a.topic-tag, span.category' },
                          ] as const).map(({ id, label, placeholder }) => (
                            <div key={id} className="space-y-1">
                              <Label htmlFor={id} className="text-xs">{label}</Label>
                              <Input
                                id={id}
                                name={id}
                                value={modalFormData[id] ?? ''}
                                onChange={handleModalInputChange}
                                placeholder={placeholder}
                                className="font-mono text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {/* Advanced options */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-sm font-medium">Advanced Options</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <Label htmlFor="include_selectors" className="text-xs">Include Selectors <span className="text-muted-foreground">(comma-separated)</span></Label>
                          <Input
                            id="include_selectors"
                            name="include_selectors"
                            value={modalFormData.include_selectors ?? ''}
                            onChange={handleModalInputChange}
                            placeholder="article, .post-content"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="exclude_selectors" className="text-xs">Exclude Selectors <span className="text-muted-foreground">(comma-separated)</span></Label>
                          <Input
                            id="exclude_selectors"
                            name="exclude_selectors"
                            value={modalFormData.exclude_selectors ?? ''}
                            onChange={handleModalInputChange}
                            placeholder=".ad-banner, footer"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="article_link_template" className="text-xs">Article Link Template</Label>
                          <Input
                            id="article_link_template"
                            name="article_link_template"
                            value={modalFormData.article_link_template ?? ''}
                            onChange={handleModalInputChange}
                            placeholder="https://example.com/article/{slug}"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="exclude_patterns" className="text-xs">Exclude Patterns <span className="text-muted-foreground">(comma-separated query params)</span></Label>
                          <Input
                            id="exclude_patterns"
                            name="exclude_patterns"
                            value={modalFormData.exclude_patterns ?? ''}
                            onChange={handleModalInputChange}
                            placeholder="utm_source, ref, page"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="scrape_after_date" className="text-xs">Scrape Articles After Date</Label>
                          <Input
                            id="scrape_after_date"
                            name="scrape_after_date"
                            type="date"
                            value={modalFormData.scrape_after_date ?? ''}
                            onChange={handleModalInputChange}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

              </div>

              {/* Sticky footer */}
              <DialogFooter className="flex-shrink-0 pt-4 border-t border-border mt-2">
                <Button type="button" onClick={closeAddEditModal} variant="outline">Cancel</Button>
                <Button type="submit">{editingSource ? 'Save Changes' : 'Add Source'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ================================================================
          Confirmation Dialog
      ================================================================ */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogAction === 'purgeAll' && (
                <>Are you sure you want to delete <strong>ALL articles</strong>? This action cannot be undone.</>
              )}
              {confirmDialogAction === 'deleteSourceArticles' && (
                <>Are you sure you want to delete all articles for this source? This action cannot be undone.</>
              )}
              {confirmDialogAction === 'deleteSource' && (
                <>Are you sure you want to delete this source? This action cannot be undone.</>
              )}
              {confirmDialogAction === 'bulkDelete' && (
                <>Are you sure you want to delete <strong>{selectedSources.size} selected source(s)</strong>? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDialogAction === 'purgeAll') handleConfirmPurgeArticles();
                else if (confirmDialogAction === 'deleteSourceArticles') handleConfirmDeleteArticlesForSource();
                else if (confirmDialogAction === 'deleteSource') handleConfirmDeleteSource();
                else if (confirmDialogAction === 'bulkDelete') handleConfirmBulkDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </TooltipProvider>
  );
};

export default SettingsPage;
