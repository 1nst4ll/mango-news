import React, { useEffect, useState } from 'react';

interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean; // Added is_active based on backend
  enable_ai_summary: boolean; // Added enable_ai_summary
  include_selectors: string | null; // Added include_selectors
  exclude_selectors: string | null; // Added exclude_selectors
}

const SourceManagement: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Added new selector settings with default null
  const [newSource, setNewSource] = useState({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null });
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<{ [key: number]: string | null }>({}); // State to track scraping status per source
  const [scrapingLoading, setScrapingLoading] = useState<{ [key: number]: boolean }>({}); // State to track loading state per source


  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/sources');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched sources:', data); // Log fetched data
        // Ensure fetched sources have all properties, default to appropriate values if missing
        setSources(data.map((source: Source) => ({
          ...source,
          enable_ai_summary: source.enable_ai_summary !== undefined ? source.enable_ai_summary : true,
          is_active: source.is_active !== undefined ? source.is_active : true,
          include_selectors: source.include_selectors !== undefined ? source.include_selectors : null, // Default to null
          exclude_selectors: source.exclude_selectors !== undefined ? source.exclude_selectors : null, // Default to null
        })));
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  if (loading) {
    return <div>Loading sources...</div>;
  }

  if (error) {
    return <div>Error loading sources: {error}</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // Allow textarea changes
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked; // Cast to HTMLInputElement to access checked

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
    console.log('Adding new source:', newSource); // Log data being sent
    try {
      const response = await fetch('/api/sources', {
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
      console.log('Added source response:', addedSource); // Log response data
      setSources([...sources, addedSource]);
      // Clear form and reset toggles/inputs to default values
      setNewSource({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setSources(sources.filter(source => source.id !== id));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // Allow textarea changes
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked; // Cast to HTMLInputElement to access checked

    if (editingSource) {
      setEditingSource({
        ...editingSource,
        [name]: type === 'checkbox' ? checked : value,
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

    console.log('Editing source:', editingSource); // Log data being sent
    try {
      const response = await fetch(`/api/sources/${editingSource.id}`, {
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
      console.log('Updated source response:', updatedSource); // Log response data
      setSources(sources.map(source => source.id === updatedSource.id ? updatedSource : source));
      setEditingSource(null); // Close edit form
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleTriggerScraperForSource = async (sourceId: number) => {
    setScrapingLoading(prev => ({ ...prev, [sourceId]: true }));
    setScrapingStatus(prev => ({ ...prev, [sourceId]: null }));
    try {
      const response = await fetch(`/api/scrape/run/${sourceId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper for source');
      }
      setScrapingStatus(prev => ({ ...prev, [sourceId]: data.message || 'Scraper triggered successfully.' }));
    } catch (error: any) {
      setScrapingStatus(prev => ({ ...prev, [sourceId]: `Error: ${error.message}` }));
    } finally {
      setScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };


  return (
    <div>
      <h3>Manage Sources</h3>
      <ul>
        {sources.map((source) => (
          <li key={source.id} className="mb-2 flex justify-between items-center">
            <span>{source.name} ({source.url})</span>
            <div>
              <button onClick={() => handleTriggerScraperForSource(source.id)} disabled={scrapingLoading[source.id]} className={`btn btn-sm btn-info mr-2 ${scrapingLoading[source.id] ? 'loading' : ''}`}>
                {scrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
              </button>
              <button onClick={() => setEditingSource(source)} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mr-2 text-sm">Edit</button>
              <button onClick={() => handleDeleteSource(source.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm">Delete</button>
            </div>
            {scrapingStatus[source.id] && (
              <div className={`mt-2 alert alert-sm ${scrapingStatus[source.id]?.startsWith('Error:') ? 'alert-error' : 'alert-success'}`}>
                {scrapingStatus[source.id]}
              </div>
            )}
          </li>
        ))}
      </ul>

      <h4 className="text-xl font-semibold mt-8 mb-2">Add New Source</h4>
      <form onSubmit={handleAddSource}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Source Name:</label>
          <input type="text" id="name" name="name" value={newSource.name} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-4">
          <label htmlFor="url" className="block text-gray-700 text-sm font-bold mb-2">Source URL:</label>
          <input type="text" id="url" name="url" value={newSource.url} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
        </div>
        <div className="mb-4">
          <label htmlFor="enable_ai_summary" className="block text-gray-700 text-sm font-bold mb-2">Enable AI Summary:</label>
          <input type="checkbox" id="enable_ai_summary" name="enable_ai_summary" checked={newSource.enable_ai_summary} onChange={handleInputChange} className="form-checkbox h-5 w-5 text-blue-600" /> {/* Added checkbox */}
        </div>
        {/* Added new cleaning settings text areas */}
        <div className="mb-4">
          <label htmlFor="include_selectors" className="block text-gray-700 text-sm font-bold mb-2">Include Selectors (comma-separated):</label>
          <textarea id="include_selectors" name="include_selectors" value={newSource.include_selectors || ''} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
        </div>
        <div className="mb-4">
          <label htmlFor="exclude_selectors" className="block text-gray-700 text-sm font-bold mb-2">Exclude Selectors (comma-separated):</label>
          <textarea id="exclude_selectors" name="exclude_selectors" value={newSource.exclude_selectors || ''} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Add Source</button>
      </form>

      {editingSource && (
        <div className="mt-8">
          <h4 className="text-xl font-semibold mb-2">Edit Source</h4>
          <form onSubmit={handleEditSource}>
            <div className="mb-4">
              <label htmlFor="edit-name" className="block text-gray-700 text-sm font-bold mb-2">Source Name:</label>
              <input type="text" id="edit-name" name="name" value={editingSource.name} onChange={handleEditInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="mb-4">
              <label htmlFor="edit-url" className="block text-gray-700 text-sm font-bold mb-2">Source URL:</label>
              <input type="text" id="edit-url" name="url" value={editingSource.url} onChange={handleEditInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </div>
            <div className="mb-4">
              <label htmlFor="edit-is_active" className="block text-gray-700 text-sm font-bold mb-2">Is Active:</label>
              <input type="checkbox" id="edit-is_active" name="is_active" checked={editingSource.is_active} onChange={handleEditInputChange} className="form-checkbox h-5 w-5 text-blue-600" /> {/* Added is_active toggle */}
            </div>
            <div className="mb-4">
              <label htmlFor="edit-enable_ai_summary" className="block text-gray-700 text-sm font-bold mb-2">Enable AI Summary:</label>
              <input type="checkbox" id="edit-enable_ai_summary" name="enable_ai_summary" checked={editingSource.enable_ai_summary} onChange={handleEditInputChange} className="form-checkbox h-5 w-5 text-blue-600" /> {/* Added enable_ai_summary toggle */}
            </div>
            {/* Added new cleaning settings text areas */}
            <div className="mb-4">
              <label htmlFor="edit-include_selectors" className="block text-gray-700 text-sm font-bold mb-2">Include Selectors (comma-separated):</label>
              <textarea id="edit-include_selectors" name="include_selectors" value={editingSource.include_selectors || ''} onChange={handleEditInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
            </div>
            <div className="mb-4">
              <label htmlFor="edit-exclude_selectors" className="block text-gray-700 text-sm font-bold mb-2">Exclude Selectors (comma-separated):</label>
              <textarea id="edit-exclude_selectors" name="exclude_selectors" value={editingSource.exclude_selectors || ''} onChange={handleEditInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
            </div>
            <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline">Save Changes</button>
            <button type="button" onClick={() => setEditingSource(null)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SourceManagement;
