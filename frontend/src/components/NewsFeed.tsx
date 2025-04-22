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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map(article => (
        <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
            <p className="text-gray-600 text-sm mb-4">
                Source: <span className="text-blue-600">{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()}
              </p>
              <p className="text-gray-700 mb-4">{article.summary}</p>
            <div className="text-right">
              <a href={`/article/${article.id}`} className="text-blue-600 hover:underline">Read More</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
