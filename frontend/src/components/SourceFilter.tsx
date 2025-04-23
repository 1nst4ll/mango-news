'use client';

import React, { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDownIcon } from 'lucide-react'; // Import an icon for the dropdown trigger


interface Source {
  id: number;
  name: string;
  // Add other source properties if needed
}

interface SourceFilterProps {
  selectedSources: string[];
  onSelectSources: (sources: string[]) => void;
}

function SourceFilter({ selectedSources, onSelectSources }: SourceFilterProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL for sources
        const response = await fetch('http://localhost:3000/api/sources'); // Assuming a /api/sources endpoint
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Source[] = await response.json();
        setSources(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('An unknown error occurred'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  if (loading) {
    return (
      <div>
        Loading sources...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        Error loading sources: {error.message}
      </div>
    );
  }

  const handleCheckboxChange = (sourceName: string, isChecked: boolean) => {
    if (isChecked) {
      onSelectSources([...selectedSources, sourceName]);
    } else {
      onSelectSources(selectedSources.filter(source => source !== sourceName));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Filter by Source:</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selectedSources.length > 0 ? `${selectedSources.length} selected` : "Select Sources"}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
          <DropdownMenuLabel>Sources</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sources.map((source) => (
            <DropdownMenuCheckboxItem
              key={`source-${source.id}`}
              checked={selectedSources.includes(source.name)}
              onCheckedChange={(isChecked) => handleCheckboxChange(source.name, isChecked)}
            >
              {source.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default SourceFilter;
