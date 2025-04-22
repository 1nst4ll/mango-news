'use client';

import React, { useEffect, useState } from 'react';

interface Topic {
  id: number;
  name: string;
}

interface TopicFilterProps {
  onSelectTopic: (topic: string) => void;
}

function TopicFilter({ onSelectTopic }: TopicFilterProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        const response = await fetch('http://localhost:3000/api/topics');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Topic[] = await response.json();
        setTopics(data);
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

    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div>
        Loading topics...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        Error loading topics: {error.message}
      </div>
    );
  }

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectTopic(event.target.value);
  };

  return (
    <div className="flex flex-col">
      <label htmlFor="topic-select" className="mb-2 text-sm font-medium text-foreground">
        Filter by Topic:
      </label>
      <select
        id="topic-select"
        onChange={handleSelectChange}
        className="block w-full rounded-md border border-border bg-input px-3 py-2 text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
      >
        <option value="">All Topics</option>
        {topics.map((topic) => (
          <option key={`topic-${topic.id}`} value={topic.name}> {/* Added a prefix to the key */}
            {topic.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TopicFilter;
