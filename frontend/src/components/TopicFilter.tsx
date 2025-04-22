'use client';

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";


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

  const handleSelectChange = (value: string) => {
    // Pass null if the selected value is "all" to indicate no topic filter
    onSelectTopic(value === "all" ? "" : value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="topic-select">Filter by Topic:</Label>
      <Select onValueChange={handleSelectChange}>
        <SelectTrigger id="topic-select">
          <SelectValue placeholder="All Topics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Topics</SelectItem> {/* Changed value from "" to "all" */}
          {topics.map((topic) => (
            <SelectItem key={`topic-${topic.id}`} value={topic.name}>
              {topic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default TopicFilter;
