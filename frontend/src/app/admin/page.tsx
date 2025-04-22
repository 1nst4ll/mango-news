'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Import shadcn/ui Button
import { Checkbox } from '@/components/ui/checkbox'; // Import shadcn/ui Checkbox
import { Label } from '@/components/ui/label'; // Import shadcn/ui Label


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
      <h2 className="text-2xl font-bold mb-6 text-primary">Admin Dashboard</h2>
      <nav className="mb-8">
        <ul className="flex flex-col space-y-4">
          <li>
            <Link href="/admin/sources" className="text-primary hover:underline text-lg">Manage Sources</Link>
          </li>
          <li className="flex items-center">
             <div className="flex items-center space-x-2">
              <Checkbox
                id="enableGlobalAiSummary"
                checked={enableGlobalAiSummary}
                onCheckedChange={(checked: boolean | "indeterminate") => setEnableGlobalAiSummary(!!checked)} // Ensure boolean type
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
              {loading ? 'Triggering...' : 'Trigger Scraper'}
            </Button>
          </li>
          <li>
            <Button
              onClick={handlePurgeArticles}
              disabled={purgeLoading}
              variant="destructive" // Use destructive variant for purge
            >
              {purgeLoading ? 'Purging...' : 'Purge All Articles'}
            </Button>
          </li>
        </ul>
      </nav>
      {scrapingStatus && (
        <div className="mt-4 p-4 bg-secondary text-secondary-foreground rounded-md">
          {scrapingStatus}
        </div>
      )}
       {purgeStatus && (
        <div className="mt-4 p-4 bg-secondary text-secondary-foreground rounded-md">
          {purgeStatus}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
