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
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000'; // Fallback for local dev if variable not set
        const response = await fetch(`${apiUrl}/api/sources`);
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
    <footer className="bg-gray-800 text-white p-8 mt-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-2">TCI News Aggregator</h2>
          <p className="text-gray-400">Aggregating news from across the Turks and Caicos Islands</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">News Sources</h3>
          {loading ? (
            <div className="text-gray-400">Loading sources...</div>
          ) : error ? (
            <div className="text-red-400">Error loading sources.</div>
          ) : newsSources.length === 0 ? (
             <div className="text-gray-400">No sources found.</div>
          ) : (
            <ul className="space-y-1">
              {newsSources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="container mx-auto mt-8 pt-4 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} TCI News Aggregator. This is a demo application.</p>
        <div className="flex space-x-4 mt-4 md:mt-0">
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