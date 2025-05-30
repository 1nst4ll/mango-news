import React, { useEffect, useState } from 'react';

// Import locale files
import en from '../locales/en.json';
import es from '../locales/es.json';
import ht from '../locales/ht.json';

const locales = { en, es, ht };

// Helper hook for translations (duplicate from NewsFeed for now, could be refactored)
const useTranslations = () => {
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const localeFromPath = pathSegments[1];
    if (locales[localeFromPath as keyof typeof locales]) {
      setCurrentLocale(localeFromPath);
    } else {
      setCurrentLocale('en'); // Fallback
    }
  }, []);

  const t = locales[currentLocale as keyof typeof locales];
  return { t, currentLocale };
};

interface Source {
  id: number;
  name: string;
  url: string;
  // Include other properties if needed for display in the footer
}

const Footer: React.FC = () => {
  const [newsSources, setNewsSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/sources`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Source[] = await response.json();
        setNewsSources(data);
      } catch (err: unknown) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);


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
          {loading ? (
            <div className="text-gray-400">{t.loading_sources}</div>
          ) : error ? (
            <div className="text-red-400">{t.error_loading_sources}</div>
          ) : newsSources.length === 0 ? (
             <div className="text-gray-400">{t.no_sources_found}</div>
          ) : (
            <ul className="space-y-1">
              {newsSources.map((source) => (
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
