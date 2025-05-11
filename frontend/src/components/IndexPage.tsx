"use client";

"use client";

import { useState, useEffect } from 'react';
import NewsFeed from './NewsFeed';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface Source {
  id: number;
  name: string;
  url: string;
}

export default function IndexPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Fetch sources only once on mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
        const sourcesResponse = await fetch(`${apiUrl}/api/sources`);
        if (sourcesResponse.ok) {
          const sourcesData: Source[] = await sourcesResponse.json();
          setSources(sourcesData);
        } else {
          console.error('Error fetching sources:', sourcesResponse.status);
        }
      } catch (error) {
        console.error('Error fetching sources:', error);
        setSources([]);
      }
    };
    fetchSources();
  }, []); // Fetch sources only once on mount


  // Debounce effect for search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Only re-run if searchTerm changes


  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSources([]);
    setDebouncedSearchTerm(''); // Reset debounced term
  };

  return (
    <div className="container mx-auto p-4">
      {/* Added flex-wrap and adjusted gap for wrapping */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Search Input */}
        <div className="w-full md:w-auto flex-grow"> {/* Added w-full for small screens, flex-grow for larger */}
          <Input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Trigger search immediately on Enter
                setDebouncedSearchTerm(searchTerm);
              }
            }}
          />
        </div>
        {/* Source Filter */}
        <div className="md:w-auto flex-shrink-0"> {/* Removed w-full */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="md:w-auto"> {/* Removed w-full */}
                Sources ({selectedSources.length})
              </Button>
            </PopoverTrigger>
            {/* Adjusted width for mobile friendliness */}
            <PopoverContent className="w-full md:w-[200px] p-2">
              {sources.map(source => (
                // Wrap Checkbox and Label in a div for larger touch target
                <div
                  key={source.id}
                  className="flex items-center space-x-2 py-1 cursor-pointer" // Added vertical padding and cursor-pointer
                  onClick={() => {
                    // Toggle the checkbox state when the div is clicked
                    const isSelected = selectedSources.includes(source.name);
                    if (isSelected) {
                      setSelectedSources(selectedSources.filter(name => name !== source.name));
                    } else {
                      setSelectedSources([...selectedSources, source.name]);
                    }
                  }}
                >
                  <Checkbox
                    id={`source-${source.id}`}
                    checked={selectedSources.includes(source.name)}
                    // onCheckedChange is still needed for direct checkbox clicks
                    onCheckedChange={(checked) => {
                       if (checked) {
                        setSelectedSources([...selectedSources, source.name]);
                      } else {
                        setSelectedSources(selectedSources.filter(name => name !== source.name));
                      }
                    }}
                    className="mr-2" // Add some margin to the right of the checkbox
                  />
                  <Label htmlFor={`source-${source.id}`} className="cursor-pointer">{source.name}</Label> {/* Added cursor-pointer to label */}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        {/* Reset Filters Button */}
        <div className="md:w-auto flex-shrink-0"> {/* Removed w-full */}
          <Button variant="outline" onClick={handleResetFilters} className="md:w-auto"> {/* Removed w-full */}
            Reset Filters
          </Button>
        </div>
      </div>
      <NewsFeed
        searchTerm={debouncedSearchTerm} // Pass debouncedSearchTerm to NewsFeed
        selectedSources={selectedSources} // Pass selectedSources directly
        activeCategory="all" // Pass a default value for activeCategory
      />
    </div>
  );
}
