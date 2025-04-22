import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import NewsFeed from './components/NewsFeed';
import TopicFilter from './components/TopicFilter';
import DateRangeFilter from './components/DateRangeFilter';
import ArticleDetail from './components/ArticleDetail';
import AdminDashboard from './components/AdminDashboard';
import SourceManagement from './components/SourceManagement';

function App() {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleDateRangeSelect = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <BrowserRouter>
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex justify-between items-center mb-8">
          <div className="text-2xl font-bold">
            <Link to="/">Turks and Caicos News Aggregator</Link>
          </div>
          <nav>
            <ul>
              <li><Link to="/admin">Admin</Link></li>
            </ul>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={
              <>
                <h2 className="text-xl font-semibold mb-4">News Feed</h2>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <TopicFilter onSelectTopic={handleTopicSelect} />
                  <DateRangeFilter onSelectDateRange={handleDateRangeSelect} />
                </div>
                <NewsFeed selectedTopic={selectedTopic} startDate={startDate} endDate={endDate} />
              </>
            } />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/admin" element={
              <>
                <Link to="/">Back to News Feed</Link>
                <AdminDashboard />
              </>
            } />
            <Route path="/admin/sources" element={
              <>
                <Link to="/admin">Back to Admin Dashboard</Link>
                <SourceManagement />
              </>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
