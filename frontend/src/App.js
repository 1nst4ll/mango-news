import React, { useState } from 'react';
import NewsFeed from './components/NewsFeed';
import TopicFilter from './components/TopicFilter';
import DateRangeFilter from './components/DateRangeFilter'; // Import DateRangeFilter


function App() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState(null); // State for start date
  const [endDate, setEndDate] = useState(null); // State for end date


  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
  };

  const handleDateRangeSelect = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div>
      
        <h1>Turks and Caicos News Aggregator</h1>
      
      
        {/* News Feed and Filtering components will go here */}
        
          <h2>News Feed</h2>
          
            <TopicFilter onSelectTopic={handleTopicSelect} /> {/* Add TopicFilter */}
            <DateRangeFilter onSelectDateRange={handleDateRangeSelect} /> {/* Add DateRangeFilter */}
          
        
        <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} /> {/* Pass filter states to NewsFeed */}
      
    </div>
  );
}

export default App;
