'use client'; // Make it a client component to use useEffect and useState

import React, { useEffect, useState } from 'react';
import { CheckCircle, Shield, Facebook } from 'lucide-react'; // Import icons for indicators

interface Source {
  id: number;
  name: string;
  url: string;
  // Include other properties if needed for display in the footer
}

const Footer: React.FC = () => {
  const [newsSources, setNewsSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        const response = await fetch('http://localhost:3000/api/sources');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Source[] = await response.json();
        // Filter for active sources if needed, or add a property to the Source interface
        setNewsSources(data);
      } catch (err: unknown) { // Use unknown for better type safety
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []); // Fetch sources on component mount


  return (
    <footer className="bg-card text-card-foreground py-8"> {/* Use card background and text colors */}
      <div className="container mx-auto px-4">
        <div className="md:flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary">TCI News Aggregator</h2> {/* Use primary color for heading */}
            <p className="mt-2 text-muted-foreground">Aggregating news from across the Turks and Caicos Islands</p> {/* Use muted-foreground for description */}
          </div>
          <div className="mt-4 md:mt-0">
            <h3 className="font-semibold mb-2 text-foreground">News Sources</h3> {/* Use foreground for heading */}
            {loading ? (
              <div className="text-muted-foreground">Loading sources...</div>
            ) : error ? (
              <div className="text-destructive">Error loading sources.</div>
            ) : newsSources.length === 0 ? (
               <div className="text-muted-foreground">No sources found.</div>
            ) : (
              <ul className="text-muted-foreground grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"> {/* Use muted-foreground for links, add grid for responsiveness */}
                {newsSources.map((source) => (
                  <li key={source.id}> {/* Use source.id as key */}
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{source.name}</a> {/* Use primary color on hover */}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-muted-foreground text-sm text-center"> {/* Use border and muted-foreground colors */}
          <p>&copy; {new Date().getFullYear()} TCI News Aggregator. This is a demo application.</p>
          <div className="mt-2 flex justify-center space-x-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> {/* Use specific colors for indicators */}
              <span>Verified Source</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1 text-blue-500" /> {/* Use specific colors for indicators */}
              <span>Official Source</span>
            </div>
            <div className="flex items-center">
              <Facebook className="h-4 w-4 mr-1 text-blue-600" /> {/* Use specific colors for indicators */}
              <span>Facebook Page</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
