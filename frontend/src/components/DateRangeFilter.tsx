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
    <div>
      <label>
        <span>Start Date:</span>
      </label>
      <input
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
      />
      <label>
        <span>End Date:</span>
      </label>
      <input
        type="date"
        value={endDate}
        onChange={handleEndDateChange}
      />
      <button onClick={handleApplyFilter}>
        Apply
      </button>
      <button onClick={handleClearFilter}>
        Clear
      </button>
    </div>
  );
}

export default DateRangeFilter;
