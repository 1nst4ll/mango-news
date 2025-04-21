import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'; // Import routing components
import NewsFeed from './components/NewsFeed';
import TopicFilter from './components/TopicFilter';
import DateRangeFilter from './components/DateRangeFilter'; // Import DateRangeFilter
import ArticleDetail from './components/ArticleDetail'; // Import ArticleDetail component
import AdminDashboard from './components/AdminDashboard'; // Import AdminDashboard component
import SourceManagement from './components/SourceManagement'; // Import SourceManagement component
import './index.css'; // Import Tailwind CSS

function App() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null); // State for start date
  const [endDate, setEndDate] = useState<string | null>(null); // State for end date


  const handleTopicSelect = (topic: string) => { // Added type annotation
    setSelectedTopic(topic);
  };

  const handleDateRangeSelect = (start: string | null, end: string | null) => { // Added type annotation
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <BrowserRouter> {/* Wrap the application with BrowserRouter */}
      <div className="container mx-auto p-4"> {/* Added Tailwind container and padding */}
        <h1 className="text-3xl font-bold mb-4">
          Turks and Caicos News Aggregator
          <Link to="/admin" className="ml-4 text-blue-500 hover:underline text-sm">Admin</Link>
        </h1> {/* Added Tailwind classes */}

        <Routes> {/* Define routes */}
          <Route path="/" element={
            <> {/* Use a fragment for multiple elements */}
              <h2 className="text-2xl font-semibold mb-4">News Feed</h2> {/* Added Tailwind classes */}
              <div className="flex flex-wrap gap-4 mb-4"> {/* Added flex container for filters */}
                <TopicFilter onSelectTopic={handleTopicSelect} /> {/* Add TopicFilter */}
                <DateRangeFilter onSelectDateRange={handleDateRangeSelect} /> {/* Add DateRangeFilter */}
              </div>
              <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} /> {/* Pass filter states to NewsFeed */}
            </>
          } />
          <Route path="/article/:id" element={<ArticleDetail />} /> {/* Route for ArticleDetail */}
          <Route path="/admin" element={
            <>
              <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">Back to News Feed</Link>
              <AdminDashboard />
            </>
          } /> {/* Route for AdminDashboard */}
          <Route path="/admin/sources" element={
            <>
              <Link to="/admin" className="text-blue-500 hover:underline mb-4 inline-block">Back to Admin Dashboard</Link>
              <SourceManagement />
            </>
          } /> {/* Route for SourceManagement */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
