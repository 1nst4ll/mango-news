import React, { useState, useEffect } from 'react'; // Import useEffect
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null); // New state for purge status
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false); // New state for purge loading
  // State for global AI summary toggle, initialized from localStorage or default to true
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableGlobalAiSummary');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Effect to save the toggle state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('enableGlobalAiSummary', JSON.stringify(enableGlobalAiSummary));
  }, [enableGlobalAiSummary]);


  const handleTriggerScraper = async () => {
    setLoading(true);
    setScrapingStatus(null);
    try {
      const response = await fetch('/api/scrape/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enableGlobalAiSummary }), // Send the toggle state
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraper');
      }
      setScrapingStatus(data.message || 'Scraper triggered successfully. Check backend logs for progress.');
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
      <nav>
        <ul>
          <li>
            <Link to="/admin/sources">Manage Sources</Link>
          </li>
          <li>
            <div>
              <label>
                <span>Enable AI Summaries for this scrape</span>
                <input
                  type="checkbox"
                  id="enableGlobalAiSummary"
                  name="enableGlobalAiSummary"
                  checked={enableGlobalAiSummary}
                  onChange={(e) => setEnableGlobalAiSummary(e.target.checked)}
                />
              </label>
            </div>
          </li>
          <li>
            <button
              onClick={handleTriggerScraper}
              disabled={loading}
            >
              {loading ? 'Triggering...' : 'Trigger Scraper'}
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
      </nav>
      {scrapingStatus && (
        <div>
          {scrapingStatus}
        </div>
      )}
       {purgeStatus && (
        <div>
          {purgeStatus}
        </div>
      )}
      {/* Admin content will go here */}
    </div>
  );
};

export default AdminDashboard;
