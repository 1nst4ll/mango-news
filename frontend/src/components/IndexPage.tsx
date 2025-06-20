"use client";

"use client";

import { useState, useEffect } from 'react';
import NewsFeed from './NewsFeed';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './ui/command'; // Import Command components

import useTranslations from '../lib/hooks/useTranslations'; // Import the shared hook

interface Source {
  id: number;
  name: string;
  url: string;
}

export default function IndexPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSources, setSelectedSources] = useState<number[]>([]);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

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
            placeholder={t.search_articles_placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setDebouncedSearchTerm(searchTerm);
              }
            }}
          />
        </div>
        {/* Source Filter */}
        <div className="md:w-auto flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="md:w-auto">
                {t.sources} ({selectedSources.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full md:w-[200px] p-0"> {/* Removed padding */}
              <Command>
                <CommandInput placeholder={t.search_sources_placeholder || "Search sources..."} />
                <CommandList>
                  <CommandEmpty>{t.no_sources_found}</CommandEmpty>
                  <CommandGroup>
                    {sources.map(source => (
                      <CommandItem
                        key={source.id}
                        onSelect={() => {
                          const isSelected = selectedSources.includes(source.id);
                          if (isSelected) {
                            setSelectedSources(selectedSources.filter(id => id !== source.id));
                          } else {
                            setSelectedSources([...selectedSources, source.id]);
                          }
                        }}
                      >
                        <Checkbox
                          id={`source-${source.id}`}
                          checked={selectedSources.includes(source.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSources([...selectedSources, source.id]);
                            } else {
                              setSelectedSources(selectedSources.filter(id => id !== source.id));
                            }
                          }}
                          className="mr-2"
                        />
                        <Label htmlFor={`source-${source.id}`} className="cursor-pointer">{source.name}</Label>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {/* Reset Filters Button */}
        <div className="md:w-auto flex-shrink-0">
          <Button variant="outline" onClick={handleResetFilters} className="md:w-auto">
            {t.reset_filters}
          </Button>
        </div>
      </div>
      <NewsFeed
        searchTerm={debouncedSearchTerm}
        selectedSources={selectedSources}
        activeCategory="all"
      />
    </div>
  );
}
