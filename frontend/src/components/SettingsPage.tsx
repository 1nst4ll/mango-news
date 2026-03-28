import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ArticlesPerSourceBarChart } from "./charts/ArticlesPerSourceBarChart";
import { ArticlesPerYearBarChart } from "./charts/ArticlesPerYearAreaChart";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { MoreHorizontal, RefreshCw, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** Parse a 5-field cron expression into a human-readable string. */
function parseCron(expr: string): string {
  if (!expr) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Custom schedule';
  const [min, hour, dom, month, dow] = parts;

  // Common patterns
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
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayNames = dow.split(',').map(d => days[parseInt(d)] ?? d).join(', ');
    return `Every ${dayNames} at ${hour.padStart(2, '0')}:00`;
  }
  if (min === '0' && hour !== '*' && dom !== '*' && month === '*' && dow === '*') {
    return `Monthly on day ${dom} at ${hour.padStart(2, '0')}:00`;
  }
  return 'Custom schedule';
}




// Interfaces from admin/page.tsx
interface ArticleStats {
  totalArticles: number | null;
  totalSources: number | null;
  articlesPerSource: { source_name: string; article_count: number }[];
  articlesPerYear: { year: number; article_count: number }[];
}

// Interfaces from admin/sources/page.tsx
interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean; // Add enable_ai_tags field
  enable_ai_image: boolean; // Add enable_ai_image field
  enable_ai_translations: boolean; // Add enable_ai_translations field
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null; // Add article link template
  exclude_patterns: string | null; // Add exclude patterns
  scrape_after_date: string | null; // Add scrape_after_date field
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


