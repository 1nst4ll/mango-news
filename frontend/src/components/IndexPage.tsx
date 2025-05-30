"use client";

"use client";

import { useState, useEffect } from 'react';
import NewsFeed from './NewsFeed';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

// Import locale files
import en from '../locales/en.json';
import es from '../locales/es.json';
import ht from '../locales/ht.json';

const locales = { en, es, ht };

// Helper hook for translations (duplicate from NewsFeed for now, could be refactored)
const useTranslations = () => {
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const localeFromPath = pathSegments[1];
    if (locales[localeFromPath as keyof typeof locales]) {
      setCurrentLocale(localeFromPath);
    } else {
      setCurrentLocale('en'); // Fallback
    }
  }, []);

  const t = locales[currentLocale as keyof typeof locales];
  return { t, currentLocale };
};

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
            <PopoverContent className="w-full md:w-[200px] p-2">
              {sources.map(source => (
                <div
                  key={source.id}
                  className="flex items-center space-x-2 py-1 cursor-pointer"
                  onClick={() => {
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
                    onCheckedChange={(checked) => {
                       if (checked) {
                        setSelectedSources([...selectedSources, source.name]);
                      } else {
                        setSelectedSources(selectedSources.filter(name => name !== source.name));
                      }
                    }}
                    className="mr-2"
                  />
                  <Label htmlFor={`source-${source.id}`} className="cursor-pointer">{source.name}</Label>
                </div>
              ))}
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
