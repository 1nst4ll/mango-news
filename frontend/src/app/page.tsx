'use client';

'use client';

import React from 'react';
// Import components
import NewsFeed from '@/components/NewsFeed';
import Header from '@/components/Header'; // Import Header component


export default function Home() {
  // Removed filterState and handleFilterChange


  return (
    <div className="flex min-h-screen flex-col"> {/* Use flex column layout for full height */}
      <Header /> {/* Use Header component */}
      <main className="flex-grow container mx-auto px-4 py-8"> {/* Main content area with padding and centered container */}
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
