import React from 'react';
import { Card, CardHeader, CardTitle } from './ui/card';
import useTranslations from '../lib/hooks/useTranslations';

interface SundayEdition {
  id: number;
  title: string;
  image_url: string | null;
  publication_date: string;
}

interface SundayEditionListProps {
  editions: SundayEdition[];
}

const SundayEditionList: React.FC<SundayEditionListProps> = ({ editions }) => {
  const { t, currentLocale } = useTranslations();

  if (editions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        {t.no_articles_found || 'No editions found.'}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">{t.sunday_edition}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {editions.map(edition => (
          <a key={edition.id} href={`/${currentLocale}/sunday-edition/${edition.id}`} className="block">
            <Card className="flex flex-col h-full border-2 border-accent hover:shadow-lg transition-shadow">
              {edition.image_url && (
                <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
                  <img src={edition.image_url} alt={edition.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {t.sunday_edition}
                  </div>
                </div>
              )}
              <CardHeader className="px-6 pt-4 pb-4">
                <CardTitle className="font-serif">{edition.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.published}: {new Date(edition.publication_date).toLocaleDateString(currentLocale)}
                </p>
              </CardHeader>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
};

export default SundayEditionList;
