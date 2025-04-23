'use client';

import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


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
    <div className="flex flex-col gap-4">
      {/* Date Inputs */}
      <div className="flex flex-col sm:flex-row gap-4"> {/* Responsive layout for date inputs */}
        <div className="flex-1"> {/* Make date inputs take equal space */}
          <Label htmlFor="start-date" className="mb-2 block">
            Start Date:
          </Label>
          <Input
            type="date"
            id="start-date"
            value={startDate}
            onChange={handleStartDateChange}
          />
        </div>
        <div className="flex-1"> {/* Make date inputs take equal space */}
          <Label htmlFor="end-date" className="mb-2 block">
            End Date:
          </Label>
          <Input
            type="date"
            id="end-date"
            value={endDate}
            onChange={handleEndDateChange}
          />
        </div>
      </div>

      {/* Apply and Clear Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleApplyFilter} className="flex-1">
          Apply
        </Button>
        <Button onClick={handleClearFilter} className="flex-1" variant="secondary">
          Clear
        </Button>
      </div>
    </div>
  );
}

export default DateRangeFilter;
