import React from 'react';
import useTranslations from '../lib/hooks/useTranslations';

interface Source {
  id: number;
  name: string;
  url: string;
}

interface FooterProps {
  sources: Source[];
}

const Footer: React.FC<FooterProps> = ({ sources }) => {
  const { t } = useTranslations();

  return (
    <footer className="bg-gray-800 text-white p-8 mt-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-2">
            <a href="https://mango.tc" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
              mango.tc news
            </a>
          </h2>
          <p className="text-gray-400">{t.footer_tagline}</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">{t.news_sources}</h3>
          {sources.length === 0 ? (
            <div className="text-gray-400">{t.no_sources_found}</div>
          ) : (
            <ul className="space-y-1">
              {sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="container mx-auto mt-8 pt-4 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} <a href="https://mango.tc" target="_blank" rel="noopener noreferrer" className="hover:underline">mango.tc</a> news | {t.developed_by} <a href="https://hoffmanntci.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Hoffmann Ltd</a></p>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <div>
            <span>{t.verified_source}</span>
          </div>
          <div>
            <span>{t.official_source}</span>
          </div>
          <div>
            <span>{t.facebook_page}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
