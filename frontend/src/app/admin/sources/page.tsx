'use client'; // Make it a client component

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react'; // Import RefreshCw icon


interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string; // Add scraping_method field
}

// Define a type for discovered sources (might be simpler than the full Source type initially)
interface DiscoveredSource {
  name: string;
  url: string;
  // Add other properties if the discovery process provides them
}


const SourceManagement: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety
  const [newSource, setNewSource] = useState({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null, scraping_method: 'opensource' }); // Initialize with default scraping method
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<{ [key: number]: string | null }>({});
  const [scrapingLoading, setScrapingLoading] = useState<{ [key: number]: boolean }>({});

  // States for Source Discovery - Moved to top level
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSources, setDiscoveredSources] = useState<DiscoveredSource[]>([]);
  const [discoveryError, setDiscoveryError] = useState<unknown>(null);

  // State and handlers for the Add/Edit Source Modal - Moved to top level
  const [isModalOpen, setIsModalOpen] = useState(false);


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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setNewSource({
      ...newSource,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAddSource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSource.name || !newSource.url) {
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
        body: JSON.stringify(newSource),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const addedSource = await response.json();
      setSources([...sources, addedSource]);
      setNewSource({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null, scraping_method: 'opensource' }); // Reset form with default
    } catch (error: unknown) { // Use unknown for better type safety
       if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while adding the source.');
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

  // Handle input change specifically for the scraping method select
  const handleScrapingMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (editingSource) {
      setEditingSource({
        ...editingSource,
        scraping_method: value,
      });
    } else {
      setNewSource({
        ...newSource,
        scraping_method: value,
      });
    }
  };

  const handleEditSource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSource) return;

    if (!editingSource.name || !editingSource.url) {
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
        body: JSON.stringify(editingSource),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const updatedSource = await response.json();
      setSources(sources.map(source => source.id === updatedSource.id ? updatedSource : source));
      setEditingSource(null);
    } catch (error: unknown) { // Use unknown for better type safety
       if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred while editing the source.');
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
    setNewSource({
      name: source.name,
      url: source.url,
      enable_ai_summary: true, // Default to true for new sources
      include_selectors: null,
      exclude_selectors: null,
      scraping_method: 'opensource', // Default scraping method for discovered sources
    });
    // Optionally clear discovered sources list after adding one
    setDiscoveredSources([]);
    openAddModal(); // Open the add modal with pre-filled data
  };

  // State and handlers for the Add/Edit Source Modal
  // const [isModalOpen, setIsModalOpen] = useState(false); // Moved to top level

  const openAddModal = () => {
    setEditingSource(null); // Clear editing source for add mode
    setNewSource({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null, scraping_method: 'opensource' }); // Reset form with default
    setIsModalOpen(true);
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source); // Set editing source for edit mode
    setNewSource({ // Pre-fill form with editing source data
      name: source.name,
      url: source.url,
      enable_ai_summary: source.enable_ai_summary,
      include_selectors: source.include_selectors,
      exclude_selectors: source.exclude_selectors,
      scraping_method: source.scraping_method || 'opensource', // Use existing method or default
    } as typeof newSource); // Explicitly cast to ensure correct type for setNewSource
    setIsModalOpen(true);
  };

  const closeAddEditModal = () => {
    setIsModalOpen(false);
    setEditingSource(null); // Clear editing source
    setNewSource({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null, scraping_method: 'opensource' }); // Reset form with default
  };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingSource) {
      await handleEditSource(e); // Use existing edit handler
    } else {
      await handleAddSource(e); // Use existing add handler
    }
    closeAddEditModal(); // Close modal after submit
  };


  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h3 className="text-2xl font-bold mb-6 text-primary">Manage Sources</h3>

      {/* Source Discovery Section */}
      <Card className="p-6 mb-8">
        <CardTitle className="text-xl font-semibold mb-4 text-primary">Discover New Sources</CardTitle>
        <div className="flex items-center gap-4 mb-4">
           <Button
            onClick={discoverNewSources}
            disabled={isDiscovering}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isDiscovering ? 'animate-spin' : ''}`} />
            {isDiscovering ? 'Searching...' : 'Discover Sources'}
          </Button>
           {isDiscovering && <span className="text-muted-foreground">Searching for new sources...</span>}
        </div>

        {discoveryError && (
          <div className="mt-4 p-3 bg-destructive text-destructive-foreground rounded-md">
            Discovery Error: {discoveryError instanceof Error ? discoveryError.message : String(discoveryError)}
          </div>
        )}

        {discoveredSources.length > 0 && (
          <div className="mt-4">
            <h5 className="text-lg font-semibold mb-3 text-foreground">Discovered Sources:</h5>
            <ul className="space-y-3">
              {discoveredSources.map((source, index) => (
                <li key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted p-3 rounded-md">
                  <div>
                    <div className="font-medium text-foreground">{source.name}</div>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">{source.url}</a>
                  </div>
                  <Button onClick={() => handleAddDiscoveredSourceToForm(source)} size="sm" className="mt-2 sm:mt-0">
                    Add as New Source
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>


      {/* Existing Sources Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4"> {/* Added flex container for heading and Add button */}
          <h4 className="text-xl font-semibold text-primary">Existing Sources</h4>
          <Button onClick={openAddModal} size="sm"> {/* Button to open Add modal */}
            Add New Source
          </Button>
        </div>
        <ul className="space-y-4">
          {sources.map((source) => (
            <Card key={source.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 transition-shadow hover:shadow-lg">
              <CardContent className="mb-4 md:mb-0 p-0"> {/* Added p-0 to remove default padding */}
                <CardTitle className="text-lg font-medium text-primary">{source.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  URL: <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{source.url}</a>
                </div>
                <div className="text-sm text-muted-foreground">
                  Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'} | Method: {source.scraping_method || 'N/A'} {/* Display scraping method */}
                </div>
                {source.include_selectors && <div className="text-sm text-muted-foreground">Include: {source.include_selectors}</div>}
                {source.exclude_selectors && <div className="text-sm text-muted-foreground">Exclude: {source.exclude_selectors}</div>}
              </CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleTriggerScraperForSource(source.id)}
                  disabled={scrapingLoading[source.id]}
                  size="sm"
                >
                  {scrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
                </Button>
                <Button
                  onClick={() => openEditModal(source)} // Button to open Edit modal
                  size="sm"
                  variant="secondary" // Use secondary variant for edit
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteSource(source.id)}
                  size="sm"
                  variant="destructive" // Use destructive variant for delete
                >
                  Delete
                </Button>
              </div>
              {scrapingStatus[source.id] && (
                <div className="mt-4 p-2 bg-secondary text-secondary-foreground rounded-md text-sm w-full">
                  {scrapingStatus[source.id]}
                </div>
              )}
            </Card>
          ))}
        </ul>
      </div>

      {/* Add/Edit Source Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full flex justify-center items-center z-50" id="add-edit-modal"> {/* Use bg-black/50 for overlay, added z-50 */}
          <Card className="relative p-6 w-full max-w-lg mx-auto shadow-lg rounded-md bg-background text-foreground"> {/* Adjusted width and centering, added background and text colors */}
            <CardTitle className="text-xl font-semibold mb-4 text-primary">{editingSource ? 'Edit Source' : 'Add New Source'}</CardTitle> {/* Dynamic title */}
            <form onSubmit={handleModalSubmit} className="space-y-4"> {/* Use modal submit handler */}
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-foreground">Source Name:</Label>
                <Input type="text" id="name" name="name" value={newSource.name} onChange={handleInputChange} required className="mt-1 block w-full" />
              </div>
              <div>
                <Label htmlFor="url" className="block text-sm font-medium text-foreground">Source URL:</Label>
                <Input type="text" id="url" name="url" value={newSource.url} onChange={handleInputChange} required className="mt-1 block w-full" />
              </div>
              {/* New: Scraping Method Select */}
              <div>
                <Label htmlFor="scraping_method" className="block text-sm font-medium text-foreground">Scraping Method:</Label>
                <select
                  id="scraping_method"
                  name="scraping_method"
                  value={newSource.scraping_method || 'opensource'} // Use default if null/undefined
                  onChange={handleScrapingMethodChange}
                  className="mt-1 block w-full p-2 border border-input bg-background rounded-md text-foreground" // Basic styling
                >
                  <option value="opensource">Open Source (Puppeteer/Playwright)</option>
                  {/* Add other options here as implemented, e.g., <option value="firecrawl">Firecrawl</option> */}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="enable_ai_summary" name="enable_ai_summary" checked={newSource.enable_ai_summary} onCheckedChange={(checked) => setNewSource({ ...newSource, enable_ai_summary: checked })} /> {/* Corrected onChange handling */}
                <Label htmlFor="enable_ai_summary" className="text-sm font-medium text-foreground">Enable AI Summary</Label>
              </div>
              <div>
                <Label htmlFor="include_selectors" className="block text-sm font-medium text-foreground">Include Selectors (comma-separated):</Label>
                <Textarea id="include_selectors" name="include_selectors" value={newSource.include_selectors || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full"></Textarea>
              </div>
              <div>
                <Label htmlFor="exclude_selectors" className="block text-sm font-medium text-foreground">Exclude Selectors (comma-separated):</Label>
                <Textarea id="exclude_selectors" name="exclude_selectors" value={newSource.exclude_selectors || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full"></Textarea>
              </div>
              <div className="flex justify-end gap-4 mt-6"> {/* Added mt-6 for spacing */}
                <Button type="submit">{editingSource ? 'Save Changes' : 'Add Source'}</Button> {/* Dynamic button text */}
                <Button type="button" onClick={closeAddEditModal} variant="secondary">Cancel</Button> {/* Close modal button */}
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SourceManagement;
