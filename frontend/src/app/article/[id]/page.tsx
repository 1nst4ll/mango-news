'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components


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

interface ArticleDetailProps {
  params: {
    id: string;
  };
}

const ArticleDetail = ({ params }: ArticleDetailProps) => {
  const { id } = params;
  // Removed useRouter as it's no longer needed for the back button
  // const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null); // Use unknown for better type safety

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your actual backend API URL
        const response = await fetch(`http://localhost:3000/api/articles/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Article = await response.json();
        setArticle(data);
      } catch (err: unknown) { // Use unknown for better type safety
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  // Removed handleBackClick as the back button is now in the persistent navbar
  // const handleBackClick = () => {
  //   router.push('/');
  // };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent>
            <div className="text-foreground text-center py-8">
              Loading article...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent>
            <div className="text-destructive text-center py-8">
              Error loading article: {error instanceof Error ? error.message : 'An unknown error occurred'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent>
            <div className="text-muted-foreground text-center py-8">
              Article not found.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary mb-2">{article.title}</CardTitle> {/* Added bottom margin */}
          <p className="text-muted-foreground text-sm">
            Source: <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{article.source_url}</a> | Date: {new Date(article.publication_date).toLocaleDateString()} {/* Made source URL a link */}
          </p>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-foreground leading-relaxed"> {/* Apply text-foreground for content color and relaxed line height */}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.raw_content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleDetail;
