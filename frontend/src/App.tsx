import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'; // Import routing components
import NewsFeed from './components/NewsFeed';
import TopicFilter from './components/TopicFilter';
import DateRangeFilter from './components/DateRangeFilter'; // Import DateRangeFilter
import ArticleDetail from './components/ArticleDetail'; // Import ArticleDetail component
import AdminDashboard from './components/AdminDashboard'; // Import AdminDashboard component
import SourceManagement from './components/SourceManagement'; // Import SourceManagement component

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
      <div>
        <div>
          <div>
            <Link to="/">Turks and Caicos News Aggregator</Link>
          </div>
          <div>
            <ul>
              <li><Link to="/admin">Admin</Link></li>
            </ul>
          </div>
        </div>

        <main>
          <Routes> {/* Define routes */}
            <Route path="/" element={
              <> {/* Use a fragment for multiple elements */}
                <h2>News Feed</h2>
                <div>
                  <TopicFilter onSelectTopic={handleTopicSelect} /> {/* Add TopicFilter */}
                  <DateRangeFilter onSelectDateRange={handleDateRangeSelect} /> {/* Add DateRangeFilter */}
                </div>
                <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} /> {/* Pass filter states to NewsFeed */}
              </>
            } />
            <Route path="/article/:id" element={<ArticleDetail />} /> {/* Route for ArticleDetail */}
            <Route path="/admin" element={
              <>
                <Link to="/">Back to News Feed</Link>
                <AdminDashboard />
              </>
            } /> {/* Route for AdminDashboard */}
            <Route path="/admin/sources" element={
              <>
                <Link to="/admin">Back to Admin Dashboard</Link>
                <SourceManagement />
              </>
            } /> {/* Route for SourceManagement */}
          </Routes>
        </main>

        {/* Optional: Add a footer here */}
        {/* <footer>
          <aside>
            <p>Copyright © 2023 - All right reserved by ACME Industries Ltd</p>
          </aside>
        </footer> */}
      </div>
    </BrowserRouter>
  );
}

export default App;
