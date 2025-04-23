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


interface Topic {
  id: number;
  name: string;
}

interface TopicFilterProps {
  selectedTopics: string[];
  onSelectTopics: (topics: string[]) => void;
}

function TopicFilter({ selectedTopics, onSelectTopics }: TopicFilterProps) {
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

  const handleCheckboxChange = (topicName: string, isChecked: boolean) => {
    if (isChecked) {
      onSelectTopics([...selectedTopics, topicName]);
    } else {
      onSelectTopics(selectedTopics.filter(topic => topic !== topicName));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Filter by Topic:</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selectedTopics.length > 0 ? `${selectedTopics.length} selected` : "Select Topics"}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
          <DropdownMenuLabel>Topics</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {topics.map((topic) => (
            <DropdownMenuCheckboxItem
              key={`topic-${topic.id}`}
              checked={selectedTopics.includes(topic.name)}
              onCheckedChange={(isChecked) => handleCheckboxChange(topic.name, isChecked)}
            >
              {topic.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default TopicFilter;
