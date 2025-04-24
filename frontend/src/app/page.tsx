'use client';

'use client';

import React from 'react';
// Import components
import NewsFeed from '@/components/NewsFeed';
import Header from '@/components/Header'; // Import Header component


export default function Home() {
  // Removed filterState and handleFilterChange


  return (
    <div> {/* Use flex column layout for full height */}
      <Header /> {/* Use Header component */}
      <main> {/* Main content area with padding and centered container */}
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
      </main>
    </div>
  );
}
