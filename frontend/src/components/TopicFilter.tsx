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
      setLoading(true); // Set loading to true on each fetch
      setError(null); // Clear previous errors
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
  }, []); // Fetch topics only once on component mount

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
    <div className="form-control w-full max-w-xs"> {/* Added form control classes */}
      <label className="label"> {/* Added label classes */}
        <span className="label-text">Filter by Topic:</span> {/* Added label text classes */}
      </label>
      <select id="topic-select" onChange={handleSelectChange} className="select select-bordered select-sm"> {/* Added DaisyUI select classes and size */}
        <option value="">All Topics</option>
        {topics.map(topic => (
          <option key={topic.id} value={topic.name}>
            {topic.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TopicFilter;
