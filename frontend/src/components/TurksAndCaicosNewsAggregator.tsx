import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Newspaper, Globe, Shield, Facebook, Tag, Filter, RefreshCw } from 'lucide-react';

const TurksAndCaicosNewsAggregator = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTopicFilter, setShowTopicFilter] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [newSourcesFound, setNewSourcesFound] = useState(0);

  // List of available topics
  const topicsList = [
    'Tourism', 
    'Economy', 
    'Politics', 
    'Environment', 
    'Education', 
    'Health', 
    'Crime', 
    'Sports', 
    'Entertainment', 
    'Weather',
    'Development',
    'Events',
    'Community',
    'Technology'
  ];

  // Sample news data - in a real app, this would come from API calls to scraped content
  const [newsData, setNewsData] = useState([
    {
      id: 1,
      title: "New Tourism Development Planned for Grand Turk",
      source: "TC Weekly News",
      date: "April 19, 2025",
      category: "news",
      topics: ["Tourism", "Development", "Economy"],
      excerpt: "A new $200 million resort development has been approved for the eastern shore of Grand Turk, promising to create over 300 jobs for locals...",
      url: "https://tcweeklynews.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 2,
      title: "RTCIPF Announces New Community Safety Initiative",
      source: "Royal Turks and Caicos Islands Police Force",
      date: "April 18, 2025",
      category: "police",
      topics: ["Crime", "Health", "Education"],
      excerpt: "The Royal Turks and Caicos Islands Police Force today launched a new community safety program aimed at reducing crime in Providenciales...",
      url: "https://www.tcipolice.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 3,
      title: "Government Approves New Infrastructure Budget",
      source: "TCI Government",
      date: "April 17, 2025",
      category: "government",
      topics: ["Economy", "Development", "Politics"],
      excerpt: "The Turks and Caicos Islands Government has approved a $45 million infrastructure improvement plan focused on road repairs and public facilities...",
      url: "https://www.gov.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 4,
      title: "Local Fishermen Report Record Lobster Season",
      source: "SunTCI",
      date: "April 16, 2025",
      category: "news",
      topics: ["Environment", "Economy"],
      excerpt: "Local fishermen are celebrating what they're calling the best lobster season in a decade, with catches up nearly 30% over last year...",
      url: "https://suntci.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 5,
      title: "TCI Minister of Tourism Promotes Islands at International Expo",
      source: "TCI Government",
      date: "April 15, 2025",
      category: "government",
      topics: ["Tourism", "Economy"],
      excerpt: "The Minister of Tourism represented the Turks and Caicos Islands at the International Travel Expo in Miami, showcasing the islands' luxury accommodations and natural beauty...",
      url: "https://www.gov.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 6,
      title: "Police Recover Stolen Vessel, Two Arrested",
      source: "Royal Turks and Caicos Islands Police Force",
      date: "April 14, 2025",
      category: "police",
      topics: ["Crime"],
      excerpt: "The Marine Branch of the RTCIPF has recovered a stolen vessel and arrested two individuals in connection with the theft...",
      url: "https://www.tcipolice.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 7,
      title: "Local Artist's Work to be Featured in International Gallery",
      source: "TC Weekly News",
      date: "April 13, 2025",
      category: "news",
      topics: ["Entertainment", "Tourism"],
      excerpt: "TCI artist Jasmine Williams will have her paintings featured in a prominent London gallery next month, showcasing island culture and landscapes...",
      url: "https://tcweeklynews.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 8,
      title: "Government Announces New Environmental Protection Measures",
      source: "TCI Government",
      date: "April 12, 2025",
      category: "government",
      topics: ["Environment", "Politics"],
      excerpt: "New regulations aimed at protecting the islands' coral reefs and marine habitats have been announced by the Department of Environment...",
      url: "https://www.gov.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 9,
      title: "Community Facebook Update: Beach Cleanup This Weekend",
      source: "Facebook Community Page",
      date: "April 19, 2025",
      category: "social",
      topics: ["Environment", "Entertainment"],
      excerpt: "The annual Grace Bay Beach cleanup event is scheduled for this Saturday, with hundreds of volunteers expected to participate...",
      url: "https://www.facebook.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 10,
      title: "Historical Society Announces New Museum Exhibit",
      source: "SunTCI",
      date: "April 11, 2025",
      category: "news",
      topics: ["Entertainment", "Education"],
      excerpt: "The Turks and Caicos Historical Society is opening a new exhibit showcasing artifacts from the islands' salt industry era...",
      url: "https://suntci.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 11,
      title: "Magnetic Media Reports on Increased Tourist Arrivals",
      source: "Magnetic Media",
      date: "April 18, 2025",
      category: "news",
      topics: ["Tourism", "Economy"],
      excerpt: "The Turks and Caicos Islands continues to see record tourist arrivals in the first quarter of 2025, according to data released by the Tourism Board...",
      url: "https://magneticmediatv.com/category/tci-news/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 12,
      title: "NewslineTCI Exclusive: Interview with New Education Minister",
      source: "NewslineTCI",
      date: "April 17, 2025",
      category: "news",
      topics: ["Education", "Politics"],
      excerpt: "In an exclusive interview, the newly appointed Minister of Education discusses ambitious plans to revamp the school curriculum and improve facilities...",
      url: "https://www.newslinetci.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 13,
      title: "TCI Sun Reports on Infrastructure Projects in South Caicos",
      source: "TCI Sun",
      date: "April 16, 2025",
      category: "news",
      topics: ["Development", "Economy"],
      excerpt: "South Caicos is set to receive major infrastructure upgrades including road repairs and improvements to the airport terminal...",
      url: "https://www.facebook.com/tcisun/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 14,
      title: "Tourism Department Announces New Campaign",
      source: "TCI Tourism Facebook",
      date: "April 15, 2025",
      category: "social",
      topics: ["Tourism", "Economy"],
      excerpt: "The Turks and Caicos Tourism Board unveils a new international marketing campaign targeting luxury travelers from emerging markets...",
      url: "https://www.facebook.com/tcitourism/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 15,
      title: "Weather Alert: Meteorological Office Issues Advisory",
      source: "TCI Government",
      date: "April 19, 2025",
      category: "government",
      topics: ["Weather", "Environment"],
      excerpt: "The Meteorological Office has issued a marine advisory for small craft operators as strong winds and rough seas are expected over the next 48 hours...",
      url: "https://www.gov.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 16,
      title: "Times of the Islands: Cultural Festival Preview",
      source: "Times of the Islands",
      date: "April 14, 2025",
      category: "news",
      topics: ["Entertainment", "Tourism", "Education"],
      excerpt: "The quarterly publication previews the upcoming annual Cultural Festival, showcasing traditional music, dance, and cuisine from across the islands...",
      url: "https://www.visittci.com/about-us/media-guide",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 17,
      title: "Guardian Report: Climate Change Impacts on TCI Beaches",
      source: "The Guardian",
      date: "April 13, 2025",
      category: "news",
      topics: ["Environment", "Tourism"],
      excerpt: "International reporting on how rising sea levels and increased storm activity are affecting the pristine beaches of Turks and Caicos Islands...",
      url: "https://www.theguardian.com/world/turks-and-caicos-islands",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 18,
      title: "Caribbean Journal: TCI Hotel Investment Conference",
      source: "Caribbean Journal",
      date: "April 12, 2025",
      category: "news",
      topics: ["Tourism", "Economy", "Development"],
      excerpt: "The regional publication reports on a major hotel investment conference held in Providenciales that attracted investors from across the globe...",
      url: "https://www.caribjournal.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 19,
      title: "TCI Free Press: New Education Initiatives Announced",
      source: "TCI Free Press",
      date: "April 11, 2025",
      category: "news",
      topics: ["Education", "Politics"],
      excerpt: "Report on new educational initiatives including expanded scholarship programs and curriculum improvements for TCI schools...",
      url: "https://tcfreepress.tc/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 20,
      title: "The Bahamas Weekly Features TCI Regatta",
      source: "The Bahamas Weekly",
      date: "April 10, 2025",
      category: "news",
      topics: ["Sports", "Tourism", "Entertainment"],
      excerpt: "Coverage of the annual sailing regatta in Turks and Caicos that attracts participants from throughout the Caribbean region...",
      url: "https://www.thebahamasweekly.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 21,
      title: "PTV NewsWatch: Local Business Owners Call for More Support",
      source: "PTV People's Television",
      date: "April 19, 2025",
      category: "news",
      topics: ["Economy", "Politics"],
      excerpt: "Local business owners gathered at a town hall meeting to discuss challenges facing small enterprises and call for additional government support...",
      url: "https://www.facebook.com/PeoplesTelevision/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 22,
      title: "Turks and Caicos Media Reports on New Airport Expansion",
      source: "Turks and Caicos Media",
      date: "April 18, 2025",
      category: "news",
      topics: ["Development", "Tourism", "Economy"],
      excerpt: "Plans for a major expansion of the Providenciales International Airport have been announced, with construction expected to begin next year...",
      url: "https://www.facebook.com/turksandcaicosmedia/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 23,
      title: "TCIOnline Highlights Small Business Showcase Event",
      source: "TCIOnline",
      date: "April 17, 2025",
      category: "social",
      topics: ["Economy", "Entertainment"],
      excerpt: "The annual Small Business Showcase brought together entrepreneurs from across the islands to network and display their products and services...",
      url: "https://www.facebook.com/TheRealTCIYellowPages/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 24,
      title: "Support Local Turks and Caicos Businesses Group Announces Initiative",
      source: "Support Local TCI Facebook Group",
      date: "April 16, 2025",
      category: "social",
      topics: ["Economy"],
      excerpt: "The community group has launched a new initiative to promote locally-owned businesses through a digital directory and loyalty program...",
      url: "https://www.facebook.com/groups/696710547555714/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 25,
      title: "TCI Tourist Guide Group Shares Beach Conservation Tips",
      source: "TCI Tourist Guide Facebook Group",
      date: "April 15, 2025",
      category: "social",
      topics: ["Environment", "Tourism"],
      excerpt: "Members of the popular tourist guide group are sharing tips for visitors on how to enjoy TCI's beaches while protecting the natural environment...",
      url: "https://www.facebook.com/groups/662080657183813/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 26,
      title: "Governor's Office Announces New Youth Leadership Program",
      source: "TCI Governor's Office",
      date: "April 19, 2025",
      category: "government",
      topics: ["Education", "Politics"],
      excerpt: "The Governor's Office has announced a new youth leadership program aimed at developing future leaders in the Turks and Caicos Islands...",
      url: "https://www.facebook.com/UKinTCI/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 27,
      title: "Deputy Governor Reports on Public Service Improvements",
      source: "Office of the Deputy Governor",
      date: "April 18, 2025",
      category: "government",
      topics: ["Politics"],
      excerpt: "The Deputy Governor has released a comprehensive report on improvements to public services across the islands over the past year...",
      url: "https://www.facebook.com/OfficeoftheDeputyGovernorTCI/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 28,
      title: "RTCIPF Celebrates Successful Community Outreach Program",
      source: "Royal Turks and Caicos Islands Police Force",
      date: "April 17, 2025",
      category: "police",
      topics: ["Crime", "Education"],
      excerpt: "The Royal Turks and Caicos Islands Police Force is celebrating the success of its community outreach program that has helped reduce youth crime rates...",
      url: "https://www.facebook.com/RTCIPF/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 29,
      title: "Eagle Legal News: Court Rules in Favor of Local Property Owners",
      source: "Eagle Legal News",
      date: "April 16, 2025",
      category: "news",
      topics: ["Politics", "Economy"],
      excerpt: "Eagle Legal News reports on a significant court ruling that favors local property owners in a dispute with a development company...",
      url: "https://magneticmediatv.com/category/tci-news/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 30,
      title: "TCI Hospital Launches New Telemedicine Services",
      source: "Turks and Caicos Islands Hospital",
      date: "April 19, 2025",
      category: "news",
      topics: ["Health", "Technology"],
      excerpt: "Interhealth Canada TCI Hospital has launched new telemedicine services to provide remote healthcare access to residents of outer islands...",
      url: "https://www.facebook.com/TCIHospital/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 31,
      title: "NHIB Announces Extended Coverage for Preventative Care",
      source: "National Health Insurance Board",
      date: "April 18, 2025",
      category: "news",
      topics: ["Health", "Economy"],
      excerpt: "The National Health Insurance Board has announced expanded coverage for preventative healthcare services for all residents...",
      url: "https://www.facebook.com/tcinhib/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 32,
      title: "FortisTCI Invests in Renewable Energy Projects",
      source: "FortisTCI",
      date: "April 17, 2025",
      category: "news",
      topics: ["Environment", "Economy", "Development"],
      excerpt: "FortisTCI has announced significant investments in solar and wind energy projects to increase renewable energy generation across the islands...",
      url: "https://www.facebook.com/fortistci/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 33,
      title: "Provo Water Company Addresses Infrastructure Improvements",
      source: "Provo Water Company",
      date: "April 16, 2025",
      category: "news",
      topics: ["Development", "Environment"],
      excerpt: "The Provo Water Company has outlined plans for major infrastructure improvements to ensure reliable water supply during peak tourist season...",
      url: "https://www.facebook.com/provowater/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 34,
      title: "Digicel TCI Launches 5G Network in Providenciales",
      source: "Digicel Turks and Caicos",
      date: "April 15, 2025",
      category: "news",
      topics: ["Technology", "Economy", "Development"],
      excerpt: "Digicel has officially launched its 5G network in Providenciales, bringing faster internet speeds and improved connectivity to residents and businesses...",
      url: "https://www.digicelgroup.com/tc/en",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 35,
      title: "Flow TCI Announces New Internet Packages for Remote Workers",
      source: "Flow TCI",
      date: "April 14, 2025",
      category: "news",
      topics: ["Technology", "Economy"],
      excerpt: "Flow TCI has unveiled new high-speed internet packages specifically designed for the growing number of remote workers relocating to the islands...",
      url: "https://discoverflow.co/turks-caicos/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 36,
      title: "TCI Tourism Association Hosts Annual Industry Conference",
      source: "Turks and Caicos Hotel and Tourism Association",
      date: "April 13, 2025",
      category: "news",
      topics: ["Tourism", "Economy", "Events"],
      excerpt: "The annual Turks and Caicos Tourism Conference brought together industry leaders to discuss strategies for sustainable tourism growth...",
      url: "https://www.facebook.com/OfficialTCHTA/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 37,
      title: "Planning Department Approves New Development Guidelines",
      source: "TCI Planning Department",
      date: "April 12, 2025",
      category: "government",
      topics: ["Development", "Environment", "Politics"],
      excerpt: "The TCI Planning Department has approved new development guidelines aimed at balancing growth with environmental protection...",
      url: "https://www.gov.tc/physicalplanning/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 38,
      title: "TCI Tourist Board Announces Summer Festival Schedule",
      source: "Turks and Caicos Tourist Board",
      date: "April 11, 2025",
      category: "news",
      topics: ["Tourism", "Entertainment", "Events"],
      excerpt: "The Turks and Caicos Tourist Board has announced a packed schedule of cultural festivals and events for the upcoming summer season...",
      url: "https://www.facebook.com/tcitourism/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 39,
      title: "Chamber of Commerce Hosts Business Development Workshop",
      source: "Turks and Caicos Chamber of Commerce",
      date: "April 19, 2025",
      category: "news",
      topics: ["Economy", "Education", "Events"],
      excerpt: "The Turks and Caicos Chamber of Commerce is hosting a series of workshops aimed at helping small business owners develop growth strategies...",
      url: "https://www.facebook.com/tcchamber/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 40,
      title: "Invest TCI Reports Record Foreign Investment in 2025",
      source: "Invest Turks and Caicos",
      date: "April 18, 2025",
      category: "news",
      topics: ["Economy", "Development"],
      excerpt: "Invest TCI reports that foreign investment in the islands has reached record levels in the first quarter of 2025, with particular growth in sustainable tourism projects...",
      url: "https://www.facebook.com/investtci/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 41,
      title: "TCI Real Estate Association Updates Property Guidelines",
      source: "Turks and Caicos Real Estate Association",
      date: "April 17, 2025",
      category: "news",
      topics: ["Economy", "Development"],
      excerpt: "The Turks and Caicos Real Estate Association has updated its guidelines for property transactions to streamline the buying process for foreign investors...",
      url: "https://www.facebook.com/Turks-and-Caicos-Real-Estate-Association-1719376091650976/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 42,
      title: "Where When How Magazine Features Top Restaurants",
      source: "Where When How TCI",
      date: "April 16, 2025",
      category: "news",
      topics: ["Tourism", "Entertainment"],
      excerpt: "The latest edition of Where When How magazine features a comprehensive guide to the top restaurants across Providenciales and Grand Turk...",
      url: "https://www.wherewhenhow.com/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 43,
      title: "'Things to Do in TCI' Group Showcases New Attractions",
      source: "What Things to Do in Turks and Caicos",
      date: "April 15, 2025",
      category: "social",
      topics: ["Tourism", "Entertainment", "Events"],
      excerpt: "The popular Facebook group is highlighting several new attractions and activities for visitors and residents, including eco-tours and cultural experiences...",
      url: "https://www.facebook.com/groups/todointurksandcaicos/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 44,
      title: "TCI Community College Launches New Programs",
      source: "Turks & Caicos Islands Community College",
      date: "April 14, 2025",
      category: "news",
      topics: ["Education", "Economy"],
      excerpt: "The Turks and Caicos Islands Community College has announced several new educational programs designed to prepare students for careers in the growing tourism and technology sectors...",
      url: "https://www.facebook.com/OfficialTCICC/",
      imageUrl: "/api/placeholder/500/300"
    },
    {
      id: 45,
      title: "Interfaith Council Announces Community Outreach Initiative",
      source: "TCI Churches Coalition",
      date: "April 13, 2025",
      category: "social",
      topics: ["Events", "Community"],
      excerpt: "An interfaith coalition of churches from across the islands has announced a major community outreach initiative to address food insecurity and youth development...",
      url: "https://m.facebook.com/OfficialTCICC/about/",
      imageUrl: "/api/placeholder/500/300"
    }
  ]);

  // Simulate loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate source discovery
  const discoverNewSources = () => {
    setIsDiscovering(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Simulate finding 3-7 new sources
      const sourcesFound = Math.floor(Math.random() * 5) + 3;
      setNewSourcesFound(sourcesFound);
      setIsDiscovering(false);
      
      // Show success message
      alert(`Discovery complete! Found ${sourcesFound} new news sources that will be added to your feed.`);
    }, 3000);
  };

  // Handle topic toggling
  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Filter news based on active tab, search term, and selected topics
  const filteredNews = newsData.filter(item => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesSearch = searchTerm === '' || 
                         item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopics = selectedTopics.length === 0 || 
                          selectedTopics.some(topic => item.topics && item.topics.includes(topic));
    
    return matchesTab && matchesSearch && matchesTopics;
  });

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'news':
        return <Newspaper className="h-5 w-5 mr-2" />;
      case 'government':
        return <Globe className="h-5 w-5 mr-2" />;
      case 'police':
        return <Shield className="h-5 w-5 mr-2" />;
      case 'social':
        return <Facebook className="h-5 w-5 mr-2" />;
      case 'international':
        return <Globe className="h-5 w-5 mr-2" />;
      default:
        return <Newspaper className="h-5 w-5 mr-2" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">TCI News Aggregator</h1>
          <p className="mt-2 text-white/80">Your one-stop source for Turks and Caicos Islands news</p>
          
          {/* Search Bar */}
          <div className="mt-4 relative flex">
            <div className="flex-grow relative">
              <input
                type="text"
                placeholder="Search news..."
                className="w-full p-3 pl-10 rounded-lg text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
            </div>
            <button
              className="ml-2 px-4 py-3 bg-white text-blue-600 rounded-lg flex items-center hover:bg-blue-50"
              onClick={() => setShowTopicFilter(!showTopicFilter)}
            >
              <Filter className="h-5 w-5 mr-2" />
              Topics
            </button>
            <button
              className="ml-2 px-4 py-3 bg-white text-blue-600 rounded-lg flex items-center hover:bg-blue-50"
              onClick={discoverNewSources}
              disabled={isDiscovering}
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${isDiscovering ? 'animate-spin' : ''}`} />
              {isDiscovering ? 'Searching...' : 'Discover Sources'}
            </button>
          </div>
          
          {showTopicFilter && (
            <div className="mt-3 p-3 bg-white rounded-lg shadow-md">
              <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Filter by Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {topicsList.map(topic => (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`px-3 py-1 text-sm rounded-full transition ${
                      selectedTopics.includes(topic) 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              {selectedTopics.length > 0 && (
                <button
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setSelectedTopics([])}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto py-3 space-x-6">
            <button
              className={`px-3 py-2 font-medium rounded-md transition ${activeTab === 'all' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('all')}
            >
              All News
            </button>
            <button
              className={`px-3 py-2 font-medium rounded-md transition ${activeTab === 'news' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('news')}
            >
              Local News
            </button>
            <button
              className={`px-3 py-2 font-medium rounded-md transition ${activeTab === 'government' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('government')}
            >
              Government
            </button>
            <button
              className={`px-3 py-2 font-medium rounded-md transition ${activeTab === 'police' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('police')}
            >
              Police
            </button>
            <button
              className={`px-3 py-2 font-medium rounded-md transition ${activeTab === 'social' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('social')}
            >
              Social Media
            </button>
            <button
              className={`px-3 py-2 font-medium rounded-md transition ${activeTab === 'international' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('international')}
            >
              International
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {isLoading ? (
          // Loading state
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading latest news...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          // No results state
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No news found matching your search.</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              onClick={() => {
                setSearchTerm('');
                setActiveTab('all');
                setSelectedTopics([]);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          // News grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full uppercase font-semibold">
                    {item.category}
                  </div>
                  {item.topics && item.topics.length > 0 && (
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
                      {item.topics.slice(0, 3).map(topic => (
                        <span key={topic} className="bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded-full">
                          {topic}
                        </span>
                      ))}
                      {item.topics.length > 3 && (
                        <span className="bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded-full">
                          +{item.topics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">{item.title}</h2>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <div className="flex items-center mr-4">
                      {getCategoryIcon(item.category)}
                      <span>{item.source}</span>
                    </div>
                    <span>{item.date}</span>
                  </div>
                  <p className="text-gray-600 mb-4">{item.excerpt}</p>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Read more <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="md:flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">TCI News Aggregator</h2>
              <p className="mt-2 text-gray-400">Aggregating news from across the Turks and Caicos Islands</p>
            </div>
            <div className="mt-4 md:mt-0">
              <h3 className="font-semibold mb-2">News Sources</h3>
              <ul className="text-gray-400">
                <li><a href="https://tcweeklynews.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TC Weekly News</a></li>
                <li><a href="https://suntci.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">SunTCI</a></li>
                <li><a href="https://www.gov.tc/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Government</a></li>
                <li><a href="https://www.tcipolice.tc/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Royal TCI Police Force</a></li>
                <li><a href="https://magneticmediatv.com/category/tci-news/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Magnetic Media</a></li>
                <li><a href="https://www.newslinetci.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">NewslineTCI</a></li>
                <li><a href="https://www.facebook.com/tcisun/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Sun Facebook</a></li>
                <li><a href="https://www.facebook.com/tcitourism/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Tourism Facebook</a></li>
                <li><a href="https://www.theguardian.com/world/turks-and-caicos-islands" target="_blank" rel="noopener noreferrer" className="hover:text-white">The Guardian TCI</a></li>
                <li><a href="https://www.caribjournal.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Caribbean Journal</a></li>
                <li><a href="https://tcfreepress.tc/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Free Press</a></li>
                <li><a href="https://www.thebahamasweekly.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">The Bahamas Weekly</a></li>
                <li><a href="https://www.facebook.com/PeoplesTelevision/" target="_blank" rel="noopener noreferrer" className="hover:text-white">PTV People's Television</a></li>
                <li><a href="https://www.facebook.com/turksandcaicosmedia/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Turks and Caicos Media</a></li>
                <li><a href="https://www.facebook.com/TheRealTCIYellowPages/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCIOnline</a></li>
                <li><a href="https://www.facebook.com/groups/696710547555714/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Support Local TCI Group</a></li>
                <li><a href="https://www.facebook.com/groups/662080657183813/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Tourist Guide Group</a></li>
                <li><a href="https://www.facebook.com/UKinTCI/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Governor's Office</a></li>
                <li><a href="https://www.facebook.com/OfficeoftheDeputyGovernorTCI/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Office of the Deputy Governor</a></li>
                <li><a href="https://www.facebook.com/RTCIPF/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Royal Turks and Caicos Islands Police Force</a></li>
                <li><a href="https://magneticmediatv.com/category/tci-news/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Eagle Legal News (via Magnetic Media)</a></li>
                <li><a href="https://www.facebook.com/TCIHospital/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Hospital</a></li>
                <li><a href="https://www.facebook.com/tcinhib/" target="_blank" rel="noopener noreferrer" className="hover:text-white">National Health Insurance Board</a></li>
                <li><a href="https://www.facebook.com/fortistci/" target="_blank" rel="noopener noreferrer" className="hover:text-white">FortisTCI</a></li>
                <li><a href="https://www.facebook.com/provowater/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Provo Water Company</a></li>
                <li><a href="https://www.digicelgroup.com/tc/en" target="_blank" rel="noopener noreferrer" className="hover:text-white">Digicel TCI</a></li>
                <li><a href="https://discoverflow.co/turks-caicos/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Flow TCI</a></li>
                <li><a href="https://www.facebook.com/OfficialTCHTA/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Hotel & Tourism Association</a></li>
                <li><a href="https://www.gov.tc/physicalplanning/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Planning Department</a></li>
                <li><a href="https://www.facebook.com/tcitourism/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Tourist Board</a></li>
                <li><a href="https://www.facebook.com/tcchamber/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Chamber of Commerce</a></li>
                <li><a href="https://www.facebook.com/investtci/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Invest Turks and Caicos</a></li>
                <li><a href="https://www.facebook.com/Turks-and-Caicos-Real-Estate-Association-1719376091650976/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Real Estate Association</a></li>
                <li><a href="https://www.wherewhenhow.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Where When How Magazine</a></li>
                <li><a href="https://www.facebook.com/groups/todointurksandcaicos/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Things to Do in TCI Group</a></li>
                <li><a href="https://www.facebook.com/OfficialTCICC/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Community College</a></li>
                <li><a href="https://cogoptci.org/" target="_blank" rel="noopener noreferrer" className="hover:text-white">TCI Churches</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-700 text-gray-400 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} TCI News Aggregator. This is a demo application.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TurksAndCaicosNewsAggregator;
