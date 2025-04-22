'use client';

import React, { useState } from 'react';

interface DateRangeFilterProps {
  onSelectDateRange: (startDate: string | null, endDate: string | null) => void;
}

function DateRangeFilter({ onSelectDateRange }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const handleApplyFilter = () => {
    // Pass null if the date input is empty
    onSelectDateRange(startDate || null, endDate || null);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    onSelectDateRange(null, null);
  };

  return (
    <div className="flex flex-col">
      <label htmlFor="start-date" className="mb-2 text-sm font-medium text-foreground">
        Start Date:
      </label>
      <input
        type="date"
        id="start-date"
        value={startDate}
        onChange={handleStartDateChange}
        className="block w-full rounded-md border border-border bg-input px-3 py-2 text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary mb-4"
      />
      <label htmlFor="end-date" className="mb-2 text-sm font-medium text-foreground">
        End Date:
      </label>
      <input
        type="date"
        id="end-date"
        value={endDate}
        onChange={handleEndDateChange}
        className="block w-full rounded-md border border-border bg-input px-3 py-2 text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary mb-4"
      />
      <div className="flex gap-4">
        <button
          onClick={handleApplyFilter}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Apply
        </button>
        <button
          onClick={handleClearFilter}
          className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default DateRangeFilter;
