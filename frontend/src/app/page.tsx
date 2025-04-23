'use client';

'use client';

import React, { useState } from 'react';
// Import components
import NewsFeed from '@/components/NewsFeed';
import FilterPanel from '@/components/FilterPanel'; // Import FilterPanel
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components


export default function Home() {
  const [filterState, setFilterState] = useState({
    searchTerm: '',
    selectedTopics: [] as string[],
    startDate: null as string | null,
    endDate: null as string | null,
    selectedSources: [] as string[],
  });

  const handleFilterChange = (filters: {
    searchTerm: string;
    selectedTopics: string[];
    startDate: string | null;
    endDate: string | null;
    selectedSources: string[];
  }) => {
    setFilterState(filters);
  };

  // Removed activeCategory state and handleCategorySelect function


  return (
    <div className="flex flex-col min-h-screen container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <main className="flex-grow">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">News Feed</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Panel */}
            <div className="mb-8"> {/* Added margin-bottom for spacing */}
              <FilterPanel onFilterChange={handleFilterChange} />
            </div>

            {/* Removed Category Tabs */}

            {/* News Feed */}
            <NewsFeed
              searchTerm={filterState.searchTerm}
              selectedTopics={filterState.selectedTopics}
              startDate={filterState.startDate}
              endDate={filterState.endDate}
              selectedSources={filterState.selectedSources}
              activeCategory="all" // Pass a default or remove if not needed in NewsFeed
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
