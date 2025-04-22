'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const AdminDashboard: React.FC = () => {
  const [scrapingStatus, setScrapingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [enableGlobalAiSummary, setEnableGlobalAiSummary] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enableGlobalAiSummary');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true; // Default value for server render
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableGlobalAiSummary', JSON.stringify(enableGlobalAiSummary));
    }
  }, [enableGlobalAiSummary]);


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
    } catch (error: Error) {
      setScrapingStatus(`Error: ${error.message}`);
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
    } catch (error: Error) {
      setPurgeStatus(`Error: ${error.message}`);
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      <nav className="mb-8">
        <ul className="flex flex-col space-y-4">
          <li>
            <Link href="/admin/sources" className="text-blue-600 hover:underline text-lg">Manage Sources</Link>
          </li>
          <li className="flex items-center">
            <label htmlFor="enableGlobalAiSummary" className="flex items-center cursor-pointer">
              <span className="mr-2 text-gray-700">Enable AI Summaries for this scrape</span>
              <input
                type="checkbox"
                id="enableGlobalAiSummary"
                name="enableGlobalAiSummary"
                checked={enableGlobalAiSummary}
                onChange={(e) => setEnableGlobalAiSummary(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
            </label>
          </li>
          <li>
            <button
              onClick={handleTriggerScraper}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            >
              {loading ? 'Triggering...' : 'Trigger Scraper'}
            </button>
          </li>
          <li>
            <button
              onClick={handlePurgeArticles}
              disabled={purgeLoading}
              className={`px-4 py-2 rounded-md text-white ${purgeLoading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`}
            >
              {purgeLoading ? 'Purging...' : 'Purge All Articles'}
            </button>
          </li>
        </ul>
      </nav>
      {scrapingStatus && (
        <div className="mt-4 p-4 bg-blue-100 text-blue-800 rounded-md">
          {scrapingStatus}
        </div>
      )}
       {purgeStatus && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md">
          {purgeStatus}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
