'use client';

'use client';

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import TopicFilter from './TopicFilter'; // Import TopicFilter
import DateRangeFilter from './DateRangeFilter'; // Import DateRangeFilter
import SourceFilter from './SourceFilter'; // Import SourceFilter


interface FilterPanelProps {
  onFilterChange: (filters: {
    searchTerm: string;
    selectedTopics: string[];
    startDate: string | null;
    endDate: string | null;
    selectedSources: string[];
  }) => void;
}

function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const handleApplyFilters = () => {
    onFilterChange({ searchTerm, selectedTopics, startDate, endDate, selectedSources });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTopics([]);
    setStartDate(null);
    setEndDate(null);
    setSelectedSources([]);
    onFilterChange({ searchTerm: '', selectedTopics: [], startDate: null, endDate: null, selectedSources: [] });
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-lg shadow-md">
      {/* Search Input */}
      <div>
        <Label htmlFor="search-input" className="mb-2 block">Search:</Label>
        <Input
          id="search-input"
          type="text"
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Date Range Filter */}
      <div> {/* Date Range Filter is now a direct child */}
        <DateRangeFilter onSelectDateRange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }} />
      </div>


      {/* Other Filters Container */}
      <div className="flex flex-col lg:flex-row gap-6"> {/* Responsive layout for Topic and Source filters */}
        {/* Topic Filter */}
        <div className="flex-1"> {/* Make filter items take equal space */}
          <TopicFilter selectedTopics={selectedTopics} onSelectTopics={setSelectedTopics} />
        </div>

        {/* Source Filter */}
        <div className="flex-1"> {/* Make filter items take equal space */}
          <SourceFilter selectedSources={selectedSources} onSelectSources={setSelectedSources} />
        </div>
      </div>


      {/* Apply and Clear Buttons */}
      <div className="flex gap-4">
        <Button className="flex-1" onClick={handleApplyFilters}>Apply Filters</Button>
        <Button className="flex-1" variant="secondary" onClick={handleClearFilters}>Clear Filters</Button>
      </div>
    </div>
  );
}

export default FilterPanel;
