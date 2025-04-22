'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex justify-between items-center mb-8">
        <div className="text-2xl font-bold">
          <Link href="/">Turks and Caicos News Aggregator</Link>
        </div>
        <nav>
          <ul>
            <li><Link href="/admin">Admin</Link></li>
          </ul>
        </nav>
      </header>

      <main>
        <h2 className="text-xl font-semibold mb-4">News Feed</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <TopicFilter onSelectTopic={handleTopicSelect} />
          <DateRangeFilter onSelectDateRange={handleDateRangeSelect} />
        </div>
        <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} />
      </main>
    </div>
  );
}
