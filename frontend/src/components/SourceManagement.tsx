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
    <div className="p-4"> {/* Added padding */}
      <h3 className="text-2xl font-bold mb-4">Manage Sources</h3> {/* Added text size and bold */}
      <ul className="space-y-4"> {/* Added space between list items */}
        {sources.map((source) => (
          <li key={source.id} className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4"> {/* Added flex for layout, border, and padding */}
            <div className="mb-2 md:mb-0"> {/* Added margin bottom for mobile */}
              <span className="font-semibold">{source.name}</span> ({source.url})
            </div>
            <div className="flex flex-wrap gap-2"> {/* Added flex and gap for buttons */}
              <button onClick={() => handleTriggerScraperForSource(source.id)} disabled={scrapingLoading[source.id]} className={`btn btn-info btn-sm ${scrapingLoading[source.id] ? 'loading' : ''}`}>
                {scrapingLoading[source.id] ? 'Scraping...' : 'Scrape Now'}
              </button>
              <button onClick={() => setEditingSource(source)} className="btn btn-warning btn-sm">Edit</button> {/* DaisyUI warning button */}
              <button onClick={() => handleDeleteSource(source.id)} className="btn btn-error btn-sm">Delete</button> {/* DaisyUI error button */}
            </div>
            {scrapingStatus[source.id] && (
              <div role="alert" className={`alert alert-sm mt-2 w-full ${scrapingStatus[source.id]?.startsWith('Error:') ? 'alert-error' : 'alert-success'}`}> {/* Added role="alert", DaisyUI alert classes, size, and full width */}
                {scrapingStatus[source.id]}
              </div>
            )}
          </li>
        ))}
      </ul>

      <h4 className="text-xl font-semibold mt-8 mb-4">Add New Source</h4> {/* Added margin bottom */}
      <form onSubmit={handleAddSource} className="space-y-4"> {/* Added space between form groups */}
        <div className="form-control"> {/* DaisyUI form control */}
          <label htmlFor="name" className="label"> {/* DaisyUI label */}
            <span className="label-text">Source Name:</span> {/* DaisyUI label text */}
          </label>
          <input type="text" id="name" name="name" value={newSource.name} onChange={handleInputChange} className="input input-bordered w-full" /> {/* DaisyUI input */}
        </div>
        <div className="form-control"> {/* DaisyUI form control */}
          <label htmlFor="url" className="label"> {/* DaisyUI label */}
            <span className="label-text">Source URL:</span> {/* DaisyUI label text */}
          </label>
          <input type="text" id="url" name="url" value={newSource.url} onChange={handleInputChange} className="input input-bordered w-full" /> {/* DaisyUI input */}
        </div>
        <div className="form-control"> {/* DaisyUI form control */}
          <label htmlFor="enable_ai_summary" className="label cursor-pointer"> {/* DaisyUI label */}
            <span className="label-text">Enable AI Summary:</span> {/* DaisyUI label text */}
            <input type="checkbox" id="enable_ai_summary" name="enable_ai_summary" checked={newSource.enable_ai_summary} onChange={handleInputChange} className="toggle toggle-primary" /> {/* DaisyUI toggle */}
          </label>
        </div>
        {/* Added new cleaning settings text areas */}
        <div className="form-control"> {/* DaisyUI form control */}
          <label htmlFor="include_selectors" className="label"> {/* DaisyUI label */}
            <span className="label-text">Include Selectors (comma-separated):</span> {/* DaisyUI label text */}
          </label>
          <textarea id="include_selectors" name="include_selectors" value={newSource.include_selectors || ''} onChange={handleInputChange} className="textarea textarea-bordered h-24 w-full"></textarea> {/* DaisyUI textarea */}
        </div>
        <div className="form-control"> {/* DaisyUI form control */}
          <label htmlFor="exclude_selectors" className="label"> {/* DaisyUI label */}
            <span className="label-text">Exclude Selectors (comma-separated):</span> {/* DaisyUI label text */}
          </label>
          <textarea id="exclude_selectors" name="exclude_selectors" value={newSource.exclude_selectors || ''} onChange={handleInputChange} className="textarea textarea-bordered h-24 w-full"></textarea> {/* DaisyUI textarea */}
        </div>
        <button type="submit" className="btn btn-primary">Add Source</button> {/* DaisyUI primary button */}
      </form>

      {editingSource && (
        <div className="mt-8 p-4 border rounded-md bg-base-200"> {/* Added padding, border, rounded corners, and background */}
          <h4 className="text-xl font-semibold mb-4">Edit Source</h4> {/* Added margin bottom */}
          <form onSubmit={handleEditSource} className="space-y-4"> {/* Added space between form groups */}
            <div className="form-control"> {/* DaisyUI form control */}
              <label htmlFor="edit-name" className="label"> {/* DaisyUI label */}
                <span className="label-text">Source Name:</span> {/* DaisyUI label text */}
              </label>
              <input type="text" id="edit-name" name="name" value={editingSource.name} onChange={handleEditInputChange} className="input input-bordered w-full" /> {/* DaisyUI input */}
            </div>
            <div className="form-control"> {/* DaisyUI form control */}
              <label htmlFor="edit-url" className="label"> {/* DaisyUI label */}
                <span className="label-text">Source URL:</span> {/* DaisyUI label text */}
              </label>
              <input type="text" id="edit-url" name="url" value={editingSource.url} onChange={handleEditInputChange} className="input input-bordered w-full" /> {/* DaisyUI input */}
            </div>
            <div className="form-control"> {/* DaisyUI form control */}
              <label htmlFor="edit-is_active" className="label cursor-pointer"> {/* DaisyUI label */}
                <span className="label-text">Is Active:</span> {/* DaisyUI label text */}
                <input type="checkbox" id="edit-is_active" name="is_active" checked={editingSource.is_active} onChange={handleEditInputChange} className="toggle toggle-primary" /> {/* DaisyUI toggle */}
              </label>
            </div>
            <div className="form-control"> {/* DaisyUI form control */}
              <label htmlFor="edit-enable_ai_summary" className="label cursor-pointer"> {/* DaisyUI label */}
                <span className="label-text">Enable AI Summary:</span> {/* DaisyUI label text */}
                <input type="checkbox" id="edit-enable_ai_summary" name="enable_ai_summary" checked={editingSource.enable_ai_summary} onChange={handleEditInputChange} className="toggle toggle-primary" /> {/* DaisyUI toggle */}
              </label>
            </div>
            {/* Added new cleaning settings text areas */}
            <div className="form-control"> {/* DaisyUI form control */}
              <label htmlFor="edit-include_selectors" className="label"> {/* DaisyUI label */}
                <span className="label-text">Include Selectors (comma-separated):</span> {/* DaisyUI label text */}
              </label>
              <textarea id="edit-include_selectors" name="include_selectors" value={editingSource.include_selectors || ''} onChange={handleEditInputChange} className="textarea textarea-bordered h-24 w-full"></textarea> {/* DaisyUI textarea */}
            </div>
            <div className="form-control"> {/* DaisyUI form control */}
              <label htmlFor="edit-exclude_selectors" className="label"> {/* DaisyUI label */}
                <span className="label-text">Exclude Selectors (comma-separated):</span> {/* DaisyUI label text */}
              </label>
              <textarea id="edit-exclude_selectors" name="exclude_selectors" value={editingSource.exclude_selectors || ''} onChange={handleEditInputChange} className="textarea textarea-bordered h-24 w-full"></textarea> {/* DaisyUI textarea */}
            </div>
            <div className="flex gap-2"> {/* Added flex and gap for buttons */}
              <button type="submit" className="btn btn-success">Save Changes</button> {/* DaisyUI success button */}
              <button type="button" onClick={() => setEditingSource(null)} className="btn btn-ghost">Cancel</button> {/* DaisyUI ghost button */}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SourceManagement;
