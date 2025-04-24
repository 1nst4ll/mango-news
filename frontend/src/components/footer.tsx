'use client'; // Make it a client component to use useEffect and useState

import React, { useEffect, useState } from 'react';

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
    <footer>
      <div>
        <div>
          <h2>TCI News Aggregator</h2>
          <p>Aggregating news from across the Turks and Caicos Islands</p>
        </div>
        <div>
          <h3>News Sources</h3>
          {loading ? (
            <div>Loading sources...</div>
          ) : error ? (
            <div>Error loading sources.</div>
          ) : newsSources.length === 0 ? (
             <div>No sources found.</div>
          ) : (
            <ul>
              {newsSources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <p>&copy; {new Date().getFullYear()} TCI News Aggregator. This is a demo application.</p>
        <div>
          <div>
            <span>Verified Source</span>
          </div>
          <div>
            <span>Official Source</span>
          </div>
          <div>
            <span>Facebook Page</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
