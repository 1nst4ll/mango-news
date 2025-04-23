'use client'; // Make it a client component

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header'; // Import Header component


interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string; // Add scraping_method field
  // Add specific selectors for opensource scraping
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
}

// Define a type for discovered sources (might be simpler than the full Source type initially)
interface DiscoveredSource {
  name: string;
  url: string;
  // Add other properties if the discovery process provides them
}

// Define the shape of the modal form data
interface ModalFormData {
  name: string;
  url: string;
  enable_ai_summary: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method: string;
  // Add specific selectors for opensource scraping
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
}


const SourceManagement: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<{ [key: number]: string | null }>({});
  const [scrapingLoading, setScrapingLoading] = useState<{ [key: number]: boolean }>({});

  // States for Source Discovery
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [discoveryError, setDiscoveryError] = useState<unknown>(null);

  // State and handlers for the Add/Edit Source Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFormData, setModalFormData] = useState<ModalFormData>({ // New state for modal form data
    name: '',
    url: '',
    enable_ai_summary: true,
    include_selectors: null,
    exclude_selectors: null,
    scraping_method: 'opensource', // Default scraping method
    // Initialize new selector fields
    os_title_selector: null,
    os_content_selector: null,
    os_date_selector: null,
    os_author_selector: null,
    os_thumbnail_selector: null,
    os_topics_selector: null,
  });


  useEffect(() => {
    const fetchSources = async () => {
      try {
        // TODO: Replace with your actual backend API URL
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
          scraping_method: source.scraping_method !== undefined ? source.scraping_method : 'opensource', // Default to opensource if not provided
          // Initialize new selector fields
          os_title_selector: source.os_title_selector !== undefined ? source.os_title_selector : null,
          os_content_selector: source.os_content_selector !== undefined ? source.os_content_selector : null,
          os_date_selector: source.os_date_selector !== undefined ? source.os_date_selector : null,
          os_author_selector: source.os_author_selector !== undefined ? source.os_author_selector : null,
          os_thumbnail_selector: source.os_thumbnail_selector !== undefined ? source.os_thumbnail_selector : null,
          os_topics_selector: source.os_topics_selector !== undefined ? source.os_topics_selector : null,
        })));
      } catch (error: unknown) { // Use unknown for better type safety
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []); // Fetch sources on component mount

  if (loading) {
    return <div>Loading sources...</div>;
  }

  if (error) {
    return <div>Error loading sources: {error instanceof Error ? error.message : 'An unknown error occurred'}</div>;
  }

  // Handle input change for modal form data
  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setModalFormData({
      ...modalFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };


  const handleAddSource = async () => { // Modified to use modalFormData
    if (!modalFormData.name || !modalFormData.url) {
      alert('Please enter both source name and URL.');
      return;
    }
    try {
      // TODO: Replace with your actual backend API URL
      const response = await fetch('http://localhost:3000/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modalFormData), // Use modalFormData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const addedSource = await response.json();
      setSources([...sources, addedSource]);
      closeAddEditModal(); // Close modal on success
    } catch (error: unknown) { // Use unknown for better type safety
       if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while adding the source.');
      }
    }
  };

  const handleEditSource = async () => { // Modified to use modalFormData
    if (!editingSource) return;

    if (!modalFormData.name || !modalFormData.url) {
      alert('Please enter both source name and URL.');
      return;
    }

    try {
      // TODO: Replace with your actual backend API URL
      const response = await fetch(`http://localhost:3000/api/sources/${editingSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modalFormData), // Use modalFormData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const updatedSource = await response.json();
      setSources(sources.map(source => source.id === updatedSource.id ? updatedSource : source));
      closeAddEditModal(); // Close modal on success
    } catch (error: unknown) { // Use unknown for better type safety
       if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while editing the source.');
      }
    }
  };


  const handleDeleteSource = async (id: number) => {
     if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this source? This action cannot be undone.')) {
      return;
    }
    try {
      // TODO: Replace with your actual backend API URL
      const response = await fetch(`http://localhost:3000/api/sources/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setSources(sources.filter(source => source.id !== id));
    } catch (error: unknown) { // Use unknown for better type safety
       if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while deleting the source.');
      }
    }
  };

  const handleTriggerScraperForSource = async (sourceId: number) => {
    setScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    setScrapingStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      // TODO: Replace with your actual backend API URL
      const response = await fetch(`http://localhost:3000/api/scrape/run/${sourceId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper for source');
      }
      setScrapingStatus(prev => ({ ...prev, [sourceId]: data.message || 'Scraper triggered successfully.' }));
    } catch (error: unknown) { // Use unknown for better type safety
       if (error instanceof Error) {
        setScrapingStatus(prev => ({ ...prev, [sourceId]: `Error: ${error.message}` }));
      } else {
        setScrapingStatus(prev => ({ ...prev, [sourceId]: 'An unknown error occurred while triggering scraper.' }));
      }
    } finally {
      setScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };

  // Source discovery function (connects to backend)
  const discoverNewSources = async () => { // Made async
    setIsDiscovering(true);
    setDiscoveredSources([]);
    setDiscoveryError(null);

    try {
      // TODO: Replace with your actual backend API URL for discovery
      const response = await fetch('http://localhost:3000/api/discover-sources'); // Hypothetical endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DiscoveredSource[] = await response.json(); // Assuming backend returns array of DiscoveredSource
      setDiscoveredSources(data);
    } catch (err: unknown) { // Use unknown for better type safety
      setDiscoveryError(err);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Handle adding a discovered source to the form
  const handleAddDiscoveredSourceToForm = (source: DiscoveredSource) => {
    setModalFormData({ // Use modalFormData
      name: source.name,
      url: source.url,
      enable_ai_summary: true, // Default to true for new sources
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource', // Default scraping method for discovered sources
      // Initialize new selector fields for discovered sources (likely null)
      os_title_selector: null,
      os_content_selector: null,
      os_date_selector: null,
      os_author_selector: null,
      os_thumbnail_selector: null,
      os_topics_selector: null,
    });
    // Optionally clear discovered sources list after adding one
    setDiscoveredSources([]);
    openAddModal(); // Open the add modal with pre-filled data
  };

  // State and handlers for the Add/Edit Source Modal
  // const [isModalOpen, setIsModalOpen] = useState(false); // Moved to top level

  const openAddModal = () => {
    setEditingSource(null); // Clear editing source for add mode
    setModalFormData({ // Initialize modalFormData for add mode
      name: '',
      url: '',
      enable_ai_summary: true,
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource', // Reset form with default
      // Initialize new selector fields for add mode
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
    setEditingSource(source); // Set editing source for edit mode
    setModalFormData({ // Initialize modalFormData with editing source data
      name: source.name,
      url: source.url,
      enable_ai_summary: source.enable_ai_summary,
      include_selectors: source.include_selectors,
      exclude_selectors: source.exclude_selectors,
      scraping_method: source.scraping_method || 'opensource', // Use existing method or default
      // Initialize new selector fields with existing data
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
    setEditingSource(null); // Clear editing source
    setModalFormData({ // Reset modalFormData with default
      name: '',
      url: '',
      enable_ai_summary: true,
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource',
      // Reset new selector fields
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
      await handleEditSource(); // Call edit handler (no event needed)
    } else {
      await handleAddSource(); // Call add handler (no event needed)
    }
  };


  return (
    <div>
      <Header /> {/* Use Header component */}
      <h3>Manage Sources</h3>

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
        <ul>
          {sources.map((source) => (
            <div key={source.id}>
              <div>
                <div>{source.name}</div>
                <div>
                  URL: <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.name} URL in new tab`}>{source.url}</a>
                </div>
                <div>
                  Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'} | Method: {source.scraping_method || 'N/A'} {/* Display scraping method */}
                </div>
                {source.include_selectors && <div>Include: {source.include_selectors}</div>} {/* Added break-words */}
                {source.exclude_selectors && <div>Exclude: {source.exclude_selectors}</div>} {/* Added break-words */}
              </div>
              <div>
                <button
                  onClick={() => handleTriggerScraperForSource(source.id)}
                  disabled={scrapingLoading[source.id]}
                >
                  {scrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
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
              {scrapingStatus[source.id] && (
                <div>
                  {scrapingStatus[source.id]}
                </div>
              )}
            </div>
          ))}
        </ul>
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
              {/* New: Scraping Method Select */}
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
              {/* New: Specific Open Source Selectors */}
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
              {/* Existing Include/Exclude Selectors */}
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
  );
};

export default SourceManagement;
