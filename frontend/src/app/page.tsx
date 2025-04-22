'use client';

import React, { useState } from 'react';
// Import components
import NewsFeed from '@/components/NewsFeed';
import TopicFilter from '@/components/TopicFilter';
import DateRangeFilter from '@/components/DateRangeFilter';

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleDateRangeSelect = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main>
        <h2 className="text-2xl font-semibold mb-6 text-primary">News Feed</h2>
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="w-full sm:w-1/2">
             <TopicFilter onSelectTopic={handleTopicSelect} />
          </div>
          <div className="w-full sm:w-1/2">
            <DateRangeFilter onSelectDateRange={handleDateRangeSelect} />
          </div>
        </div>
        <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} />
      </main>
    </div>
  );
}
