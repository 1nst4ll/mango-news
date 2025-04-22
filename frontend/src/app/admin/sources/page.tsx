'use client'; // Make it a client component

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
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

// Define the shape of the modal form data
interface ModalFormData {
  name: string;
  url: string;
  enable_ai_summary: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method: string;
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
           {isDiscovering && <span className="text-muted-foreground" aria-live="polite" aria-atomic="true">Searching for new sources...</span>}
        </div>

        {discoveryError && (
          <div className="mt-4 p-3 bg-destructive text-destructive-foreground rounded-md" aria-live="polite" aria-atomic="true">
            Discovery Error: {String(discoveryError)}
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
            <Card key={source.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 sm:p-6 transition-shadow hover:shadow-lg"> {/* Adjusted padding for smaller screens */}
              <CardContent className="mb-4 md:mb-0 p-0 flex-grow"> {/* Added flex-grow */}
                <CardTitle className="text-lg font-medium text-primary">{source.name}</CardTitle>
                <div className="text-sm text-muted-foreground break-words"> {/* Added break-words */}
                  URL: <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" aria-label={`Open ${source.name} URL in new tab`}>{source.url}</a>
                </div>
                <div className="text-sm text-muted-foreground">
                  Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'} | Method: {source.scraping_method || 'N/A'} {/* Display scraping method */}
                </div>
                {source.include_selectors && <div className="text-sm text-muted-foreground break-words">Include: {source.include_selectors}</div>} {/* Added break-words */}
                {source.exclude_selectors && <div className="text-sm text-muted-foreground break-words">Exclude: {source.exclude_selectors}</div>} {/* Added break-words */}
              </CardContent>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0"> {/* Added flex-shrink-0 */}
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
                <div className="mt-4 p-2 bg-secondary text-secondary-foreground rounded-md text-sm w-full" aria-live="polite" aria-atomic="true">
                  {scrapingStatus[source.id]}
                </div>
              )}
            </Card>
          ))}
        </ul>
      </div>

      {/* Add/Edit Source Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4 sm:p-6" id="add-edit-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"> {/* Use bg-black/50 for overlay, added z-50, added ARIA attributes, adjusted padding */}
          <Card className="relative p-6 w-full max-w-lg mx-auto shadow-lg rounded-md bg-background text-foreground"> {/* Adjusted width and centering, added background and text colors */}
            <CardTitle id="modal-title" className="text-xl font-semibold mb-4 text-primary">{editingSource ? 'Edit Source' : 'Add New Source'}</CardTitle> {/* Dynamic title, added id for ARIA label */}
            <form onSubmit={handleModalSubmit} className="space-y-4"> {/* Use modal submit handler */}
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-foreground">Source Name:</Label>
                <Input type="text" id="name" name="name" value={modalFormData.name} onChange={handleModalInputChange} required className="mt-1 block w-full" />
              </div>
              <div>
                <Label htmlFor="url" className="block text-sm font-medium text-foreground">Source URL:</Label>
                <Input type="text" id="url" name="url" value={modalFormData.url} onChange={handleModalInputChange} required className="mt-1 block w-full" />
              </div>
              {/* New: Scraping Method Select */}
              <div>
                <Label htmlFor="scraping_method">Scraping Method:</Label>
                <Select
                  value={modalFormData.scraping_method || 'opensource'}
                  onValueChange={(value) => setModalFormData({ ...modalFormData, scraping_method: value })}
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
              <div className="flex items-center space-x-2">
                <Switch id="enable_ai_summary" name="enable_ai_summary" checked={modalFormData.enable_ai_summary} onCheckedChange={(checked) => setModalFormData({ ...modalFormData, enable_ai_summary: checked })} />
                <Label htmlFor="enable_ai_summary" className="text-sm font-medium text-foreground">Enable AI Summary</Label>
              </div>
              <div>
                <Label htmlFor="include_selectors" className="block text-sm font-medium text-foreground">Include Selectors (comma-separated):</Label>
                <Textarea id="include_selectors" name="include_selectors" value={modalFormData.include_selectors || ''} onChange={handleModalInputChange} rows={3} className="mt-1 block w-full"></Textarea>
              </div>
              <div>
                <Label htmlFor="exclude_selectors" className="block text-sm font-medium text-foreground">Exclude Selectors (comma-separated):</Label>
                <Textarea id="exclude_selectors" name="exclude_selectors" value={modalFormData.exclude_selectors || ''} onChange={handleModalInputChange} rows={3} className="mt-1 block w-full"></Textarea>
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
