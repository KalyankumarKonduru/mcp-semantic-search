// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import SearchPage from './pages/SearchPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  useEffect(() => {
    // Set default API key if not already present
    if (!localStorage.getItem('apiKey')) {
      // Replace with your new API key
      localStorage.setItem('apiKey', 'your-new-api-key');
    }
  }, []);

  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/documents" element={<DocumentManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;