import React, { useEffect, useState } from 'react';

interface Source {
  id: number;
  name: string;
  url: string;
}

const SourceManagement: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({ name: '', url: '' });
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
        setSources(data);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSource({ ...newSource, [name]: value });
  };

  const handleAddSource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newSource.name || !newSource.url) {
      alert('Please enter both source name and URL.');
      return;
    }
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
      setSources([...sources, addedSource]);
      setNewSource({ name: '', url: '' }); // Clear form
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

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingSource) {
      setEditingSource({ ...editingSource, [name]: value });
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
              <button onClick={() => handleTriggerScraperForSource(source.id)} disabled={scrapingLoading[source.id]} className={`btn btn-sm btn-info mr-2 ${scrapingLoading[source.id] ? 'loading' : ''}`}> {/* Added DaisyUI button classes */}
                {scrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
              </button>
              <button onClick={() => setEditingSource(source)} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mr-2 text-sm">Edit</button>
              <button onClick={() => handleDeleteSource(source.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm">Delete</button>
            </div>
            {scrapingStatus[source.id] && (
              <div className={`mt-2 alert alert-sm ${scrapingStatus[source.id]?.startsWith('Error:') ? 'alert-error' : 'alert-success'}`}> {/* Added DaisyUI alert classes */}
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
            <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline">Save Changes</button>
            <button type="button" onClick={() => setEditingSource(null)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SourceManagement;
