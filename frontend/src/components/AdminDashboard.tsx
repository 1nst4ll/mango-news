import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null); // New state for purge status
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false); // New state for purge loading

  const handleTriggerScraper = async () => {
    setLoading(true);
    setScrapingStatus(null);
    try {
      const response = await fetch('/api/scrape/run', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper');
      }
      setScrapingStatus(data.message || 'Scraper triggered successfully.');
    } catch (error: any) {
      setScrapingStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeArticles = async () => { // New handler for purging articles
    if (!window.confirm('Are you sure you want to delete ALL articles? This action cannot be undone.')) {
      return; // User cancelled
    }

    setPurgeLoading(true);
    setPurgeStatus(null);
    try {
      const response = await fetch('/api/articles/purge', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to purge articles');
      }
      setPurgeStatus(data.message || 'All articles purged successfully.');
    } catch (error: any) {
      setPurgeStatus(`Error: ${error.message}`);
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <nav className="mt-4">
        <ul>
          <li>
            <Link to="/admin/sources" className="text-blue-500 hover:underline">Manage Sources</Link>
          </li>
          <li className="mt-2"> {/* Added margin top */}
            <button
              onClick={handleTriggerScraper}
              disabled={loading}
              className={`btn btn-primary ${loading ? 'loading' : ''}`} // Added DaisyUI button classes
            >
              {loading ? 'Triggering...' : 'Trigger Scraper'}
            </button>
          </li>
          <li className="mt-2"> {/* Added margin top */}
            <button
              onClick={handlePurgeArticles} // New handler for purge
              disabled={purgeLoading} // New loading state for purge
              className={`btn btn-sm btn-error ${purgeLoading ? 'loading' : ''}`} // Added DaisyUI button classes
            >
              {purgeLoading ? 'Purging...' : 'Purge All Articles'}
            </button>
          </li>
        </ul>
      </nav>
      {scrapingStatus && (
        <div className={`mt-4 alert ${scrapingStatus.startsWith('Error:') ? 'alert-error' : 'alert-success'}`}> {/* Added DaisyUI alert classes */}
          {scrapingStatus}
        </div>
      )}
       {purgeStatus && ( // Display purge status
        <div className={`mt-4 alert ${purgeStatus.startsWith('Error:') ? 'alert-error' : 'alert-success'}`}> {/* Added DaisyUI alert classes */}
          {purgeStatus}
        </div>
      )}
      {/* Admin content will go here */}
    </div>
  );
};

export default AdminDashboard;
