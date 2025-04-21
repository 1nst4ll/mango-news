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
      <div className="flex flex-col min-h-screen"> {/* Use flex column for full height layout */}
        <div className="navbar bg-base-100 shadow-md"> {/* DaisyUI navbar */}
          <div className="container mx-auto"> {/* Container for navbar content */}
            <div className="flex-1">
              <Link to="/" className="btn btn-ghost text-xl">Turks and Caicos News Aggregator</Link> {/* DaisyUI button for title */}
            </div>
            <div className="flex-none">
              <ul className="menu menu-horizontal px-1">
                <li><Link to="/admin">Admin</Link></li> {/* DaisyUI menu item */}
              </ul>
            </div>
          </div>
        </div>

        <main className="container mx-auto p-4 flex-grow"> {/* Main content area, flex-grow to fill space */}
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
                <Link to="/" className="btn btn-ghost btn-sm mb-4">Back to News Feed</Link> {/* DaisyUI button */}
                <AdminDashboard />
              </>
            } /> {/* Route for AdminDashboard */}
            <Route path="/admin/sources" element={
              <>
                <Link to="/admin" className="btn btn-ghost btn-sm mb-4">Back to Admin Dashboard</Link> {/* DaisyUI button */}
                <SourceManagement />
              </>
            } /> {/* Route for SourceManagement */}
          </Routes>
        </main>

        {/* Optional: Add a footer here */}
        {/* <footer className="footer footer-center p-4 bg-base-300 text-base-content">
          <aside>
            <p>Copyright © 2023 - All right reserved by ACME Industries Ltd</p>
          </aside>
        </footer> */}
      </div>
    </BrowserRouter>
  );
}

export default App;
