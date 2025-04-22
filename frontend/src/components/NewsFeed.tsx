import React, { useEffect, useState } from 'react';

interface Article {
  id: number;
  title: string;
  source_id: number;
  source_url: string;
  publication_date: string;
  raw_content: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

interface NewsFeedProps {
  selectedTopic: string;
  startDate: string | null; // Add startDate prop
  endDate: string | null;   // Add endDate prop
}

function NewsFeed({ selectedTopic, startDate, endDate }: NewsFeedProps) { // Accept date props
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

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
        if (startDate) { // Add startDate parameter
          params.append('startDate', startDate);
        }
        if (endDate) { // Add endDate parameter
          params.append('endDate', endDate);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Article[] = await response.json();
        setArticles(data);
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

    fetchArticles();
  }, [selectedTopic, startDate, endDate]); // Rerun effect when filter props change

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
        <div key={article.id}>
          <div>
            <div>
              <h3>{article.title}</h3>
              <p>
                Source: <span>{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()}
              </p>
              <p>{article.summary}</p>
            </div>
            <div>
              <a href={`/article/${article.id}`}>Read More</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
