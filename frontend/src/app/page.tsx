'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// Import components
import NewsFeed from '@/components/NewsFeed';
import TopicFilter from '@/components/TopicFilter';
import DateRangeFilter from '@/components/DateRangeFilter';
import { ThemeSwitcher } from '@/components/theme-switcher';

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
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 bg-background text-foreground min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 py-4 border-b border-border">
        <div className="text-3xl font-bold text-primary mb-4 sm:mb-0">
          <Link href="/">Turks and Caicos News Aggregator</Link>
        </div>
        <div className="flex items-center space-x-4">
          <nav>
            <ul className="flex space-x-4">
              <li><Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin</Link></li>
            </ul>
          </nav>
          <ThemeSwitcher />
        </div>
      </header>

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
