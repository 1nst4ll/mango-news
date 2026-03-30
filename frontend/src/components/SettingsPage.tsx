import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../lib/api';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  type Source,
  type ModalFormData,
  type SundayEditionAdmin,
  type ArticleStats,
  emptyModalForm,
  validateCron,
} from './settings/types';
import { Skeleton } from "./ui/skeleton";

const OverviewStats = React.lazy(() => import('./settings/OverviewStats'));
const ScraperControls = React.lazy(() => import('./settings/ScraperControls'));
const ScheduledTasks = React.lazy(() => import('./settings/ScheduledTasks'));
const SourceManagement = React.lazy(() => import('./settings/SourceManagement'));
const SundayEditionsAdminTab = React.lazy(() => import('./settings/SundayEditionsAdmin'));

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

  // --- Sunday Editions admin state ---
  const [sundayEditions, setSundayEditions] = useState<SundayEditionAdmin[]>([]);
  const [sundayEditionsLoading, setSundayEditionsLoading] = useState<boolean>(true);
  const [sundayEditionEditId, setSundayEditionEditId] = useState<number | null>(null);
  const [sundayEditionEditForm, setSundayEditionEditForm] = useState<{ title: string; summary: string }>({ title: '', summary: '' });
  const [sundayEditionSaving, setSundayEditionSaving] = useState(false);
  const [sundayEditionPurgeLoading, setSundayEditionPurgeLoading] = useState(false);
  const [sundayEditionImageLoading, setSundayEditionImageLoading] = useState<{ [key: number]: boolean }>({});
  const [sundayEditionAudioLoading, setSundayEditionAudioLoading] = useState<{ [key: number]: boolean }>({});
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'purgeAll' | 'deleteSourceArticles' | 'deleteSource' | 'bulkDelete' | 'deleteSundayEdition' | 'purgeSundayEditions' | null>(null);
  const [confirmDialogSourceId, setConfirmDialogSourceId] = useState<number | null>(null);
  const [confirmDialogEditionId, setConfirmDialogEditionId] = useState<number | null>(null);

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

  // AI coverage stats from actual article data (provided by /api/stats)
  const aiCoverage = useMemo(() => {
    if (!stats.aiCoverage) return null;
    return stats.aiCoverage;
  }, [stats.aiCoverage]);

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
        // Load manual scrape AI toggles from DB (previously stored in localStorage)
        if (data.enable_manual_ai_summary !== undefined) setEnableGlobalAiSummary(data.enable_manual_ai_summary);
        if (data.enable_manual_ai_tags !== undefined) setEnableGlobalAiTags(data.enable_manual_ai_tags);
        if (data.enable_manual_ai_image !== undefined) setEnableGlobalAiImage(data.enable_manual_ai_image);
        if (data.enable_manual_ai_translations !== undefined) setEnableGlobalAiTranslations(data.enable_manual_ai_translations);
      } catch (error: unknown) {
        toast.error("Error Loading Schedule Settings", {
          description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      }
    };
    fetchSchedulerSettings();
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => { fetchSources(); }, []);
  useEffect(() => { fetchSundayEditions(); }, []);

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

  const fetchSundayEditions = async () => {
    setSundayEditionsLoading(true);
    try {
      const response = await apiFetch('/api/sunday-editions?limit=100');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: SundayEditionAdmin[] = await response.json();
      setSundayEditions(data);
    } catch (error: unknown) {
      toast.error("Error Fetching Sunday Editions", {
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setSundayEditionsLoading(false);
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
      fetchSundayEditions();
    } catch (error: unknown) {
      toast.error("Sunday Edition Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSundayEditionLoading(false);
    }
  };

  const handleDeleteSundayEdition = (id: number) => {
    setConfirmDialogAction('deleteSundayEdition');
    setConfirmDialogEditionId(id);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDeleteSundayEdition = async () => {
    if (confirmDialogEditionId === null) return;
    const id = confirmDialogEditionId;
    setIsConfirmDialogOpen(false);
    setConfirmDialogEditionId(null);
    try {
      const response = await apiFetch(`/api/sunday-editions/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete Sunday Edition');
      }
      toast.success("Sunday Edition Deleted");
      setSundayEditions(prev => prev.filter(e => e.id !== id));
    } catch (error: unknown) {
      toast.error("Delete Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  const handlePurgeSundayEditions = () => {
    setConfirmDialogAction('purgeSundayEditions');
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmPurgeSundayEditions = async () => {
    setIsConfirmDialogOpen(false);
    setSundayEditionPurgeLoading(true);
    try {
      const response = await apiFetch('/api/sunday-editions/purge', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to purge Sunday Editions');
      toast.success("Sunday Editions Purged", { description: data.message });
      setSundayEditions([]);
    } catch (error: unknown) {
      toast.error("Purge Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSundayEditionPurgeLoading(false);
    }
  };

  const handleStartEditSundayEdition = (edition: SundayEditionAdmin) => {
    setSundayEditionEditId(edition.id);
    setSundayEditionEditForm({ title: edition.title, summary: edition.summary });
  };

  const handleCancelEditSundayEdition = () => {
    setSundayEditionEditId(null);
    setSundayEditionEditForm({ title: '', summary: '' });
  };

  const handleSaveSundayEdition = async (id: number) => {
    setSundayEditionSaving(true);
    try {
      const response = await apiFetch(`/api/sunday-editions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sundayEditionEditForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update Sunday Edition');
      toast.success("Sunday Edition Updated");
      setSundayEditions(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      setSundayEditionEditId(null);
    } catch (error: unknown) {
      toast.error("Update Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSundayEditionSaving(false);
    }
  };

  const handleRegenerateImage = async (id: number) => {
    setSundayEditionImageLoading(prev => ({ ...prev, [id]: true }));
    try {
      const response = await apiFetch(`/api/sunday-editions/${id}/regenerate-image`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate image');
      toast.success("Image Regenerated", { description: data.message });
      setSundayEditions(prev => prev.map(e => e.id === id ? { ...e, image_url: data.image_url } : e));
    } catch (error: unknown) {
      toast.error("Image Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSundayEditionImageLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRegenerateAudio = async (id: number) => {
    setSundayEditionAudioLoading(prev => ({ ...prev, [id]: true }));
    try {
      const response = await apiFetch(`/api/sunday-editions/${id}/regenerate-audio`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate audio');
      toast.success("Audio Regeneration Started", { description: data.message });
      setSundayEditions(prev => prev.map(e => e.id === id ? { ...e, narration_url: null } : e));
    } catch (error: unknown) {
      toast.error("Audio Error", { description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
      setSundayEditionAudioLoading(prev => ({ ...prev, [id]: false }));
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
          enable_manual_ai_summary: enableGlobalAiSummary,
          enable_manual_ai_tags: enableGlobalAiTags,
          enable_manual_ai_image: enableGlobalAiImage,
          enable_manual_ai_translations: enableGlobalAiTranslations,
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

  // Persist manual AI toggles to DB when changed
  const saveManualAiToggles = async (summary: boolean, tags: boolean, image: boolean, translations: boolean) => {
    try {
      await apiFetch('/api/settings/scheduler', {
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
          enable_manual_ai_summary: summary,
          enable_manual_ai_tags: tags,
          enable_manual_ai_image: image,
          enable_manual_ai_translations: translations,
        }),
      });
    } catch {
      // Silently fail — toggles will still be correct in memory for the current session
    }
  };

  const handleSetEnableGlobalAiSummary = (v: boolean) => {
    setEnableGlobalAiSummary(v);
    saveManualAiToggles(v, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations);
  };
  const handleSetEnableGlobalAiTags = (v: boolean) => {
    setEnableGlobalAiTags(v);
    saveManualAiToggles(enableGlobalAiSummary, v, enableGlobalAiImage, enableGlobalAiTranslations);
  };
  const handleSetEnableGlobalAiImage = (v: boolean) => {
    setEnableGlobalAiImage(v);
    saveManualAiToggles(enableGlobalAiSummary, enableGlobalAiTags, v, enableGlobalAiTranslations);
  };
  const handleSetEnableGlobalAiTranslations = (v: boolean) => {
    setEnableGlobalAiTranslations(v);
    saveManualAiToggles(enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, v);
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
          <TabsTrigger value="sunday-editions" className="flex-shrink-0">Sunday Editions</TabsTrigger>
        </TabsList>

        {/* TAB 1 — Overview & Stats */}
        <TabsContent value="overview">
          <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <OverviewStats
            stats={stats}
            statsLoading={statsLoading}
            statsError={statsError}
            statsLastUpdated={statsLastUpdated}
            fetchStats={fetchStats}
            activeSources={activeSources}
            aiCoverage={aiCoverage}
          />
          </React.Suspense>
        </TabsContent>

        {/* TAB 2 — Scraper Controls */}
        <TabsContent value="global">
          <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <ScraperControls
            enableGlobalAiSummary={enableGlobalAiSummary}
            setEnableGlobalAiSummary={handleSetEnableGlobalAiSummary}
            enableGlobalAiTags={enableGlobalAiTags}
            setEnableGlobalAiTags={handleSetEnableGlobalAiTags}
            enableGlobalAiImage={enableGlobalAiImage}
            setEnableGlobalAiImage={handleSetEnableGlobalAiImage}
            enableGlobalAiTranslations={enableGlobalAiTranslations}
            setEnableGlobalAiTranslations={handleSetEnableGlobalAiTranslations}
            loading={loading}
            purgeLoading={purgeLoading}
            handleTriggerScraper={handleTriggerScraper}
            handlePurgeArticles={handlePurgeArticles}
          />
          </React.Suspense>
        </TabsContent>

        {/* TAB 3 — Scheduled Tasks */}
        <TabsContent value="scheduled">
          <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <ScheduledTasks
            mainScraperFrequency={mainScraperFrequency}
            setMainScraperFrequency={setMainScraperFrequency}
            mainScraperEnabled={mainScraperEnabled}
            setMainScraperEnabled={setMainScraperEnabled}
            missingAiFrequency={missingAiFrequency}
            setMissingAiFrequency={setMissingAiFrequency}
            missingAiEnabled={missingAiEnabled}
            setMissingAiEnabled={setMissingAiEnabled}
            enableScheduledMissingSummary={enableScheduledMissingSummary}
            setEnableScheduledMissingSummary={setEnableScheduledMissingSummary}
            enableScheduledMissingTags={enableScheduledMissingTags}
            setEnableScheduledMissingTags={setEnableScheduledMissingTags}
            enableScheduledMissingImage={enableScheduledMissingImage}
            setEnableScheduledMissingImage={setEnableScheduledMissingImage}
            enableScheduledMissingTranslations={enableScheduledMissingTranslations}
            setEnableScheduledMissingTranslations={setEnableScheduledMissingTranslations}
            sundayEditionFrequency={sundayEditionFrequency}
            setSundayEditionFrequency={setSundayEditionFrequency}
            sundayEditionEnabled={sundayEditionEnabled}
            setSundayEditionEnabled={setSundayEditionEnabled}
            savingSchedule={savingSchedule}
            handleSaveScheduleSettings={handleSaveScheduleSettings}
            mainCronError={mainCronError}
            setMainCronError={setMainCronError}
            missingAiCronError={missingAiCronError}
            setMissingAiCronError={setMissingAiCronError}
            sundayCronError={sundayCronError}
            setSundayCronError={setSundayCronError}
          />
          </React.Suspense>
        </TabsContent>

        {/* TAB 4 — Source Management */}
        <TabsContent value="sources">
          <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <SourceManagement
            sources={sources}
            filteredSources={filteredSources}
            sourcesLoading={sourcesLoading}
            sourcesError={sourcesError}
            sourceSearch={sourceSearch}
            setSourceSearch={setSourceSearch}
            sourceFilterStatus={sourceFilterStatus}
            setSourceFilterStatus={setSourceFilterStatus}
            selectedSources={selectedSources}
            articleCountMap={articleCountMap}
            sourceScrapingLoading={sourceScrapingLoading}
            sourceArticleDeletionLoading={sourceArticleDeletionLoading}
            sourceScrapeResult={sourceScrapeResult}
            bulkActionLoading={bulkActionLoading}
            openAddModal={openAddModal}
            openEditModal={openEditModal}
            handleToggleSelectSource={handleToggleSelectSource}
            handleSelectAllFiltered={handleSelectAllFiltered}
            handleBulkToggleActive={handleBulkToggleActive}
            handleBulkDelete={handleBulkDelete}
            handleTriggerScraperForSource={handleTriggerScraperForSource}
            handleDeleteArticlesForSource={handleDeleteArticlesForSource}
            handleDeleteSource={handleDeleteSource}
          />
          </React.Suspense>
        </TabsContent>

        {/* TAB 5 — Sunday Editions */}
        <TabsContent value="sunday-editions">
          <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <SundayEditionsAdminTab
            sundayEditions={sundayEditions}
            sundayEditionsLoading={sundayEditionsLoading}
            sundayEditionLoading={sundayEditionLoading}
            sundayEditionEditId={sundayEditionEditId}
            sundayEditionEditForm={sundayEditionEditForm}
            setSundayEditionEditForm={setSundayEditionEditForm}
            sundayEditionSaving={sundayEditionSaving}
            sundayEditionPurgeLoading={sundayEditionPurgeLoading}
            sundayEditionImageLoading={sundayEditionImageLoading}
            sundayEditionAudioLoading={sundayEditionAudioLoading}
            handleGenerateSundayEdition={handleGenerateSundayEdition}
            fetchSundayEditions={fetchSundayEditions}
            handlePurgeSundayEditions={handlePurgeSundayEditions}
            handleStartEditSundayEdition={handleStartEditSundayEdition}
            handleCancelEditSundayEdition={handleCancelEditSundayEdition}
            handleSaveSundayEdition={handleSaveSundayEdition}
            handleRegenerateImage={handleRegenerateImage}
            handleRegenerateAudio={handleRegenerateAudio}
            handleDeleteSundayEdition={handleDeleteSundayEdition}
            setLightboxImage={setLightboxImage}
          />
          </React.Suspense>
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
                    className={urlError ? 'border-destructive focus-visible:ring-destructive' : ''}
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
          Image Lightbox
      ================================================================ */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            onClick={e => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain cursor-default rounded-lg"
          />
        </div>
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
              {confirmDialogAction === 'deleteSundayEdition' && (
                <>Are you sure you want to delete this Sunday Edition? This action cannot be undone.</>
              )}
              {confirmDialogAction === 'purgeSundayEditions' && (
                <>Are you sure you want to delete <strong>ALL Sunday Editions</strong>? This action cannot be undone.</>
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
                else if (confirmDialogAction === 'deleteSundayEdition') handleConfirmDeleteSundayEdition();
                else if (confirmDialogAction === 'purgeSundayEditions') handleConfirmPurgeSundayEditions();
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
