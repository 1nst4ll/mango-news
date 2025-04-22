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
      <label htmlFor="start-date" className="mb-1 text-sm font-medium text-gray-700">
        Start Date:
      </label>
      <input
        type="date"
        id="start-date"
        value={startDate}
        onChange={handleStartDateChange}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mb-4"
      />
      <label htmlFor="end-date" className="mb-1 text-sm font-medium text-gray-700">
        End Date:
      </label>
      <input
        type="date"
        id="end-date"
        value={endDate}
        onChange={handleEndDateChange}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mb-4"
      />
      <div className="flex gap-4">
        <button
          onClick={handleApplyFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Apply
        </button>
        <button
          onClick={handleClearFilter}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default DateRangeFilter;
