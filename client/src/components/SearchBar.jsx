// src/components/SearchBar.jsx
import React, { useState } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [isHybridSearch, setIsHybridSearch] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!query && (!isHybridSearch || !keywords)) {
      showToast('Search query required', 'Please enter a search query', 'warning');
      return;
    }
    
    onSearch({
      query,
      keywords: isHybridSearch ? keywords : null,
      isHybrid: isHybridSearch
    });
  };

  const showToast = (title, description, status) => {
    setToastMessage({
      title,
      description,
      status
    });
    
    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  return (
    <div className="search-bar-wrapper">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-options">
          <label className="hybrid-search-label">
            <span>Enable hybrid search</span>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="hybrid-search"
                checked={isHybridSearch}
                onChange={(e) => setIsHybridSearch(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </div>
          </label>
        </div>
        
        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder="Enter semantic search query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          
          <button
            type="submit"
            className="search-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="search-spinner"></div>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            )}
          </button>
        </div>
        
        {isHybridSearch && (
          <input
            type="text"
            className="keywords-input"
            placeholder="Additional keywords (optional)..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        )}
      </form>
      
      {/* Toast notification */}
      {toastMessage && (
        <div className={`toast-notification toast-${toastMessage.status}`}>
          <div className="toast-title">{toastMessage.title}</div>
          {toastMessage.description && (
            <div className="toast-description">{toastMessage.description}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;