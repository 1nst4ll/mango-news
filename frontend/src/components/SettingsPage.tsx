import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ArticlesPerSourceBarChart } from "./charts/ArticlesPerSourceBarChart";
import { ArticlesPerYearBarChart } from "./charts/ArticlesPerYearAreaChart";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"; // Import Tabs components
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"; // Import Alert components
import { Info, MoreHorizontal } from 'lucide-react'; // Import icons
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"; // Import DropdownMenu components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"; // Import Accordion components
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components




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
  const [jwtToken, setJwtToken] = useState<string | null>(null);

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
  const [confirmDialogAction, setConfirmDialogAction] = useState<'purgeAll' | 'deleteSourceArticles' | 'deleteSource' | null>(null);
  const [confirmDialogSourceId, setConfirmDialogSourceId] = useState<number | null>(null);

  // Effects for fetching scheduler settings
  useEffect(() => {
    const fetchSchedulerSettings = async () => {
      if (!jwtToken) return; // Don't fetch if no token

      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
        };

        const response = await fetch(`${apiUrl}/api/settings/scheduler`, { headers });
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
  }, [jwtToken]);

  // Effects from admin/page.tsx
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwtToken');
      setJwtToken(token); // Set the JWT token in state

      const savedSummaryToggle = localStorage.getItem('enableGlobalAiSummary');
      if (savedSummaryToggle !== null) {
        setEnableGlobalAiSummary(JSON.parse(savedSummaryToggle));
      }
    }

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        const token = localStorage.getItem('jwtToken'); // Get the JWT token from localStorage
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${apiUrl}/api/stats`, {
          headers: headers,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ArticleStats = await response.json();
        setStats(data);
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
  }, [jwtToken]); // Re-fetch stats if token changes

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
  }, []);

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
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
        const response = await fetch(`${apiUrl}/api/sources`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSources(data.map((source: Source) => ({
          ...source,
          enable_ai_summary: source.enable_ai_summary !== undefined ? source.enable_ai_summary : true,
          enable_ai_tags: source.enable_ai_tags !== undefined ? source.enable_ai_tags : true, // Include enable_ai_tags field
          enable_ai_translations: source.enable_ai_translations !== undefined ? source.enable_ai_translations : true, // Include enable_ai_translations field
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
          article_link_template: source.article_link_template !== undefined ? source.article_link_template : null, // Include new field
          exclude_patterns: source.exclude_patterns !== undefined ? source.exclude_patterns : null, // Include new field
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

    fetchSources();
  }, []);

  // Handlers from admin/page.tsx
  const handleTriggerScraper = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/scrape/run`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }), // Include new toggle
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/articles/purge`, {
        method: 'POST',
        headers: headers,
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Explicitly request JSON response
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/sunday-editions/generate`, {
        method: 'POST',
        headers: headers,
        // Ensure an empty body is sent if no data is required, to explicitly set Content-Type
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/scrape/run/${sourceId}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags, enableGlobalAiImage, enableGlobalAiTranslations }), // Include new toggle
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to trigger scraper for source ${sourceId}`);
      }
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
    if (!confirm('Are you sure you want to block this source from scraping? This will set its status to inactive.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/sources/${sourceId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ is_active: false }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refetch sources to update the list
      const fetchSources = async () => {
        try {
          const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
          const response = await fetch(`${apiUrl}/api/sources`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setSources(data.map((source: Source) => ({
            ...source,
            enable_ai_summary: source.enable_ai_summary !== undefined ? source.enable_ai_summary : true,
            enable_ai_tags: source.enable_ai_tags !== undefined ? source.enable_ai_tags : true,
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
          setSourcesError(error);
        } finally {
          setSourcesLoading(false);
        }
      };
      fetchSources();

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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      };

      const response = await fetch(`${apiUrl}/api/settings/scheduler`, {
        method: 'POST',
        headers: headers,
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/articles/purge/${sourceId}`, {
        method: 'POST',
        headers: headers,
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/sources`, {
        method: 'POST',
        headers: headers,
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const response = await fetch(`${apiUrl}/api/sources/${editingSource.id}`, {
        method: 'PUT',
        headers: headers,
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
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/sources/${id}`, {
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
      os_author_selector: null,
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
          <CardHeader>
            <CardTitle className="pb-4">Database</CardTitle>
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
        <Card className="mb-6 pt-4">
          <CardHeader>
            <CardTitle className="pb-4">Global Settings & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Controls */}
            <div className="mb-4">
              <ul className="space-y-4">
                <li>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableGlobalAiSummary"
                      checked={enableGlobalAiSummary}
                      onCheckedChange={(checked: boolean) => setEnableGlobalAiSummary(checked)}
                    />
                    <Label htmlFor="enableGlobalAiSummary">
                      For next manual scrape: Generate AI Summaries
                  </Label>
                </div>
              </li>
              <li>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableGlobalAiTags"
                    checked={enableGlobalAiTags}
                    onCheckedChange={(checked: boolean) => setEnableGlobalAiTags(checked)}
                  />
                  <Label htmlFor="enableGlobalAiTags">
                    For next manual scrape: Generate AI Tags
                  </Label>
                </div>
              </li>
              <li>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableGlobalAiImage"
                    checked={enableGlobalAiImage}
                    onCheckedChange={(checked: boolean) => setEnableGlobalAiImage(checked)}
                  />
                  <Label htmlFor="enableGlobalAiImage">
                    For next manual scrape: Generate AI Images
                  </Label>
                </div>
              </li>
              <li>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableGlobalAiTranslations"
                    checked={enableGlobalAiTranslations}
                    onCheckedChange={(checked: boolean) => setEnableGlobalAiTranslations(checked)}
                  />
                  <Label htmlFor="enableGlobalAiTranslations">
                    For next manual scrape: Generate AI Translations
                  </Label>
                </div>
              </li>
              <li>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleTriggerScraper}
                        disabled={loading}
                      >
                        {loading ? 'Triggering...' : 'Run Scraper'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Triggers a full scrape run for all active sources.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </li>
              <li>
                <Button
                  onClick={handlePurgeArticles}
                  disabled={purgeLoading}
                  variant="destructive"
                >
                  {purgeLoading ? 'Purging...' : 'Purge All Articles'}
                </Button>
              </li>
              <li>
                <Button
                  onClick={handleGenerateSundayEdition}
                  disabled={sundayEditionLoading}
                >
                  {sundayEditionLoading ? 'Generating...' : 'Generate Sunday Edition'}
                </Button>
              </li>
            </ul>
          </div>
          </CardContent>
        </Card>
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
                  <p className="text-sm text-gray-500">Current: Runs every hour. <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cron Helper</a></p>
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
                  <p className="text-sm text-gray-500">Current: Runs every 20 minutes. <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cron Helper</a></p>
                </div>
                <div className="mt-4 space-y-2">
                  {/* Sunday Edition Schedule */}
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
                    <p className="text-sm text-gray-500">Current: Runs every Sunday at midnight. <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Cron Helper</a></p>
                  </div>
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
                    <Label htmlFor="enableGlobalAiImage">
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
            <CardTitle className="pb-4">Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Existing Sources Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold">Existing Sources</h4>
                <Button onClick={openAddModal} size="sm">
                  Add New Source
                </Button>
              </div>
              {sourcesLoading ? (
                <div>Loading sources...</div>
              ) : sourcesError ? (
                <div className="text-red-500">Error loading sources: {sourcesError instanceof Error ? sourcesError.message : 'An unknown error occurred'}</div>
              ) : sources.length === 0 ? (
                <div className="text-gray-600">No sources found.</div>
              ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sources.map((source) => (
                    <Card key={source.id} className="p-4 shadow-sm pt-4 flex flex-col"> {/* Added flex flex-col to make card content stretch */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                        <div>
                          <div className="text-sm text-muted-foreground">ID: {source.id}</div>
                          <CardTitle className="text-lg font-medium">{source.name}</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            URL: <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" aria-label={`Open ${source.name} URL in new tab`}>{source.url}</a>
                          </CardDescription>
                          <CardDescription className="text-sm text-muted-foreground">
                            Articles: {stats.articlesPerSource.find(s => s.source_name === source.name)?.article_count || 0}
                          </CardDescription>
                          <CardDescription className="text-sm text-muted-foreground">
                            Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'} | Method: {source.scraping_method || 'N/A'}
                          </CardDescription>
                          {source.include_selectors && <CardDescription className="text-sm text-muted-foreground break-words">Include: {source.include_selectors}</CardDescription>}
                          {source.exclude_selectors && <CardDescription className="text-sm text-muted-foreground">Exclude: {source.exclude_selectors}</CardDescription>}
                        </div>
                        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 mt-2 md:mt-0">
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

                    <div className="mt-4 pt-4 border-t border-gray-200">
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
              )}
            </div>
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
