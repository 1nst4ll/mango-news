'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header'; // Import Header component


const AdminDashboard: React.FC = () => {
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(true); // Initialize with true on the server
  const [totalArticles, setTotalArticles] = useState<number | null>(null); // State for total articles
  const [totalSources, setTotalSources] = useState<number | null>(null); // State for total sources
  const [statsLoading, setStatsLoading] = useState<boolean>(true); // State for stats loading
  const [statsError, setStatsError] = useState<string | null>(null); // State for stats error


  useEffect(() => {
    // Synchronize state with localStorage on the client side
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableGlobalAiSummary');
      if (saved !== null) {
        setEnableGlobalAiSummary(JSON.parse(saved));
      }
    }

    // Fetch database statistics
    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        // TODO: Implement backend endpoint for statistics (e.g., /api/stats)
        const response = await fetch('http://localhost:3000/api/stats'); // Hypothetical endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTotalArticles(data.totalArticles);
        setTotalSources(data.totalSources);
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

  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Save state to localStorage whenever it changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiSummary', JSON.stringify(enableGlobalAiSummary));
    }
  }, [enableGlobalAiSummary]); // Save when enableGlobalAiSummary changes


  const handleTriggerScraper = async () => {
    setLoading(true);
    setScrapingStatus(null);
    try {
      // TODO: Replace with your actual backend API URL
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
      // TODO: Replace with your actual backend API URL
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
      setPurgeLoading(false); // Corrected: setPurgeLoading to false
    }
  };

  return (
    <div>
      <Header /> {/* Use Header component */}
      <h3>Admin Dashboard</h3>

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
              <div>{totalArticles !== null ? totalArticles : 'N/A'}</div>
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
              <div>{totalSources !== null ? totalSources : 'N/A'}</div>
            )}
          </div>
        </div>
      </div>

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
  );
};

export default AdminDashboard;
