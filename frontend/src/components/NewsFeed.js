import React, { useEffect, useState } from 'react';

function NewsFeed({ selectedTopic }) { // Accept selectedTopic prop
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true); // Set loading to true on each fetch
      setError(null); // Clear previous errors
      try {
        // TODO: Replace with your actual backend API URL
        let url = 'http://localhost:3000/api/articles';
        const params = new URLSearchParams();
        if (selectedTopic) {
          params.append('topic', selectedTopic);
        }
        // TODO: Add date range parameters when implemented

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setArticles(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [selectedTopic]); // Rerun effect when selectedTopic changes

  if (loading) {
    return (
      <div>
        Loading articles...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        Error loading articles: {error.message}
      </div>
    );
  }

  return (
    <div>
      {articles.map(article => (
        <div key={article.id}> {/* Added key prop */}
          <h3>{article.title}</h3>
          <p>Source: {article.source_url} | Date: {new Date(article.publication_date).toLocaleDateString()}</p>
          <p>Summary: {article.summary}</p>
          {/* TODO: Add link to full article details */}
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
