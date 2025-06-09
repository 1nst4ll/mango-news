import React from 'react';
import { marked } from 'marked';
import AudioPlayer from './ui/AudioPlayer';
import { Button } from "./ui/button";
import { MessageCircleMore, Facebook } from 'lucide-react';
import useTranslations from '../lib/hooks/useTranslations';

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
  const { t, currentLocale } = useTranslations();
  const displaySummary = marked.parse(edition.summary);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <article className="prose prose-base sm:prose-lg dark:prose-invert max-w-3xl mx-auto font-serif text-gray-800 dark:text-gray-200">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold !leading-tight mb-4 font-sans">
          {edition.title}
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 border-b border-t border-gray-300 dark:border-gray-700 py-2">
          <p className="mb-1">
            <span className="font-semibold">{t.published}:</span> {new Date(edition.publication_date).toLocaleDateString(lang)}
          </p>
        </div>
        <div className="relative md:float-right md:w-1/2 md:ml-8 mb-6 clear-both">
          {edition.image_url && (
            <img src={edition.image_url} alt={edition.title} className="w-full h-auto rounded-lg shadow-lg object-cover" />
          )}
        </div>
        {edition.narration_url && (
          <div className="mb-6">
            <AudioPlayer src={edition.narration_url} />
          </div>
        )}
        <div className="article-content" dangerouslySetInnerHTML={{ __html: displaySummary }}></div>
        <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            size="sm"
            onClick={() => {
              const editionUrl = window.location.href;
              const shareText = `Listen to the Mango News Sunday Edition: ${edition.title} - ${editionUrl}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
              window.open(whatsappUrl, '_blank');
            }}
            className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <MessageCircleMore className="h-4 w-4 mr-1" /> {t.share_on_whatsapp}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const editionUrl = window.location.href;
              const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(editionUrl)}`;
              window.open(facebookUrl, '_blank');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <Facebook className="h-4 w-4 mr-1" /> {t.share_on_facebook}
          </Button>
        </div>
      </article>
    </div>
  );
};

export default SundayEditionDetail;
