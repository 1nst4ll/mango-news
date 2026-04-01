import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import AudioPlayer from './ui/AudioPlayer';
import { Button } from "./ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { MessageCircleMore, Facebook, ChevronLeft, Link2, Share2, Mic } from 'lucide-react';
import { toast } from 'sonner';
import useTranslations from '../lib/hooks/useTranslations';

interface SundayEdition {
  id: number;
  title: string;
  summary: string;
  narration_url: string | null;
  image_url: string | null;
  publication_date: string;
  podcast_script?: string | null;
  edition_format?: 'monologue' | 'podcast' | null;
}

interface SundayEditionDetailProps {
  edition: SundayEdition;
  lang: string;
}

const SundayEditionDetail: React.FC<SundayEditionDetailProps> = ({ edition, lang }) => {
  const { t, currentLocale } = useTranslations();
  const displaySummary = marked.parse(edition.summary) as string;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${currentLocale}/`}>
              {t.news_feed || 'News Feed'}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${currentLocale}/sunday-edition`}>
              {t.sunday_edition || 'Sunday Edition'}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{edition.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <a href={`/${currentLocale}/`} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" /> {t.back_to_news_feed || 'Back to News Feed'}
          </a>
        </Button>
      </div>

      <article className="prose prose-base sm:prose-lg dark:prose-invert max-w-3xl mx-auto font-serif text-foreground">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold !leading-tight mb-4 font-sans">
          {edition.title}
        </h1>
        <div className="text-sm text-muted-foreground mb-6 border-b border-t border-border py-2">
          <p className="mb-1">
            <span className="font-semibold"><a href="https://mango.tc" target="_blank" rel="noopener noreferrer" className="hover:underline">Mango.tc News</a> | {t.published}:</span> {new Date(edition.publication_date).toLocaleDateString(lang)}
          </p>
        </div>
        <div className="relative md:float-right md:w-1/2 md:ml-8 mb-6 clear-both">
          {edition.image_url && (
            <img src={edition.image_url} alt={edition.title} className="w-full h-auto rounded-lg shadow-lg object-cover" />
          )}
        </div>
        {edition.narration_url && (
          <div className="mb-6">
            <AudioPlayer src={edition.narration_url} autoplay={false} />
          </div>
        )}
        {edition.podcast_script && (
          <Accordion type="single" collapsible className="mb-6 not-prose">
            <AccordionItem value="transcript" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Mic className="h-4 w-4" /> View Podcast Transcript
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
                  {edition.podcast_script.split('\n').filter(line => line.trim()).map((line, i) => {
                    const match = line.match(/^(\w+):\s*(.*)/);
                    if (!match) return <p key={i} className="text-sm text-muted-foreground py-1 px-3">{line}</p>;
                    const [, speaker, text] = match;
                    const isHost1 = speaker.toLowerCase() === 'kayo';
                    return (
                      <div key={i} className={`rounded-md px-3 py-2 ${isHost1 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-violet-50 dark:bg-violet-950/30'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wide ${isHost1 ? 'text-blue-600 dark:text-blue-400' : 'text-violet-600 dark:text-violet-400'}`}>
                          {speaker}
                        </span>
                        <p className="text-sm mt-0.5">{text}</p>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        <div className="article-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displaySummary) }}></div>
        <div className="mt-8 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success(t.link_copied || 'Link copied!');
            }}
            className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <Link2 className="h-4 w-4 mr-1" /> {t.copy_link || 'Copy Link'}
          </Button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.share({ title: edition.title, url: window.location.href }).catch(() => {});
              }}
              className="text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
            >
              <Share2 className="h-4 w-4 mr-1" /> {t.share || 'Share'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              const editionUrl = window.location.href;
              const shareText = `Listen to the Mango News Sunday Edition: ${edition.title} - ${editionUrl}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
              window.open(whatsappUrl, '_blank');
            }}
            className="bg-social-whatsapp hover:bg-social-whatsapp-hover text-white text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
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
            className="bg-social-facebook hover:bg-social-facebook-hover text-white text-xs sm:text-sm whitespace-normal h-auto min-h-[2rem] py-2"
          >
            <Facebook className="h-4 w-4 mr-1" /> {t.share_on_facebook}
          </Button>
        </div>
      </article>
    </div>
  );
};

export default SundayEditionDetail;
