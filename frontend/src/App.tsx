import React, { useState } from 'react';
import NewsFeed from './components/NewsFeed';
import TopicFilter from './components/TopicFilter';
import DateRangeFilter from './components/DateRangeFilter'; // Import DateRangeFilter
import './index.css'; // Import Tailwind CSS

function App() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null); // State for start date
  const [endDate, setEndDate] = useState<string | null>(null); // State for end date


  const handleTopicSelect = (topic: string) => { // Added type annotation
    setSelectedTopic(topic);
  };

  const handleDateRangeSelect = (start: string | null, end: string | null) => { // Added type annotation
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="container mx-auto p-4"> {/* Added Tailwind container and padding */}
      
        <h1 className="text-3xl font-bold mb-4">Turks and Caicos News Aggregator</h1> {/* Added Tailwind classes */}
      
      
        {/* News Feed and Filtering components will go here */}
        
          <h2 className="text-2xl font-semibold mb-4">News Feed</h2> {/* Added Tailwind classes */}
          <div className="flex flex-wrap gap-4 mb-4"> {/* Added flex container for filters */}
            <TopicFilter onSelectTopic={handleTopicSelect} /> {/* Add TopicFilter */}
            <DateRangeFilter onSelectDateRange={handleDateRangeSelect} /> {/* Add DateRangeFilter */}
          </div>
        
        <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} /> {/* Pass filter states to NewsFeed */}
      
    </div> // Changed fragment to div and added Tailwind classes
  );
}

export default App;
