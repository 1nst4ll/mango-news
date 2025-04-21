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
      <div className="text-center text-lg">
        Loading articles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading articles: {error.message}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Increased gap */}
      {articles.map(article => (
        <div key={article.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col"> {/* Added hover effect and flex for layout */}
          <div className="card-body flex flex-col justify-between p-4 sm:p-6"> {/* Added flex for layout, adjusted padding */}
            <div> {/* Container for title, source, date, summary */}
              <h3 className="card-title text-xl font-bold mb-2">{article.title}</h3> {/* Ensured bold title */}
              <p className="text-sm text-gray-600 mb-2"> {/* Adjusted text color */}
                Source: <span className="font-semibold">{article.source_url}</span> | Date: {new Date(article.publication_date).toLocaleDateString()} {/* Highlighted source */}
              </p>
              <p className="text-gray-800">{article.summary}</p> {/* Adjusted text color */}
            </div>
            <div className="card-actions justify-end mt-4"> {/* DaisyUI card actions */}
              <a href={`/article/${article.id}`} className="btn btn-primary btn-sm">Read More</a> {/* Link to article detail page */}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NewsFeed;
