import React, { useEffect, useState } from 'react';

function TopicFilter({ onSelectTopic }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        // TODO: Replace with your actual backend API URL
        const response = await fetch('http://localhost:3000/api/topics');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTopics(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  if (loading) {
    return (
      
        Loading topics...
      
    );
  }

  if (error) {
    return (
      
        Error loading topics: {error.message}
      
    );
  }

  const handleSelectChange = (event) => {
    onSelectTopic(event.target.value);
  };

  return (
    
      <label htmlFor="topic-select">Filter by Topic:</label>
      <select id="topic-select" onChange={handleSelectChange}>
        <option value="">All Topics</option>
        {topics.map(topic => (
          
            {topic.name}
          
        ))}
      </select>
    
  );
}

export default TopicFilter;
