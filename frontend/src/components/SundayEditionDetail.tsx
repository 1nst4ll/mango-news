import React from 'react';
import { marked } from 'marked';
import { MusicCard } from './ui/MusicCard'; // Import the new MusicCard component

interface SundayEdition {
  id: number;
  title: string;
  summary: string;
  narration_url: string | null;
  image_url: string | null;
  publication_date: string;
}

interface SundayEditionDetailProps {
  edition: SundayEdition;
  lang: string;
}

const SundayEditionDetail: React.FC<SundayEditionDetailProps> = ({ edition, lang }) => {
  const displaySummary = marked.parse(edition.summary);

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        {edition.image_url && (
          <img src={edition.image_url} alt={edition.title} className="w-full h-64 object-cover" />
        )}
        <div className="p-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{edition.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Published: {new Date(edition.publication_date).toLocaleDateString(lang)}
          </p>
          {edition.narration_url && (
            <div className="mb-6">
              <MusicCard
                src={edition.narration_url}
                poster={edition.image_url || '/logo.png'} // Use edition image or a default logo
                title={edition.title}
                artist="Mango News" // Generic artist name
                mainColor="#eab308" // Example color, can be dynamic
              />
            </div>
          )}
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: displaySummary }}></div>
        </div>
      </div>
    </div>
  );
};

export default SundayEditionDetail;
