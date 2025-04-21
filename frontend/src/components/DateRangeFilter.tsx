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
    <div className="flex items-center space-x-2"> {/* Added flex and spacing */}
      <label className="label p-0"> {/* Added label classes, removed default padding */}
        <span className="label-text">Start Date:</span> {/* Added label text classes */}
      </label>
      <input
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
        className="input input-bordered input-sm w-auto" // Added DaisyUI input classes, size, and auto width
      />
      <label className="label p-0"> {/* Added label classes, removed default padding */}
        <span className="label-text">End Date:</span> {/* Added label text classes */}
      </label>
      <input
        type="date"
        value={endDate}
        onChange={handleEndDateChange}
        className="input input-bordered input-sm w-auto" // Added DaisyUI input classes, size, and auto width
      />
      <button onClick={handleApplyFilter} className="btn btn-primary btn-sm"> {/* Added DaisyUI button classes and size */}
        Apply
      </button>
      <button onClick={handleClearFilter} className="btn btn-ghost btn-sm"> {/* Added DaisyUI button classes and size */}
        Clear
      </button>
    </div>
  );
}

export default DateRangeFilter;
