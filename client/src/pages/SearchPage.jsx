// src/pages/SearchPage.jsx
import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { searchApi, mcpApi } from '../api';
import './SearchPage.css';

const SearchPage = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStats, setSearchStats] = useState({
    query: '',
    executionTimeMs: 0
  });
  const [activeTab, setActiveTab] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setResults([]);
    
    try {
      let response;
      
      // Handle different search types based on the active tab
      if (activeTab === 0) {
        // Semantic search
        if (searchParams.isHybrid && searchParams.keywords) {
          response = await searchApi.hybridSearch(
            searchParams.query,
            searchParams.keywords,
            10
          );
        } else {
          response = await searchApi.semanticSearch(searchParams.query, 10);
        }
      } else if (activeTab === 1) {
        // MCP context
        response = await mcpApi.getContext(searchParams.query, 10);
        
        // Convert MCP response format to search results format
        if (response.data && response.data.contexts) {
          response.data.results = response.data.contexts.map(context => ({
            text: context.text,
            score: context.relevance_score,
            metadata: {
              doc_id: context.source.document_id,
              note_type: context.source.note_type,
              date: context.source.date,
              department: context.source.department
            }
          }));
          
          response.data.executionTimeMs = response.data.metadata.query_time_ms;
        }
      }
      
      setResults(response.data.results || []);
      setSearchStats({
        query: searchParams.query,
        executionTimeMs: response.data.executionTimeMs || 0
      });
      
    } catch (error) {
      console.error('Search error:', error);
      showToast('Search failed', error.response?.data?.error || 'An error occurred during search', 'error');
      
      setResults([]);
    } finally {
      setIsLoading(false);
    }
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
    <div className="search-container">
      <div className="search-header">
        <h1 className="page-title">Semantic EHR Search</h1>
        <p className="page-description">
          Search through EHR notes using natural language or medical terms
        </p>
      </div>
      
      <div className="tabs-container">
        <div className="tab-list">
          <button 
            className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            Semantic Search
          </button>
          <button 
            className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            MCP Context
          </button>
        </div>
        
        <div className="tab-panels">
          <div className={`tab-panel ${activeTab === 0 ? 'active' : ''}`}>
            <div className="search-bar-container">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              <p className="search-tip">
                Try queries like: "patients with medication side effects" or "abnormal lab results in diabetic patients"
              </p>
            </div>
            
            <hr className="divider" />
            
            <SearchResults 
              results={results} 
              query={searchStats.query}
              executionTimeMs={searchStats.executionTimeMs}
            />
          </div>
          
          <div className={`tab-panel ${activeTab === 1 ? 'active' : ''}`}>
            <div className="search-bar-container">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              <p className="search-tip">
                MCP context provides rich context for AI agents and applications
              </p>
            </div>
            
            <hr className="divider" />
            
            <SearchResults 
              results={results} 
              query={searchStats.query}
              executionTimeMs={searchStats.executionTimeMs}
            />
          </div>
        </div>
      </div>
      
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

export default SearchPage;