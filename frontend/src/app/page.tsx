'use client';

import React, { useState } from 'react';
// Import components
import NewsFeed from '@/components/NewsFeed';
import TopicFilter from '@/components/TopicFilter';
import DateRangeFilter from '@/components/DateRangeFilter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react'; // Import Search and RefreshCw icons


export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [activeCategory, setActiveCategory] = useState('all'); // State for active category tab
  const [isDiscovering, setIsDiscovering] = useState(false); // State for discovery loading
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null); // State for discovery message

  // List of available categories (matching the example)
  const categoriesList = [
    { name: 'All News', value: 'all' },
    { name: 'Local News', value: 'news' },
    { name: 'Government', value: 'government' },
    { name: 'Police', value: 'police' },
    { name: 'Social Media', value: 'social' },
    { name: 'International', value: 'international' },
    // Add Verified and Official categories if needed for filtering,
    // but they might be better as indicators on cards
  ];


  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleDateRangeSelect = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
  };

  // Simulate source discovery
  const discoverNewSources = () => {
    setIsDiscovering(true);
    setDiscoveryMessage(null);

    // Simulate API call delay
    setTimeout(() => {
      // Simulate finding 3-7 new sources
      const sourcesFound = Math.floor(Math.random() * 5) + 3;
      setDiscoveryMessage(`Discovery complete! Found ${sourcesFound} new news sources.`);
      setIsDiscovering(false);
    }, 3000);
  };


  return (
    <div className="flex flex-col min-h-screen">
      <main>
        <h2 className="text-2xl font-bold mb-6 text-primary">News Feed</h2>

        {/* Search Bar and Discover Sources Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex items-center flex-grow">
            <Input
              type="text"
              placeholder="Search news..."
              className="w-full pr-10" // Add padding to the right for the icon
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Search className="absolute right-3 h-5 w-5 text-muted-foreground" />
          </div>
           <Button
            onClick={discoverNewSources}
            disabled={isDiscovering}
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isDiscovering ? 'animate-spin' : ''}`} />
            {isDiscovering ? 'Searching...' : 'Discover Sources'}
          </Button>
        </div>

        {/* Discovery Message */}
        {discoveryMessage && (
          <div className="mt-2 p-3 bg-secondary text-secondary-foreground rounded-md mb-6">
            {discoveryMessage}
          </div>
        )}


        {/* Filters and Category Tabs */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-6 lg:w-1/3">
            <div className="w-full sm:w-1/2 lg:w-full">
               <TopicFilter onSelectTopic={handleTopicSelect} />
            </div>
            <div className="w-full sm:w-1/2 lg:w-full">
              <DateRangeFilter onSelectDateRange={handleDateRangeSelect} />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex-grow overflow-x-auto">
            <div className="flex space-x-4 pb-2"> {/* Added pb-2 for potential scrollbar */}
              {categoriesList.map(category => (
                <Button
                  key={category.value}
                  variant={activeCategory === category.value ? 'default' : 'outline'}
                  onClick={() => handleCategorySelect(category.value)}
                  className="flex-shrink-0" // Prevent buttons from shrinking
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* News Feed */}
        <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} searchTerm={searchTerm} activeCategory={activeCategory} /> {/* Pass search and category props */}
      </main>
    </div>
  );
}