const SettingsPage: React.FC = () => {

  // State for Scheduled Tasks
  const [mainScraperFrequency, setMainScraperFrequency] = useState<string>('0 * * * *');
  const [missingAiFrequency, setMissingAiFrequency] = useState<string>('*/20 * * * *');
  const [enableScheduledMissingSummary, setEnableScheduledMissingSummary] = useState<boolean>(true);
  const [enableScheduledMissingTags, setEnableScheduledMissingTags] = useState<boolean>(true);
  const [enableScheduledMissingImage, setEnableScheduledMissingImage] = useState<boolean>(true);
  const [enableScheduledMissingTranslations, setEnableScheduledMissingTranslations] = useState<boolean>(true);
  const [sundayEditionFrequency, setSundayEditionFrequency] = useState<string>('0 0 * * 0'); // New state for Sunday Edition frequency
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);


  // State from admin/page.tsx
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [sundayEditionLoading, setSundayEditionLoading] = useState<boolean>(false); // New state for Sunday edition generation
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(true);
  const [enableGlobalAiTags, setEnableGlobalAiTags] = useState<boolean>(true);
  const [enableGlobalAiImage, setEnableGlobalAiImage] = useState<boolean>(true);
  const [enableGlobalAiTranslations, setEnableGlobalAiTranslations] = useState<boolean>(true); // New state for global AI translations
  const [stats, setStats] = useState<ArticleStats>({ totalArticles: null, totalSources: null, articlesPerSource: [], articlesPerYear: [] });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // State from admin/sources/page.tsx
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(true);
  const [sourcesError, setSourcesError] = useState<unknown>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceScrapingStatus, setSourceScrapingStatus] = useState<{ [key: number]: string | null }>({});
  const [sourceScrapingLoading, setSourceScrapingLoading] = useState<{ [key: number]: boolean }>({});
  const [sourceArticleDeletionStatus, setSourceArticleDeletionStatus] = useState<{ [key: number]: string | null }>({});
  const [sourceArticleDeletionLoading, setSourceArticleDeletionLoading] = useState<{ [key: number]: boolean }>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState<ModalFormData>({
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
});

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'purgeAll' | 'deleteSourceArticles' | 'deleteSource' | 'bulkDelete' | null>(null);
  const [confirmDialogSourceId, setConfirmDialogSourceId] = useState<number | null>(null);

  // Stats refresh
  const [statsLastUpdated, setStatsLastUpdated] = useState<Date | null>(null);

  // Source scrape result badges
  const [sourceScrapeResult, setSourceScrapeResult] = useState<{ [key: number]: string | null }>({});

  // Source search/filter
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceFilterStatus, setSourceFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Bulk actions
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Effects for fetching scheduler settings
  useEffect(() => {
    const fetchSchedulerSettings = async () => {
      try {
        const response = await apiFetch('/api/settings/scheduler');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMainScraperFrequency(data.main_scraper_frequency);
        setMissingAiFrequency(data.missing_ai_frequency);
        setEnableScheduledMissingSummary(data.enable_scheduled_missing_summary);
        setEnableScheduledMissingTags(data.enable_scheduled_missing_tags);
        setEnableScheduledMissingImage(data.enable_scheduled_missing_image);
        setEnableScheduledMissingTranslations(data.enable_scheduled_missing_translations);
        setSundayEditionFrequency(data.sunday_edition_frequency); // Fetch Sunday Edition frequency
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast.error("Error Loading Schedule Settings", {
          description: errorMessage,
        });
      }
    };

    fetchSchedulerSettings();
  }, []);

  // Effects from admin/page.tsx
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSummaryToggle = localStorage.getItem('enableGlobalAiSummary');
      if (savedSummaryToggle !== null) {
        setEnableGlobalAiSummary(JSON.parse(savedSummaryToggle));
      }
      const savedTagsToggle = localStorage.getItem('enableGlobalAiTags');
      if (savedTagsToggle !== null) {
        setEnableGlobalAiTags(JSON.parse(savedTagsToggle));
      }
      const savedImageToggle = localStorage.getItem('enableGlobalAiImage');
      if (savedImageToggle !== null) {
        setEnableGlobalAiImage(JSON.parse(savedImageToggle));
      }
    }

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const response = await apiFetch('/api/stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ArticleStats = await response.json();
        setStats(data);
        setStatsLastUpdated(new Date());
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching stats.';
        setStatsError(errorMessage);
        toast.error("Error Fetching Stats", {
          description: errorMessage,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiSummary', JSON.stringify(enableGlobalAiSummary));
    }
  }, [enableGlobalAiSummary]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiTags', JSON.stringify(enableGlobalAiTags));
    }
  }, [enableGlobalAiTags]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiImage', JSON.stringify(enableGlobalAiImage));
    }
  }, [enableGlobalAiImage]);

  // New effect for global AI translations toggle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableGlobalAiTranslations');
      if (saved !== null) {
        setEnableGlobalAiTranslations(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiTranslations', JSON.stringify(enableGlobalAiTranslations));
    }
  }, [enableGlobalAiTranslations]);

  // Effects from admin/sources/page.tsx
  const fetchSources = async () => {
    try {
      const response = await apiFetch('/api/sources');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSources(data.map((source: Source) => ({
        ...source,
        enable_ai_summary: source.enable_ai_summary !== undefined ? source.enable_ai_summary : true,
        enable_ai_tags: source.enable_ai_tags !== undefined ? source.enable_ai_tags : true,
        enable_ai_translations: source.enable_ai_translations !== undefined ? source.enable_ai_translations : true,
        is_active: source.is_active !== undefined ? source.is_active : true,
        include_selectors: source.include_selectors !== undefined ? source.include_selectors : null,
        exclude_selectors: source.exclude_selectors !== undefined ? source.exclude_selectors : null,
        scraping_method: source.scraping_method !== undefined ? source.scraping_method : 'opensource',
        os_title_selector: source.os_title_selector !== undefined ? source.os_title_selector : null,
        os_content_selector: source.os_content_selector !== undefined ? source.os_content_selector : null,
        os_date_selector: source.os_date_selector !== undefined ? source.os_date_selector : null,
        os_author_selector: source.os_author_selector !== undefined ? source.os_author_selector : null,
        os_thumbnail_selector: source.os_thumbnail_selector !== undefined ? source.os_thumbnail_selector : null,
        os_topics_selector: source.os_topics_selector !== undefined ? source.os_topics_selector : null,
        article_link_template: source.article_link_template !== undefined ? source.article_link_template : null,
        exclude_patterns: source.exclude_patterns !== undefined ? source.exclude_patterns : null,
      })));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching sources.';
      setSourcesError(error);
      toast.error("Error Fetching Sources", {
        description: errorMessage,
      });
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // Handlers from admin/page.tsx
  const handleTriggerScraper = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/scrape/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper');
      }
      toast.success("Scraper Triggered", {
        description: data.message || 'Scraper triggered successfully. Check backend logs for progress.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during scraping.';
      toast.error("Scraper Error", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
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
      const response = await apiFetch('/api/articles/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purge articles');
      }
      toast.success("Articles Purged", {
        description: data.message || 'All articles purged successfully.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during purging.';
      toast.error("Purge Error", {
        description: errorMessage,
      });
    } finally {
      setPurgeLoading(false);
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
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Sunday edition');
      }
      toast.success("Sunday Edition Generated", {
        description: data.message || 'Sunday edition generated successfully.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Sunday edition generation.';
      toast.error("Sunday Edition Error", {
        description: errorMessage,
      });
    } finally {
      setSundayEditionLoading(false);
    }
  };

  const handleTriggerScraperForSource = async (sourceId: number) => {
    setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      const response = await apiFetch(`/api/scrape/run/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to trigger scraper for source ${sourceId}`);
      }
      setSourceScrapeResult(prev => ({ ...prev, [sourceId]: `+${data.articlesAdded ?? 0} articles` }));
      toast.success("Source Scrape Triggered", {
        description: `${data.message}. Found ${data.linksFound} potential article links, added ${data.articlesAdded} new articles.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during scraping.';
      toast.error("Source Scrape Error", {
        description: errorMessage,
      });
    } finally {
      setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  const handleDeleteArticlesForSource = (sourceId: number) => {
    setConfirmDialogAction('deleteSourceArticles');
    setConfirmDialogSourceId(sourceId);
    setIsConfirmDialogOpen(true);
  };


  // Handler to block a source from scraping
  const handleBlockSource = async (sourceId: number) => {
    try {
      const response = await apiFetch(`/api/sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchSources();

      toast.success("Source Blocked", {
        description: `Source ${sourceId} blocked successfully.`,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast.error("Error Blocking Source", {
        description: errorMessage,
      });
    }
  };

  const handleSaveScheduleSettings = async () => {
    setSavingSchedule(true);
    try {
      const response = await apiFetch('/api/settings/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_scraper_frequency: mainScraperFrequency,
          missing_ai_frequency: missingAiFrequency,
          enable_scheduled_missing_summary: enableScheduledMissingSummary,
          enable_scheduled_missing_tags: enableScheduledMissingTags,
          enable_scheduled_missing_image: enableScheduledMissingImage,
          enable_scheduled_missing_translations: enableScheduledMissingTranslations,
          sunday_edition_frequency: sundayEditionFrequency, // Add this line
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error || 'Failed to save schedule settings');
      }
      toast.success("Schedule Settings Saved", {
        description: res.message || 'Scheduler settings updated successfully.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while saving schedule settings.';
      toast.error("Error Saving Schedule Settings", {
        description: errorMessage,
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleConfirmDeleteArticlesForSource = async () => {
    if (confirmDialogSourceId === null) return;

    const sourceId = confirmDialogSourceId;
    setIsConfirmDialogOpen(false);
    setConfirmDialogSourceId(null);

    setSourceArticleDeletionLoading(prev => ({ ...prev, [sourceId]: true }));
    setSourceArticleDeletionStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      const response = await apiFetch(`/api/articles/purge/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to delete articles for source ${sourceId}`);
      }
      toast.success("Articles Purged for Source", {
        description: data.message || `All articles for source ${sourceId} purged successfully.`,
      });
      // Optionally refetch stats after deletion
      // fetchStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during article deletion.';
      toast.error("Article Deletion Error", {
        description: errorMessage,
      });
    } finally {
      setSourceArticleDeletionLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  // Handlers from admin/sources/page.tsx
  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setModalFormData({
      ...modalFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAddSource = async () => {
    if (!modalFormData.name || !modalFormData.url) {
      toast.error("Missing Information", {
        description: "Please enter both source name and URL.",
      });
      return;
    }
    try {
      const response = await apiFetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalFormData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const addedSource = await response.json();
      setSources([...sources, addedSource]);
      closeAddEditModal();
      toast.success("Source Added", {
        description: `Source "${addedSource.name}" added successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error("Error Adding Source", {
        description: errorMessage,
      });
    }
  };

  const handleEditSource = async () => {
    if (!editingSource) return;

    if (!modalFormData.name || !modalFormData.url) {
      toast.error("Missing Information", {
        description: "Please enter both source name and URL.",
      });
      return;
    }

    try {
      const response = await apiFetch(`/api/sources/${editingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalFormData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const updatedSource = await response.json();
      setSources(sources.map(source => source.id === updatedSource.id ? updatedSource : source));
      closeAddEditModal();
      toast.success("Source Updated", {
        description: `Source "${updatedSource.name}" updated successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error("Error Updating Source", {
        description: errorMessage,
      });
    }
  };

  const handleDeleteSource = async (id: number) => {
    // Use the confirmation dialog instead of window.confirm
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
      const response = await apiFetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setSources(sources.filter(source => source.id !== id));
      toast.success("Source Deleted", {
        description: `Source ${id} deleted successfully.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while deleting the source.';
      toast.error("Error Deletion Source", {
        description: errorMessage,
      });
    }
  };


  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      const matchesSearch = source.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        source.url.toLowerCase().includes(sourceSearch.toLowerCase());
      const matchesStatus =
        sourceFilterStatus === 'all' ||
        (sourceFilterStatus === 'active' && source.is_active) ||
        (sourceFilterStatus === 'inactive' && !source.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [sources, sourceSearch, sourceFilterStatus]);

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
      setSelectedSources(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.delete(id));
        return next;
      });
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
      const msg = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error('Bulk action failed', { description: msg });
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
      await Promise.all([...selectedSources].map(id =>
        apiFetch(`/api/sources/${id}`, { method: 'DELETE' })
      ));
      setSources(prev => prev.filter(s => !selectedSources.has(s.id)));
      const count = selectedSources.size;
      setSelectedSources(new Set());
      toast.success(`Deleted ${count} source(s)`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error('Bulk delete failed', { description: msg });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingSource(null);
    setModalFormData({
      name: '',
      url: '',
      enable_ai_summary: true,
      enable_ai_tags: true, // Initialize enable_ai_tags field
      enable_ai_image: true, // Initialize enable_ai_image field
      enable_ai_translations: true, // Initialize enable_ai_translations field
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: null, // Set default content selector
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
      article_link_template: null, // Initialize new field
      exclude_patterns: null, // Initialize new field
      scrape_after_date: null, // Initialize new field
    });
    setIsModalOpen(true);
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setModalFormData({
      name: source.name,
      url: source.url,
      enable_ai_summary: source.enable_ai_summary,
      enable_ai_tags: source.enable_ai_tags, // Populate from source
      enable_ai_image: source.enable_ai_image, // Populate from source
      enable_ai_translations: source.enable_ai_translations, // Populate from source
      include_selectors: source.include_selectors,
      exclude_selectors: source.exclude_selectors,
      scraping_method: source.scraping_method || 'opensource',
      os_title_selector: source.os_title_selector,
      os_content_selector: source.os_content_selector,
      os_date_selector: source.os_date_selector,
      os_author_selector: source.os_author_selector,
      os_thumbnail_selector: source.os_thumbnail_selector,
      os_topics_selector: source.os_topics_selector,
      article_link_template: source.article_link_template, // Populate from source
      exclude_patterns: source.exclude_patterns, // Populate from source
      scrape_after_date: source.scrape_after_date ? new Date(source.scrape_after_date).toISOString().split('T')[0] : null, // Populate from source and format
    });
    setIsModalOpen(true);
  };

  const closeAddEditModal = () => {
    setIsModalOpen(false);
    setEditingSource(null);
    setModalFormData({
      name: '',
      url: '',
      enable_ai_summary: true,
      enable_ai_tags: true, // Reset new field
      enable_ai_image: true, // Reset new field
      enable_ai_translations: true, // Reset new field
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: null, // Reset default content selector
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
      article_link_template: null, // Reset new field
      exclude_patterns: null, // Reset new field
      scrape_after_date: null, // Reset new field
    });
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingSource) {
      await handleEditSource();
    } else {
      await handleAddSource();
    }
  };


  return (
    <Tabs defaultValue="overview" className="container mx-auto p-4">
      <TabsList className="w-full flex flex-nowrap overflow-x-auto"> {/* Removed grid classes, added flex and overflow-x-auto */}
        <TabsTrigger value="overview" className="flex-shrink-0">Overview & Stats</TabsTrigger>
        <TabsTrigger value="global" className="flex-shrink-0">Global Settings & Actions</TabsTrigger>
        <TabsTrigger value="scheduled" className="flex-shrink-0">Scheduled Tasks</TabsTrigger>
        <TabsTrigger value="sources" className="flex-shrink-0">Source Management</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card className="mb-6 pt-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Database</CardTitle>
            <div className="flex items-center gap-3">
              {statsLastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {statsLastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatsLoading(true);
                  setStatsError(null);
                  apiFetch('/api/stats')
                    .then(r => r.json())
                    .then((data: ArticleStats) => { setStats(data); setStatsLastUpdated(new Date()); })
                    .catch((err: unknown) => setStatsError(err instanceof Error ? err.message : 'Error'))
                    .finally(() => setStatsLoading(false));
                }}
                disabled={statsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Dashboard Statistics and Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <div className="grid grid-cols-1 gap-4 lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
                    <div>
                      <CardDescription>Total Articles</CardDescription>
                      <CardTitle className="text-2xl">
                        {statsLoading ? (
                          <span>Loading...</span>
                        ) : statsError ? (
                          <span className="text-red-500">{statsError}</span>
                        ) : (
                          <span>{stats.totalArticles !== null ? stats.totalArticles : 'N/A'}</span>
                        )}
                      </CardTitle>
                    </div>
                    <img src="/file.svg" alt="Articles Icon" className="w-8 h-8 text-gray-500" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {/* Additional content if needed */}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
                    <div>
                      <CardDescription>Total Sources</CardDescription>
                      <CardTitle className="text-2xl">
                        {statsLoading ? (
                          <span>Loading...</span>
                        ) : statsError ? (
                          <span className="text-red-500">{statsError}</span>
                        ) : (
                          <span>{stats.totalSources !== null ? stats.totalSources : 'N/A'}</span>
                        )}
                      </CardTitle>
                    </div>
                    <img src="/globe.svg" alt="Sources Icon" className="w-8 h-8 text-gray-500" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {/* Additional content if needed */}
                  </CardContent>
                </Card>
              </div>
              {/* Articles per Source Chart */}
              <div className="lg:col-span-2">
                <ArticlesPerSourceBarChart data={stats.articlesPerSource || []} />
              </div>
              {/* Articles per Year Chart */}
              <div className="lg:col-span-2">
                <ArticlesPerYearBarChart data={stats.articlesPerYear || []} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="global">
        <div className="space-y-6">
          {/* Manual Scrape Options */}
          <Card className="pt-4">
            <CardHeader>
              <CardTitle className="pb-2">Manual Scrape Options</CardTitle>
              <CardDescription>These toggles apply only to the next manual scrape triggered below.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch id="enableGlobalAiSummary" checked={enableGlobalAiSummary} onCheckedChange={(checked: boolean) => setEnableGlobalAiSummary(checked)} />
                  <Label htmlFor="enableGlobalAiSummary">Generate AI Summaries</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="enableGlobalAiTags" checked={enableGlobalAiTags} onCheckedChange={(checked: boolean) => setEnableGlobalAiTags(checked)} />
                  <Label htmlFor="enableGlobalAiTags">Generate AI Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="enableGlobalAiImage" checked={enableGlobalAiImage} onCheckedChange={(checked: boolean) => setEnableGlobalAiImage(checked)} />
                  <Label htmlFor="enableGlobalAiImage">Generate AI Images</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="enableGlobalAiTranslations" checked={enableGlobalAiTranslations} onCheckedChange={(checked: boolean) => setEnableGlobalAiTranslations(checked)} />
                  <Label htmlFor="enableGlobalAiTranslations">Generate AI Translations</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-3 pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleTriggerScraper} disabled={loading}>
                      {loading ? 'Triggering...' : 'Run Scraper'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Triggers a full scrape run for all active sources.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={handleGenerateSundayEdition} disabled={sundayEditionLoading} variant="outline">
                {sundayEditionLoading ? 'Generating...' : 'Generate Sunday Edition'}
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
                  {purgeLoading ? 'Purging...' : 'Purge All'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="scheduled">
        <Card className="mb-6 pt-4">
          <CardHeader>
            <CardTitle className="pb-4">Scheduled Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Scraper Schedule */}
              <div>
                <h5 className="text-md font-semibold mb-2">Main Scraper Schedule</h5>
                <div className="grid gap-2">
                  <Label htmlFor="mainScraperFrequency">Cron Schedule:</Label>
                  <Input
                    id="mainScraperFrequency"
                    name="mainScraperFrequency"
                    value={mainScraperFrequency}
                    onChange={(e) => setMainScraperFrequency(e.target.value)}
                    placeholder="e.g., 0 * * * *"
                  />
                  <p className="text-sm text-muted-foreground">{parseCron(mainScraperFrequency)} &mdash; <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cron Helper</a></p>
                </div>
              </div>

              {/* Missing AI Data Processor Schedule */}
              <div>
                <h5 className="text-md font-semibold mb-2">Missing AI Data Processor Schedule</h5>
                <div className="grid gap-2">
                  <Label htmlFor="missingAiFrequency">Cron Schedule:</Label>
                  <Input
                    id="missingAiFrequency"
                    name="missingAiFrequency"
                    value={missingAiFrequency}
                    onChange={(e) => setMissingAiFrequency(e.target.value)}
                    placeholder="e.g., */20 * * * *"
                  />
                  <p className="text-sm text-muted-foreground">{parseCron(missingAiFrequency)} &mdash; <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cron Helper</a></p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableScheduledMissingSummary"
                      checked={enableScheduledMissingSummary}
                      onCheckedChange={(checked: boolean) => setEnableScheduledMissingSummary(checked)}
                    />
                    <Label htmlFor="enableScheduledMissingSummary">
                      Process Missing Summaries
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableScheduledMissingTags"
                      checked={enableScheduledMissingTags}
                      onCheckedChange={(checked: boolean) => setEnableScheduledMissingTags(checked)}
                    />
                    <Label htmlFor="enableScheduledMissingTags">
                      Process Missing Tags
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableScheduledMissingImage"
                      checked={enableScheduledMissingImage}
                      onCheckedChange={(checked: boolean) => setEnableScheduledMissingImage(checked)}
                    />
                    <Label htmlFor="enableScheduledMissingImage">
                      Process Missing Images
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableScheduledMissingTranslations"
                      checked={enableScheduledMissingTranslations}
                      onCheckedChange={(checked: boolean) => setEnableScheduledMissingTranslations(checked)}
                    />
                    <Label htmlFor="enableScheduledMissingTranslations">
                      Process Missing Translations
                    </Label>
                  </div>
                </div>
              </div>

              {/* Sunday Edition Schedule */}
              <div>
                <h5 className="text-md font-semibold mb-2">Sunday Edition Schedule</h5>
                <div className="grid gap-2">
                  <Label htmlFor="sundayEditionFrequency">Cron Schedule:</Label>
                  <Input
                    id="sundayEditionFrequency"
                    name="sundayEditionFrequency"
                    value={sundayEditionFrequency}
                    onChange={(e) => setSundayEditionFrequency(e.target.value)}
                    placeholder="e.g., 0 0 * * 0"
                  />
                  <p className="text-sm text-muted-foreground">{parseCron(sundayEditionFrequency)} &mdash; <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cron Helper</a></p>
                </div>
              </div>
            </div>
          </CardContent>
         <CardFooter className="pt-4">
           <Button onClick={handleSaveScheduleSettings} disabled={savingSchedule}>
             {savingSchedule ? 'Saving...' : 'Save Schedule Settings'}
           </Button>
         </CardFooter>
        </Card>
      </TabsContent>


      <TabsContent value="sources">
        <Card className="mb-6 pt-4">
          <CardHeader>
            <div className="flex items-center justify-between pb-2">
              <CardTitle>Sources</CardTitle>
              <Button onClick={openAddModal} size="sm">Add New Source</Button>
            </div>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Input
                placeholder="Search by name or URL..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={sourceFilterStatus} onValueChange={(v) => setSourceFilterStatus(v as 'all' | 'active' | 'inactive')}>
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
              <div>Loading sources...</div>
            ) : sourcesError ? (
              <div className="text-red-500">Error loading sources: {sourcesError instanceof Error ? sourcesError.message : 'An unknown error occurred'}</div>
            ) : sources.length === 0 ? (
              <div className="text-gray-600">No sources found.</div>
            ) : (
              <>
                {/* Bulk action toolbar */}
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
                        <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggleActive(true)}>Activate</Button>
                        <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={() => handleBulkToggleActive(false)}>Deactivate</Button>
                        <Button size="sm" variant="destructive" disabled={bulkActionLoading} onClick={handleBulkDelete}>Delete</Button>
                      </div>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{filteredSources.length} of {sources.length} sources</span>
                  </div>
                )}

                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSources.map((source) => (
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
                          <CardTitle className="text-base font-medium truncate">{source.name}</CardTitle>
                          <CardDescription className="text-xs truncate">
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" aria-label={`Open ${source.name} URL in new tab`}>{source.url}</a>
                          </CardDescription>
                          <CardDescription className="text-xs mt-1">
                            {stats.articlesPerSource.find(s => s.source_name === source.name)?.article_count || 0} articles
                          </CardDescription>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {source.enable_ai_summary && <Badge variant="outline" className="text-xs">Summary</Badge>}
                            {source.enable_ai_tags && <Badge variant="outline" className="text-xs">Tags</Badge>}
                            {source.enable_ai_image && <Badge variant="outline" className="text-xs">Image</Badge>}
                            {source.enable_ai_translations && <Badge variant="outline" className="text-xs">Translations</Badge>}
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
                                {sourceScrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteArticlesForSource(source.id)}
                                disabled={sourceArticleDeletionLoading[source.id]}
                                className="text-red-600"
                              >
                                {sourceArticleDeletionLoading[source.id] ? 'Deleting...' : 'Delete Articles'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditModal(source)}>
                                Edit Source
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteSource(source.id)}
                                className="text-red-600"
                              >
                                Delete Source
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-200">
                        <Button
                          onClick={() => window.location.href = `/settings/source/${source.id}`}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          View Articles
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


      {/* Add/Edit Source Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px] md:max-w-xl lg:max-w-2xl overflow-y-scroll max-h-[80vh] dialog-scrollable-content">
            <DialogHeader>
              <DialogTitle>{editingSource ? 'Edit Source' : 'Add New Source'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleModalSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="name" className="md:text-right">
                  Source Name:
                </Label>
                <Input id="name" name="name" value={modalFormData.name} onChange={handleModalInputChange} required className="md:col-span-3" />
              </div>
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="url" className="md:text-right">
                  Source URL:
                </Label>
                <Input id="url" name="url" value={modalFormData.url} onChange={handleModalInputChange} required className="md:col-span-3" />
              </div>
              {/* New: Scraping Method Select */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="scraping_method" className="md:text-right">Scraping Method:</Label>
                <Select
                  value={modalFormData.scraping_method || 'opensource'}
                  onValueChange={(value: string) => setModalFormData({ ...modalFormData, scraping_method: value })}
                >
                  <SelectTrigger className="md:col-span-3">
                    <SelectValue placeholder="Select scraping method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opensource">Open Source (Puppeteer/Playwright)</SelectItem>
                    <SelectItem value="firecrawl">Firecrawl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center"> {/* Adjusted layout */}
                <Label htmlFor="enable_ai_summary" className="md:text-right">Enable AI Summary:</Label> {/* Adjusted label */}
                 <Switch
                  id="enable_ai_summary"
                  name="enable_ai_summary"
                  checked={modalFormData.enable_ai_summary}
                  onCheckedChange={(checked) => setModalFormData({ ...modalFormData, enable_ai_summary: Boolean(checked) })}
                  className="md:col-span-3" // Adjusted layout
                />
              </div>
              {/* New: Enable AI Tags Toggle */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="enable_ai_tags" className="md:text-right">Enable AI Tags:</Label>
                <Switch
                  id="enable_ai_tags"
                  name="enable_ai_tags"
                  checked={modalFormData.enable_ai_tags}
                  onCheckedChange={(checked) => setModalFormData({ ...modalFormData, enable_ai_tags: Boolean(checked) })}
                  className="md:col-span-3"
                />
              </div>
              {/* New: Enable AI Image Toggle */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="enable_ai_image" className="md:text-right">Enable AI Image:</Label>
                <Switch
                  id="enable_ai_image"
                  name="enable_ai_image"
                  checked={modalFormData.enable_ai_image}
                  onCheckedChange={(checked) => setModalFormData({ ...modalFormData, enable_ai_image: Boolean(checked) })}
                  className="md:col-span-3"
                />
              </div>
              {/* Enable AI Translations Toggle */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="enable_ai_translations" className="md:text-right">Enable AI Translations:</Label>
                <Switch
                  id="enable_ai_translations"
                  name="enable_ai_translations"
                  checked={modalFormData.enable_ai_translations}
                  onCheckedChange={(checked) => setModalFormData({ ...modalFormData, enable_ai_translations: Boolean(checked) })}
                  className="md:col-span-3"
                />
              </div>
              {/* Specific Open Source Selectors (Accordion) */}
              {modalFormData.scraping_method === 'opensource' && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-md font-semibold">Open Source Selectors</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                          <Label htmlFor="os_title_selector" className="md:text-right">Title Selector:</Label>
                          <Input id="os_title_selector" name="os_title_selector" value={modalFormData.os_title_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                          <Label htmlFor="os_content_selector" className="md:text-right">Content Selector:</Label>
                          <Input id="os_content_selector" name="os_content_selector" value={modalFormData.os_content_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                          <Label htmlFor="os_date_selector" className="md:text-right">Date Selector:</Label>
                          <Input id="os_date_selector" name="os_date_selector" value={modalFormData.os_date_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                          <Label htmlFor="os_author_selector" className="md:text-right">Author Selector:</Label>
                          <Input id="os_author_selector" name="os_author_selector" value={modalFormData.os_author_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                          <Label htmlFor="os_thumbnail_selector" className="md:text-right">Thumbnail Selector:</Label>
                          <Input id="os_thumbnail_selector" name="os_thumbnail_selector" value={modalFormData.os_thumbnail_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                          <Label htmlFor="os_topics_selector" className="md:text-right">Topics Selector (comma-separated):</Label>
                          <Input id="os_topics_selector" name="os_topics_selector" value={modalFormData.os_topics_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {/* Existing Include/Exclude Selectors */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="include_selectors" className="md:text-right">Include Selectors (comma-separated):</Label>
                <Input id="include_selectors" name="include_selectors" value={modalFormData.include_selectors || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="exclude_selectors" className="md:text-right">Exclude Selectors (comma-separated):</Label>
                <Input id="exclude_selectors" name="exclude_selectors" value={modalFormData.exclude_selectors || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              {/* New: Article Link Template */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="article_link_template" className="md:text-right">Article Link Template:</Label>
                <Input id="article_link_template" name="article_link_template" value={modalFormData.article_link_template || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              {/* New: Exclude Patterns */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="exclude_patterns" className="md:text-right">Exclude Patterns (comma-separated query params):</Label>
                <Input id="exclude_patterns" name="exclude_patterns" value={modalFormData.exclude_patterns || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              {/* New: Scrape After Date Input */}
              <div className="grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="scrape_after_date" className="md:text-right">Scrape Articles After Date:</Label>
                <Input
                  id="scrape_after_date"
                  name="scrape_after_date"
                  type="date" // Use type="date" for a date picker
                  value={modalFormData.scrape_after_date || ''}
                  onChange={handleModalInputChange}
                  className="md:col-span-3"
                />
              </div>
              <DialogFooter>
                <Button type="submit">{editingSource ? 'Save Changes' : 'Add Source'}</Button>
                <Button type="button" onClick={closeAddEditModal} variant="outline">Cancel</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div>
            {confirmDialogAction === 'purgeAll' && (
              <p>Are you sure you want to delete ALL articles? This action cannot be undone.</p>
            )}
            {confirmDialogAction === 'deleteSourceArticles' && (
              <p>Are you sure you want to delete ALL articles for this source? This action cannot be undone.</p>
            )}
            {confirmDialogAction === 'deleteSource' && (
              <p>Are you sure you want to delete this source? This action cannot be undone.</p>
            )}
            {confirmDialogAction === 'bulkDelete' && (
              <p>Are you sure you want to delete {selectedSources.size} selected source(s)? This action cannot be undone.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsConfirmDialogOpen(false)} variant="outline">Cancel</Button>
            <Button
              onClick={() => {
                if (confirmDialogAction === 'purgeAll') {
                  handleConfirmPurgeArticles();
                } else if (confirmDialogAction === 'deleteSourceArticles') {
                  handleConfirmDeleteArticlesForSource();
                } else if (confirmDialogAction === 'deleteSource') {
                  handleConfirmDeleteSource();
                } else if (confirmDialogAction === 'bulkDelete') {
                  handleConfirmBulkDelete();
                }
              }}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Tabs>
  );

};

export default SettingsPage;
