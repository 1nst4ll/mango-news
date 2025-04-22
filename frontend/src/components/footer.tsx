import React from 'react';
import { CheckCircle, Shield, Facebook } from 'lucide-react'; // Import icons for indicators

const Footer: React.FC = () => {
  // Sample news sources list (replace with actual data if available)
  const newsSources = [
    { name: 'TC Weekly News', url: 'https://tcweeklynews.com/' },
    { name: 'SunTCI', url: 'https://suntci.com/' },
    { name: 'TCI Government', url: 'https://www.gov.tc/' },
    { name: 'Royal TCI Police Force', url: 'https://www.tcipolice.tc/' },
    { name: 'Magnetic Media', url: 'https://magneticmediatv.com/category/tci-news/' },
    { name: 'NewslineTCI', url: 'https://www.newslinetci.com/' },
    { name: 'TCI Sun Facebook', url: 'https://www.facebook.com/tcisun/' },
    { name: 'TCI Tourism Facebook', url: 'https://www.facebook.com/tcitourism/' },
    { name: 'The Guardian TCI', url: 'https://www.theguardian.com/world/turks-and-caicos-islands' },
    { name: 'Caribbean Journal', url: 'https://www.caribjournal.com/' },
    { name: 'TCI Free Press', url: 'https://tcfreepress.tc/' },
    { name: 'The Bahamas Weekly', url: 'https://www.thebahamasweekly.com/' },
    { name: "PTV People's Television", url: 'https://www.facebook.com/PeoplesTelevision/' },
    { name: 'Turks and Caicos Media', url: 'https://www.facebook.com/turksandcaicosmedia/' },
    { name: 'TCIOnline', url: 'https://www.facebook.com/TheRealTCIYellowPages/' },
    { name: 'Support Local TCI Group', url: 'https://www.facebook.com/groups/696710547555714/' },
    { name: 'TCI Tourist Guide Group', url: 'https://www.facebook.com/groups/662080657183813/' },
    { name: "TCI Governor's Office", url: 'https://www.facebook.com/UKinTCI/' },
    { name: 'Office of the Deputy Governor', url: 'https://www.facebook.com/OfficeoftheDeputyGovernorTCI/' },
    { name: 'Royal Turks and Caicos Islands Police Force (Facebook)', url: 'https://www.facebook.com/RTCIPF/' },
    { name: 'Eagle Legal News (via Magnetic Media)', url: 'https://magneticmediatv.com/category/tci-news/' },
    { name: 'TCI Hospital', url: 'https://www.facebook.com/TCIHospital/' },
    { name: 'National Health Insurance Board', url: 'https://www.facebook.com/tcinhib/' },
    { name: 'FortisTCI', url: 'https://www.facebook.com/fortistci/' },
    { name: 'Provo Water Company', url: 'https://www.facebook.com/provowater/' },
    { name: 'Digicel TCI', url: 'https://www.digicelgroup.com/tc/en' },
    { name: 'Flow TCI', url: 'https://discoverflow.co/turks-caicos/' },
    { name: 'TCI Hotel & Tourism Association', url: 'https://www.facebook.com/OfficialTCHTA/' },
    { name: 'TCI Planning Department', url: 'https://www.gov.tc/physicalplanning/' },
    { name: 'TCI Tourist Board', url: 'https://www.facebook.com/tcitourism/' },
    { name: 'TCI Chamber of Commerce', url: 'https://www.facebook.com/tcchamber/' },
    { name: 'Invest Turks and Caicos', url: 'https://www.facebook.com/investtci/' },
    { name: 'TCI Real Estate Association', url: 'https://www.facebook.com/Turks-and-Caicos-Real-Estate-Association-1719376091650976/' },
    { name: 'Where When How Magazine', url: 'https://www.wherewhenhow.com/' },
    { name: 'Things to Do in TCI Group', url: 'https://www.facebook.com/groups/todointurksandcaicos/' },
    { name: 'TCI Community College', url: 'https://www.facebook.com/OfficialTCICC/' },
    { name: 'TCI Churches', url: 'https://cogoptci.org/' },
  ];


  return (
    <footer className="bg-card text-card-foreground py-8"> {/* Use card background and text colors */}
      <div className="container mx-auto px-4">
        <div className="md:flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary">TCI News Aggregator</h2> {/* Use primary color for heading */}
            <p className="mt-2 text-muted-foreground">Aggregating news from across the Turks and Caicos Islands</p> {/* Use muted-foreground for description */}
          </div>
          <div className="mt-4 md:mt-0">
            <h3 className="font-semibold mb-2 text-foreground">News Sources</h3> {/* Use foreground for heading */}
            <ul className="text-muted-foreground grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"> {/* Use muted-foreground for links, add grid for responsiveness */}
              {newsSources.map((source, index) => (
                <li key={index}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{source.name}</a> {/* Use primary color on hover */}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-muted-foreground text-sm text-center"> {/* Use border and muted-foreground colors */}
          <p>&copy; {new Date().getFullYear()} TCI News Aggregator. This is a demo application.</p>
          <div className="mt-2 flex justify-center space-x-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> {/* Use specific colors for indicators */}
              <span>Verified Source</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1 text-blue-500" /> {/* Use specific colors for indicators */}
              <span>Official Source</span>
            </div>
            <div className="flex items-center">
              <Facebook className="h-4 w-4 mr-1 text-blue-600" /> {/* Use specific colors for indicators */}
              <span>Facebook Page</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
