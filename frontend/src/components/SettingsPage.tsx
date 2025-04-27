import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"; // Added CardDescription and CardFooter
import { Button } from "./ui/button";
import { ArticlesPerSourceBarChart } from "./charts/ArticlesPerSourceBarChart"; // Import the new chart component
import { ArticlesPerYearBarChart } from "./charts/ArticlesPerYearAreaChart"; // Import the Articles per Year Bar chart component
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch"; // Assuming Switch is needed based on previous feedback


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
}

interface DiscoveredSource {
  name: string;
  url: string;
}

interface ModalFormData {
  name: string;
  url: string;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean; // Add enable_ai_tags field
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null; // Add article link template
  exclude_patterns: string | null; // Add exclude patterns
}


const SettingsPage: React.FC = () => {
  // State from admin/page.tsx
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(true);
  const [enableGlobalAiTags, setEnableGlobalAiTags] = useState<boolean>(true); // New state for AI tags
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
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null); // Changed type to string | null
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState<ModalFormData>({
    name: '',
    url: '',
    enable_ai_summary: true,
    enable_ai_tags: true, // Initialize enable_ai_tags field
    include_selectors: null,
    exclude_selectors: null,
    scraping_method: 'opensource',
    os_title_selector: null,
    os_content_selector: null,
    os_date_selector: null,
    os_author_selector: null,
    os_thumbnail_selector: null,
    os_topics_selector: null,
  article_link_template: null, // Initialize new field
  exclude_patterns: null, // Initialize new field
});

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'purgeAll' | 'deleteSourceArticles' | 'deleteSource' | null>(null);
  const [confirmDialogSourceId, setConfirmDialogSourceId] = useState<number | null>(null);

  // Effects from admin/page.tsx
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableGlobalAiSummary');
      if (saved !== null) {
        setEnableGlobalAiSummary(JSON.parse(saved));
      }
    }

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
        const response = await fetch(`${apiUrl}/api/stats`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ArticleStats = await response.json();
        setStats(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setStatsError(`Error fetching stats: ${err.message}`);
        } else {
          setStatsError('An unknown error occurred while fetching stats.');
        }
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
      const saved = localStorage.getItem('enableGlobalAiTags');
      if (saved !== null) {
        setEnableGlobalAiTags(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiTags', JSON.stringify(enableGlobalAiTags));
    }
  }, [enableGlobalAiTags]);

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
        setSourcesError(error);
      } finally {
        setSourcesLoading(false);
      }
    };

    fetchSources();
  }, []);

  // Handlers from admin/page.tsx
  const handleTriggerScraper = async () => {
    setLoading(true);
    setScrapingStatus(null);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/scrape/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags }), // Include enableGlobalAiTags
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper');
      }
      setScrapingStatus(data.message || 'Scraper triggered successfully. Check backend logs for progress.');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setScrapingStatus(`Error: ${error.message}`);
      } else {
        setScrapingStatus('An unknown error occurred during scraping.');
      }
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
    setPurgeStatus(null);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/articles/purge`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purge articles');
      }
      setPurgeStatus(data.message || 'All articles purged successfully.');
    } catch (error: unknown) {
       if (error instanceof Error) {
        setPurgeStatus(`Error: ${error.message}`);
      } else {
        setPurgeStatus('An unknown error occurred during purging.');
      }
    } finally {
      setPurgeLoading(false);
    }
  };

  const handleTriggerScraperForSource = async (sourceId: number) => {
    setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/scrape/run/${sourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enableGlobalAiSummary, enableGlobalAiTags }), // Include enableGlobalAiTags
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to trigger scraper for source ${sourceId}`);
      }
      // Update status message with counts from the backend response
      setSourceScrapingStatus(prev => ({
        ...prev,
        [sourceId]: `${data.message}. Found ${data.linksFound} potential article links, added ${data.articlesAdded} new articles. Check backend logs for details.`,
      }));
    } catch (error: unknown) {
      if (error instanceof Error) {
        setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: `Error: ${error.message}` }));
      } else {
        setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: 'An unknown error occurred during scraping.' }));
      }
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
    setSourceArticleDeletionStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      // TODO: Implement backend endpoint for deleting articles by source ID
      const response = await fetch(`${apiUrl}/api/articles/purge/${sourceId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to delete articles for source ${sourceId}`);
      }
      setSourceArticleDeletionStatus(prev => ({ ...prev, [sourceId]: data.message || `All articles for source ${sourceId} purged successfully.` }));
      // Optionally refetch stats after deletion
      // fetchStats();
    } catch (error: unknown) {
       if (error instanceof Error) {
        setSourceArticleDeletionStatus(prev => ({ ...prev, [sourceId]: `Error: ${error.message}` }));
      } else {
        setSourceArticleDeletionStatus(prev => ({ ...prev, [sourceId]: 'An unknown error occurred during article deletion.' }));
      }
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
      alert('Please enter both source name and URL.');
      return;
    }
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modalFormData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const addedSource = await response.json();
      setSources([...sources, addedSource]);
      closeAddEditModal();
    } catch (error: unknown) {
       if (error instanceof Error) {
        setSourcesError(error.message);
      } else {
        setSourcesError('An unknown error occurred while adding the source.');
      }
    }
  };

  const handleEditSource = async () => {
    if (!editingSource) return;

    if (!modalFormData.name || !modalFormData.url) {
      alert('Please enter both source name and URL.');
      return;
    }

    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/sources/${editingSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modalFormData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const updatedSource = await response.json();
      setSources(sources.map(source => source.id === updatedSource.id ? updatedSource : source));
      closeAddEditModal();
    } catch (error: unknown) {
       if (error instanceof Error) {
        setSourcesError(error.message);
      } else {
        setSourcesError('An unknown error occurred while editing the source.');
      }
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
    } catch (error: unknown) {
       if (error instanceof Error) {
        setSourcesError(error.message);
      } else {
        setSourcesError('An unknown error occurred while deleting the source.');
      }
    }
  };

  const discoverNewSources = async () => {
    setIsDiscovering(true);
    setDiscoveredSources([]);
    setDiscoveryError(null);

    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
      const response = await fetch(`${apiUrl}/api/discover-sources`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DiscoveredSource[] = await response.json();
      setDiscoveredSources(data);
    } catch (err: unknown) {
      setDiscoveryError(String(err)); // Convert error to string
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddDiscoveredSourceToForm = (source: DiscoveredSource) => {
    setModalFormData({
      name: source.name,
      url: source.url,
      enable_ai_summary: true,
      enable_ai_tags: true, // Initialize enable_ai_tags field
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: "article.tgMH9T", // Set default content selector
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
      article_link_template: null, // Initialize new field
      exclude_patterns: null, // Initialize new field
    });
    setDiscoveredSources([]);
    openAddModal();
  };

  const openAddModal = () => {
    setEditingSource(null);
    setModalFormData({
      name: '',
      url: '',
      enable_ai_summary: true,
      enable_ai_tags: true, // Initialize enable_ai_tags field
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: "article.tgMH9T", // Set default content selector
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
      article_link_template: null, // Initialize new field
      exclude_patterns: null, // Initialize new field
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
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: "article.tgMH9T", // Reset default content selector
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
      article_link_template: null, // Reset new field
      exclude_patterns: null, // Reset new field
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
    <div className="container mx-auto p-4">

      {/* Dashboard Section */}
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
              <ArticlesPerSourceBarChart data={stats.articlesPerSource || []} /> {/* Use the chart component */}
            </div>
            {/* Articles per Year Chart */}
            <div className="lg:col-span-2">
              <ArticlesPerYearBarChart data={stats.articlesPerYear || []} /> {/* Use the Articles per Year Bar chart component */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Section */}
      <Card className="mb-6 pt-4">
        <CardHeader>
          <CardTitle className="pb-4">Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="mb-4">
            <ul className="space-y-4">
              <li>
                <div className="flex items-center space-x-2">
                  {/* Assuming Checkbox component is used here */}
                  <Switch
                    id="enableGlobalAiSummary"
                    checked={enableGlobalAiSummary}
                    onCheckedChange={(checked: boolean) => setEnableGlobalAiSummary(checked)}
                  />
                  <Label htmlFor="enableGlobalAiSummary">
                    Enable AI Summaries for this scrape
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
                    Enable AI Tags for this scrape
                  </Label>
                </div>
              </li>
              <li>
                <Button
                  onClick={handleTriggerScraper}
                  disabled={loading}
                >
                  {loading ? 'Triggering...' : 'Trigger Full Scraper Run'}
                </Button>
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
            </ul>
          </div>

          {/* Status Messages */}
          {scrapingStatus && (
            <div className="text-sm text-green-600 mt-2">
              Scraper Status: {scrapingStatus}
            </div>
          )}
          {purgeStatus && (
            <div className="text-sm text-green-600 mt-2">
              Purge Status: {purgeStatus}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Sources Section */}
      <Card className="mb-6 pt-4">
        <CardHeader>
          <CardTitle className="pb-4">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Source Discovery Section */}
          <Card className="mb-6 pt-4">
            <CardHeader>
              <CardTitle className="text-md font-semibold">Discover New Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                 <Button
                  onClick={discoverNewSources}
                  disabled={isDiscovering}
                >
                  {isDiscovering ? 'Searching...' : 'Discover Sources'}
                </Button>
               {isDiscovering && <span className="text-gray-600">Searching for new sources...</span>}
              </div>

              {/* Display discovery error message */}
            {discoveryError && (
              <div className="text-red-500 mt-2">
                Discovery Error: {discoveryError}
              </div>
            )}

            {discoveredSources.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Discovered Sources:</h5>
                <ul className="space-y-2">
                  {discoveredSources.map((source, index) => (
                    <li key={index} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">{source.url}</a>
                      </div>
                      <Button onClick={() => handleAddDiscoveredSourceToForm(source)} size="sm">
                        Add as New Source
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          </Card>


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
            <ul className="space-y-4">
              {sources.map((source) => (
                <li key={source.id} className="border rounded-lg p-4 shadow-sm pt-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                    <div>
                      <div className="text-lg font-medium">{source.name}</div>
                      <div className="text-sm text-gray-600">
                        URL: <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" aria-label={`Open ${source.name} URL in new tab`}>{source.url}</a>
                      </div>
                      <div className="text-sm text-gray-600">
                        Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'} | Method: {source.scraping_method || 'N/A'}
                      </div>
                      {source.include_selectors && <div className="text-sm text-gray-600 break-words">Include: {source.include_selectors}</div>}
                      {source.exclude_selectors && <div>Exclude: {source.exclude_selectors}</div>}
                    </div>
                    <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 mt-2 md:mt-0">
                      <Button
                        onClick={() => handleTriggerScraperForSource(source.id)}
                        disabled={sourceScrapingLoading[source.id]}
                        size="sm"
                      >
                        {sourceScrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
                      </Button>
                       <Button
                        onClick={() => handleDeleteArticlesForSource(source.id)}
                        disabled={sourceArticleDeletionLoading[source.id]}
                        size="sm"
                        variant="destructive"
                      >
                        {sourceArticleDeletionLoading[source.id] ? 'Deleting...' : 'Delete Articles'}
                      </Button>
                      <Button
                        onClick={() => openEditModal(source)}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteSource(source.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete Source
                      </Button>
                    </div>
                  </div>
                  {/* Display scraping status directly within the card */}
                  {sourceScrapingStatus[source.id] && (
                    <div className="text-sm text-green-600 mt-2">
                      Scrape Status: {sourceScrapingStatus[source.id]}
                    </div>
                  )}
                   {/* Display article deletion status directly within the card */}
                  {sourceArticleDeletionStatus[source.id] && (
                    <div className="text-sm text-green-600 mt-2">
                      Deletion Status: {sourceArticleDeletionStatus[source.id]}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </CardContent>
      </Card>


      {/* Add/Edit Source Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px] md:max-w-xl lg:max-w-2xl overflow-y-scroll max-h-[80vh] dialog-scrollable-content">
            <DialogHeader>
              <DialogTitle>{editingSource ? 'Edit Source' : 'Add New Source'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleModalSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="name" className="md:text-right">
                  Source Name:
                </Label>
                <Input id="name" name="name" value={modalFormData.name} onChange={handleModalInputChange} required className="md:col-span-3" />
              </div>
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="url" className="md:text-right">
                  Source URL:
                </Label>
                <Input id="url" name="url" value={modalFormData.url} onChange={handleModalInputChange} required className="md:col-span-3" />
              </div>
              {/* New: Scraping Method Select */}
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="scraping_method" className="md:text-right">Scraping Method:</Label>
                <Select
                  value={modalFormData.scraping_method || 'opensource'}
                  onValueChange={(value) => setModalFormData({ ...modalFormData, scraping_method: value })}
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
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center"> {/* Adjusted layout */}
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
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="enable_ai_tags" className="md:text-right">Enable AI Tags:</Label>
                <Switch
                  id="enable_ai_tags"
                  name="enable_ai_tags"
                  checked={modalFormData.enable_ai_tags}
                  onCheckedChange={(checked) => setModalFormData({ ...modalFormData, enable_ai_tags: Boolean(checked) })}
                  className="md:col-span-3"
                />
              </div>
              {/* New: Specific Open Source Selectors */}
              {modalFormData.scraping_method === 'opensource' && (
                <>
                  <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                    <Label htmlFor="os_title_selector" className="md:text-right">Title Selector:</Label>
                    <Input id="os_title_selector" name="os_title_selector" value={modalFormData.os_title_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                  </div>
                  <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                    <Label htmlFor="os_content_selector" className="md:text-right">Content Selector:</Label>
                    <Input id="os_content_selector" name="os_content_selector" value={modalFormData.os_content_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                  </div>
                   <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                    <Label htmlFor="os_date_selector" className="md:text-right">Date Selector:</Label>
                    <Input id="os_date_selector" name="os_date_selector" value={modalFormData.os_date_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                  </div>
                   <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                    <Label htmlFor="os_author_selector" className="md:text-right">Author Selector:</Label>
                    <Input id="os_author_selector" name="os_author_selector" value={modalFormData.os_author_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                  </div>
                   <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                    <Label htmlFor="os_thumbnail_selector" className="md:text-right">Thumbnail Selector:</Label>
                    <Input id="os_thumbnail_selector" name="os_thumbnail_selector" value={modalFormData.os_thumbnail_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                  </div>
                   <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                    <Label htmlFor="os_topics_selector" className="md:text-right">Topics Selector (comma-separated):</Label>
                    <Input id="os_topics_selector" name="os_topics_selector" value={modalFormData.os_topics_selector || ''} onChange={handleModalInputChange} className="md:col-span-3" />
                  </div>
                </>
              )}
              {/* Existing Include/Exclude Selectors */}
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="include_selectors" className="md:text-right">Include Selectors (comma-separated):</Label>
                <Input id="include_selectors" name="include_selectors" value={modalFormData.include_selectors || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="exclude_selectors" className="md:text-right">Exclude Selectors (comma-separated):</Label>
                <Input id="exclude_selectors" name="exclude_selectors" value={modalFormData.exclude_selectors || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              {/* New: Article Link Template */}
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="article_link_template" className="md:text-right">Article Link Template:</Label>
                <Input id="article_link_template" name="article_link_template" value={modalFormData.article_link_template || ''} onChange={handleModalInputChange} className="md:col-span-3" />
              </div>
              {/* New: Exclude Patterns */}
              <div className="grid gap-2 md:gap-4 md:grid-cols-4 md:items-center">
                <Label htmlFor="exclude_patterns" className="md:text-right">Exclude Patterns (comma-separated query params):</Label>
                <Input id="exclude_patterns" name="exclude_patterns" value={modalFormData.exclude_patterns || ''} onChange={handleModalInputChange} className="md:col-span-3" />
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
    </div>
  );
};

export default SettingsPage;
