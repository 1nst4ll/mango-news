'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch'; // Import shadcn/ui Switch
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components


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
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Database Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-muted-foreground">Loading...</div>
                ) : statsError ? (
                  <div className="text-destructive">{statsError}</div>
                ) : (
                  <div className="text-2xl font-bold">{totalArticles !== null ? totalArticles : 'N/A'}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
              </CardHeader>
              <CardContent>
                 {statsLoading ? (
                  <div className="text-muted-foreground">Loading...</div>
                ) : statsError ? (
                  <div className="text-destructive">{statsError}</div>
                ) : (
                  <div className="text-2xl font-bold">{totalSources !== null ? totalSources : 'N/A'}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="mb-8">
            <ul className="flex flex-col space-y-4">
              <li className="flex items-center">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableGlobalAiSummary"
                    checked={enableGlobalAiSummary}
                    onCheckedChange={(checked) => setEnableGlobalAiSummary(!!checked)}
                  />
                  <Label htmlFor="enableGlobalAiSummary" className="text-foreground">
                    Enable AI Summaries for this scrape
                  </Label>
                </div>
              </li>
              <li>
                <Button
                  onClick={handleTriggerScraper}
                  disabled={loading}
                >
                  {loading ? 'Triggering...' : 'Trigger Full Scraper Run'}
                </Button>
              </li>
              <li>
                <Button
                  onClick={handlePurgeArticles}
                  disabled={purgeLoading}
                  variant="destructive"
                >
                  {purgeLoading ? 'Purging...' : 'Purge All Articles'}
                </Button>
              </li>
            </ul>
          </div>

          {/* Status Messages */}
          {scrapingStatus && (
            <div className="mt-4 p-4 bg-secondary text-secondary-foreground rounded-md" aria-live="polite" aria-atomic="true">
              Scraper Status: {scrapingStatus}
            </div>
          )}
          {purgeStatus && (
            <div className="mt-4 p-4 bg-secondary text-secondary-foreground rounded-md" aria-live="polite" aria-atomic="true">
              Purge Status: {purgeStatus}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
