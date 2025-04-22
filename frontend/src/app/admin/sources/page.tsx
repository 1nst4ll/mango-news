'use client';

import React, { useEffect, useState } from 'react';
// import Link from 'next/link'; // Assuming Link is not needed on this page itself, but might be in components used here

interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
}

const SourceManagement: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null });
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [scrapingStatus, setScrapingStatus] = useState<{ [key: number]: string | null }>({});
  const [scrapingLoading, setScrapingLoading] = useState<{ [key: number]: boolean }>({});


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
        })));
      } catch (error: Error) {
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
      setNewSource({ name: '', url: '', enable_ai_summary: true, include_selectors: null, exclude_selectors: null });
    } catch (error: Error) {
      setError(error.message);
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      // TODO: Replace with your actual backend API URL
      const response = await fetch(`http://localhost:3000/api/sources/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setSources(sources.filter(source => source.id !== id));
    } catch (error: Error) {
      setError(error.message);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

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
    } catch (error: Error) {
      setError(error.message);
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
    } catch (error: Error) {
      setScrapingStatus(prev => ({ ...prev, [sourceId]: `Error: ${error.message}` }));
    } finally {
      setScrapingLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h3 className="text-2xl font-bold mb-6">Manage Sources</h3>
      <div className="mb-8">
        <h4 className="text-xl font-semibold mb-4">Existing Sources</h4>
        <ul className="space-y-4">
          {sources.map((source) => (
            <li key={source.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <span className="text-lg font-medium">{source.name}</span> (<a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{source.url}</a>)
                <div className="text-sm text-gray-600">
                  Active: {source.is_active ? 'Yes' : 'No'} | AI Summary: {source.enable_ai_summary ? 'Yes' : 'No'}
                </div>
                {source.include_selectors && <div className="text-sm text-gray-600">Include: {source.include_selectors}</div>}
                {source.exclude_selectors && <div className="text-sm text-gray-600">Exclude: {source.exclude_selectors}</div>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleTriggerScraperForSource(source.id)}
                  disabled={scrapingLoading[source.id]}
                  className={`px-4 py-2 rounded-md text-white text-sm ${scrapingLoading[source.id] ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                >
                  {scrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
                </button>
                <button
                  onClick={() => setEditingSource(source)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm"
                >
                  Delete
                </button>
              </div>
              {scrapingStatus[source.id] && (
                <div className="mt-4 p-2 bg-blue-100 text-blue-800 rounded-md text-sm w-full">
                  {scrapingStatus[source.id]}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-xl font-semibold mb-4">Add New Source</h4>
        <form onSubmit={handleAddSource} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Source Name:</label>
            <input type="text" id="name" name="name" value={newSource.name} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">Source URL:</label>
            <input type="text" id="url" name="url" value={newSource.url} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="enable_ai_summary" name="enable_ai_summary" checked={newSource.enable_ai_summary} onChange={handleInputChange} className="form-checkbox h-4 w-4 text-blue-600 mr-2" />
            <label htmlFor="enable_ai_summary" className="text-sm font-medium text-gray-700">Enable AI Summary</label>
          </div>
          <div>
            <label htmlFor="include_selectors" className="block text-sm font-medium text-gray-700">Include Selectors (comma-separated):</label>
            <textarea id="include_selectors" name="include_selectors" value={newSource.include_selectors || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
          </div>
          <div>
            <label htmlFor="exclude_selectors" className="block text-sm font-medium text-gray-700">Exclude Selectors (comma-separated):</label>
            <textarea id="exclude_selectors" name="exclude_selectors" value={newSource.exclude_selectors || ''} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
          </div>
          <div>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">Add Source</button>
          </div>
        </form>
      </div>


      {editingSource && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h4 className="text-xl font-semibold mb-4">Edit Source</h4>
            <form onSubmit={handleEditSource} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Source Name:</label>
                <input type="text" id="edit-name" name="name" value={editingSource.name} onChange={handleEditInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
              </div>
              <div>
                <label htmlFor="edit-url" className="block text-sm font-medium text-gray-700">Source URL:</label>
                <input type="text" id="edit-url" name="url" value={editingSource.url} onChange={handleEditInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="edit-is_active" name="is_active" checked={editingSource.is_active} onChange={handleEditInputChange} className="form-checkbox h-4 w-4 text-blue-600 mr-2" />
                <label htmlFor="edit-is_active" className="text-sm font-medium text-gray-700">Is Active</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="edit-enable_ai_summary" name="enable_ai_summary" checked={editingSource.enable_ai_summary} onChange={handleEditInputChange} className="form-checkbox h-4 w-4 text-blue-600 mr-2" />
                <label htmlFor="edit-enable_ai_summary" className="text-sm font-medium text-gray-700">Enable AI Summary</label>
              </div>
              <div>
                <label htmlFor="edit-include_selectors" className="block text-sm font-medium text-gray-700">Include Selectors (comma-separated):</label>
                <textarea id="edit-include_selectors" name="include_selectors" value={editingSource.include_selectors || ''} onChange={handleEditInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
              </div>
              <div>
                <label htmlFor="edit-exclude_selectors" className="block text-sm font-medium text-gray-700">Exclude Selectors (comma-separated):</label>
                <textarea id="edit-exclude_selectors" name="exclude_selectors" value={editingSource.exclude_selectors || ''} onChange={handleEditInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
              </div>
              <div className="flex justify-end gap-4">
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">Save Changes</button>
                <button type="button" onClick={() => setEditingSource(null)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceManagement;
