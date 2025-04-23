'use client';

'use client';

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker"; // Import DatePicker


interface FilterPanelProps {
  onFilterChange: (filters: {
    searchTerm: string;
    date: Date | undefined;
  }) => void;
}

function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleFilterChange = (newSearchTerm: string, newDate: Date | undefined) => {
    onFilterChange({ searchTerm: newSearchTerm, date: newDate });
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-card rounded-lg shadow-md">
      {/* Search Input */}
      <div className="flex-1"> {/* Make search input take equal space */}
        <Label htmlFor="search-input" className="mb-2 block">Search:</Label>
        <Input
          id="search-input"
          type="text"
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleFilterChange(e.target.value, date);
          }}
        />
      </div>

      {/* Date Picker */}
      <div className="flex-1"> {/* Make date picker take equal space */}
        <Label htmlFor="date-picker" className="mb-2 block">Date:</Label>
        <DatePicker
          selected={date}
          onSelect={(newDate) => {
            setDate(newDate);
            handleFilterChange(searchTerm, newDate);
          }}
        />
      </div>
    </div>
  );
}

export default FilterPanel;
