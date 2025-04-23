'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header'; // Import Header component

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
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
}

interface DiscoveredSource {
  name: string;
  url: string;
}

interface ModalFormData {
  name: string;
  url: string;
  enable_ai_summary: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
}


const SettingsPage: React.FC = () => {
  // State from admin/page.tsx
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(true);
  const [stats, setStats] = useState<ArticleStats>({ totalArticles: null, totalSources: null });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // State from admin/sources/page.tsx
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(true);
  const [sourcesError, setSourcesError] = useState<unknown>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceScrapingStatus, setSourceScrapingStatus] = useState<{ [key: number]: string | null }>({});
  const [sourceScrapingLoading, setSourceScrapingLoading] = useState<{ [key: number]: boolean }>({});
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [discoveryError, setDiscoveryError] = useState<unknown>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState<ModalFormData>({
    name: '',
    url: '',
    enable_ai_summary: true,
    include_selectors: null,
    exclude_selectors: null,
    scraping_method: 'opensource',
    os_title_selector: null,
    os_content_selector: null,
    os_date_selector: null,
    os_author_selector: null,
    os_thumbnail_selector: null,
    os_topics_selector: null,
  });

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
        const response = await fetch('http://localhost:3000/api/stats');
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

  // Effects from admin/sources/page.tsx
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/sources');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSources(data.map((source: Source) => ({
          ...source,
          enable_ai_summary: source.enable_ai_summary !== undefined ? source.enable_ai_summary : true,
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
      const response = await fetch('http://localhost:3000/api/scrape/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enableGlobalAiSummary }),
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

  const handlePurgeArticles = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete ALL articles? This action cannot be undone.')) {
      return;
    }

    setPurgeLoading(true);
    setPurgeStatus(null);
    try {
      const response = await fetch('http://localhost:3000/api/articles/purge', {
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
      const response = await fetch('http://localhost:3000/api/sources', {
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
      const response = await fetch(`http://localhost:3000/api/sources/${editingSource.id}`, {
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
     if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this source? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/api/sources/${id}`, {
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

  const handleTriggerScraperForSource = async (sourceId: number) => {
    setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      const response = await fetch(`http://localhost:3000/api/scrape/run/${sourceId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper for source');
      }
      setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: data.message || 'Scraper triggered successfully.' }));
    } catch (error: unknown) {
       if (error instanceof Error) {
        setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: `Error: ${error.message}` }));
      } else {
        setSourceScrapingStatus(prev => ({ ...prev, [sourceId]: 'An unknown error occurred while triggering scraper.' }));
      }
    } finally {
      setSourceScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  const discoverNewSources = async () => {
    setIsDiscovering(true);
    setDiscoveredSources([]);
    setDiscoveryError(null);

    try {
      const response = await fetch('http://localhost:3000/api/discover-sources');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DiscoveredSource[] = await response.json();
      setDiscoveredSources(data);
    } catch (err: unknown) {
      setDiscoveryError(err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddDiscoveredSourceToForm = (source: DiscoveredSource) => {
    setModalFormData({
      name: source.name,
      url: source.url,
      enable_ai_summary: true,
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: null,
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
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
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: null,
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setModalFormData({
      name: source.name,
      url: source.url,
      enable_ai_summary: source.enable_ai_summary,
      include_selectors: source.include_selectors,
      exclude_selectors: source.exclude_selectors,
      scraping_method: source.scraping_method || 'opensource',
      os_title_selector: source.os_title_selector,
      os_content_selector: source.os_content_selector,
      os_date_selector: source.os_date_selector,
      os_author_selector: source.os_author_selector,
      os_thumbnail_selector: source.os_thumbnail_selector,
      os_topics_selector: source.os_topics_selector,
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
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      os_title_selector: null,
      os_content_selector: null,
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
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
    <div>
      <Header />
      <h2>Settings</h2>

      {/* Database Section */}
      <div>
        <h3>Database</h3>
        {/* Database Statistics */}
        <div>
          <div>
            <div>Total Articles</div>
            <div>
              {statsLoading ? (
                <div>Loading...</div>
              ) : statsError ? (
                <div>{statsError}</div>
              ) : (
                <div>{stats.totalArticles !== null ? stats.totalArticles : 'N/A'}</div>
              )}
            </div>
          </div>
          <div>
            <div>Total Sources</div>
            <div>
               {statsLoading ? (
                <div>Loading...</div>
              ) : statsError ? (
                <div>{statsError}</div>
              ) : (
                <div>{stats.totalSources !== null ? stats.totalSources : 'N/A'}</div>
              )}
            </div>
          </div>
          {/* Articles per Source */}
          <div>
            <h4>Articles per Source</h4>
            {statsLoading ? (
              <div>Loading...</div>
            ) : statsError ? (
              <div>{statsError}</div>
            ) : stats.articlesPerSource && stats.articlesPerSource.length > 0 ? (
              <ul>
                {stats.articlesPerSource.map((sourceStats, index) => (
                  <li key={index}>
                    {sourceStats.source_name}: {sourceStats.article_count}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No article stats per source available.</div>
            )}
          </div>
          {/* Articles per Year */}
          <div>
            <h4>Articles per Year</h4>
            {statsLoading ? (
              <div>Loading...</div>
            ) : statsError ? (
              <div>{statsError}</div>
            ) : stats.articlesPerYear && stats.articlesPerYear.length > 0 ? (
              <ul>
                {stats.articlesPerYear.map((yearStats, index) => (
                  <li key={index}>
                    {yearStats.year}: {yearStats.article_count}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No article stats per year available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Section */}
      <div>
        <h3>Dashboard</h3>
        {/* Controls */}
        <div>
          <ul>
            <li>
              <div>
                <input
                  type="checkbox"
                  id="enableGlobalAiSummary"
                  checked={enableGlobalAiSummary}
                  onChange={(e) => setEnableGlobalAiSummary(e.target.checked)}
                />
                <label htmlFor="enableGlobalAiSummary">
                  Enable AI Summaries for this scrape
                </label>
              </div>
            </li>
            <li>
              <button
                onClick={handleTriggerScraper}
                disabled={loading}
              >
                {loading ? 'Triggering...' : 'Trigger Full Scraper Run'}
              </button>
            </li>
            <li>
              <button
                onClick={handlePurgeArticles}
                disabled={purgeLoading}
              >
                {purgeLoading ? 'Purging...' : 'Purge All Articles'}
              </button>
            </li>
          </ul>
        </div>

        {/* Status Messages */}
        {scrapingStatus && (
          <div>
            Scraper Status: {scrapingStatus}
          </div>
        )}
        {purgeStatus && (
          <div>
            Purge Status: {purgeStatus}
          </div>
        )}
      </div>


      {/* Sources Section */}
      <div>
        <h3>Sources</h3>

        {/* Source Discovery Section */}
        <div>
          <h4>Discover New Sources</h4>
          <div>
             <button
              onClick={discoverNewSources}
              disabled={isDiscovering}
            >
              {isDiscovering ? 'Searching...' : 'Discover Sources'}
            </button>
             {isDiscovering && <span>Searching for new sources...</span>}
          </div>

          {/* Display discovery error message */}
          {discoveryError && (
            <div>
              Discovery Error: {String(discoveryError)}
            </div>
          )}

          {discoveredSources.length > 0 && (
            <div>
              <h5>Discovered Sources:</h5>
              <ul>
                {discoveredSources.map((source, index) => (
                  <li key={index}>
                    <div>
                      <div>{source.name}</div>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
                    </div>
                    <button onClick={() => handleAddDiscoveredSourceToForm(source)}>
                      Add as New Source
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>


        {/* Existing Sources Section */}
        <div>
          <div>
            <h4>Existing Sources</h4>
            <button onClick={openAddModal}>
              Add New Source
            </button>
          </div>
          {sourcesLoading ? (
            <div>Loading sources...</div>
          ) : sourcesError ? (
            <div>Error loading sources: {sourcesError instanceof Error ? sourcesError.message : 'An unknown error occurred'}</div>
          ) : sources.length === 0 ? (
            <div>No sources found.</div>
          ) : (
            <ul>
              {sources.map((source) => (
                <div key={source.id}>
                  <div>
                    <div>{source.name}</div>
                    <div>
                      URL: <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.name} URL in new tab`}>{source.url}</a>
                    </div>
                    <div>
                      Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'} | Method: {source.scraping_method || 'N/A'}
                    </div>
                    {source.include_selectors && <div>Include: {source.include_selectors}</div>}
                    {source.exclude_selectors && <div>Exclude: {source.exclude_selectors}</div>}
                  </div>
                  <div>
                    <button
                      onClick={() => handleTriggerScraperForSource(source.id)}
                      disabled={sourceScrapingLoading[source.id]}
                    >
                      {sourceScrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
                    </button>
                    <button
                      onClick={() => openEditModal(source)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      Delete
                    </button>
                  </div>
                  {sourceScrapingStatus[source.id] && (
                    <div>
                      {sourceScrapingStatus[source.id]}
                    </div>
                  )}
                </div>
              ))}
            </ul>
          )}
        </div>

        {/* Add/Edit Source Modal */}
        {isModalOpen && (
          <div>
            <div>
              <h4>{editingSource ? 'Edit Source' : 'Add New Source'}</h4>
              <form onSubmit={handleModalSubmit}>
                <div>
                  <label htmlFor="name">Source Name:</label>
                  <input type="text" id="name" name="name" value={modalFormData.name} onChange={handleModalInputChange} required />
                </div>
                <div>
                  <label htmlFor="url">Source URL:</label>
                  <input type="text" id="url" name="url" value={modalFormData.url} onChange={handleModalInputChange} required />
                </div>
                <div>
                  <label htmlFor="scraping_method">Scraping Method:</label>
                  <select
                    value={modalFormData.scraping_method || 'opensource'}
                    onChange={(e) => setModalFormData({ ...modalFormData, scraping_method: e.target.value })}
                  >
                    <option value="opensource">Open Source (Puppeteer/Playwright)</option>
                    <option value="firecrawl">Firecrawl</option>
                  </select>
                </div>
                <div>
                  <input type="checkbox" id="enable_ai_summary" name="enable_ai_summary" checked={modalFormData.enable_ai_summary} onChange={(e) => setModalFormData({ ...modalFormData, enable_ai_summary: e.target.checked })} />
                  <label htmlFor="enable_ai_summary">Enable AI Summary</label>
                </div>
                {modalFormData.scraping_method === 'opensource' && (
                  <>
                    <div>
                      <label htmlFor="os_title_selector">Title Selector:</label>
                      <input type="text" id="os_title_selector" name="os_title_selector" value={modalFormData.os_title_selector || ''} onChange={handleModalInputChange} />
                    </div>
                    <div>
                      <label htmlFor="os_content_selector">Content Selector:</label>
                      <textarea id="os_content_selector" name="os_content_selector" value={modalFormData.os_content_selector || ''} onChange={handleModalInputChange} rows={3}></textarea>
                    </div>
                     <div>
                      <label htmlFor="os_date_selector">Date Selector:</label>
                      <input type="text" id="os_date_selector" name="os_date_selector" value={modalFormData.os_date_selector || ''} onChange={handleModalInputChange} />
                    </div>
                     <div>
                      <label htmlFor="os_author_selector">Author Selector:</label>
                      <input type="text" id="os_author_selector" name="os_author_selector" value={modalFormData.os_author_selector || ''} onChange={handleModalInputChange} />
                    </div>
                     <div>
                      <label htmlFor="os_thumbnail_selector">Thumbnail Selector:</label>
                      <input type="text" id="os_thumbnail_selector" name="os_thumbnail_selector" value={modalFormData.os_thumbnail_selector || ''} onChange={handleModalInputChange} />
                    </div>
                     <div>
                      <label htmlFor="os_topics_selector">Topics Selector (comma-separated):</label>
                      <input type="text" id="os_topics_selector" name="os_topics_selector" value={modalFormData.os_topics_selector || ''} onChange={handleModalInputChange} />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="include_selectors">Include Selectors (comma-separated):</label>
                  <textarea id="include_selectors" name="include_selectors" value={modalFormData.include_selectors || ''} onChange={handleModalInputChange} rows={3}></textarea>
                </div>
                <div>
                  <label htmlFor="exclude_selectors">Exclude Selectors (comma-separated):</label>
                  <textarea id="exclude_selectors" name="exclude_selectors" value={modalFormData.exclude_selectors || ''} onChange={handleModalInputChange} rows={3}></textarea>
                </div>
                <div>
                  <button type="submit">{editingSource ? 'Save Changes' : 'Add Source'}</button>
                  <button type="button" onClick={closeAddEditModal}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
