'use client';

'use client';

import React, { useState } from 'react';
// Import components
import NewsFeed from '@/components/NewsFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components


export default function Home() {
  // Removed filterState and handleFilterChange


  return (
    <div className="flex flex-col min-h-screen container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <main className="flex-grow">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">News Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Removed Filter Panel */}

            {/* Removed Category Tabs */}

            {/* News Feed */}
            <NewsFeed
              searchTerm="" // Default empty search term
              selectedTopics={[]} // Default empty topics
              startDate={null} // Default null start date
              endDate={null} // Default null end date
              selectedSources={[]} // Default empty sources
              activeCategory="all" // Pass a default or remove if not needed in NewsFeed
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
