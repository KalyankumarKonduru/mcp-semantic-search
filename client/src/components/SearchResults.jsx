// src/components/SearchResults.jsx
import React from 'react';
import './SearchResults.css';

const SearchResults = ({ results, query, executionTimeMs }) => {
  if (!results || results.length === 0) {
    return (
      <div className="empty-results">
        <p>No results found for your query.</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <h2 className="results-title">Search Results</h2>
        
        <div className="results-stats">
          <div className="stat-item">
            <div className="stat-label">Results</div>
            <div className="stat-value">{results.length}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Time</div>
            <div className="stat-value">{executionTimeMs}ms</div>
          </div>
        </div>
      </div>
      
      <div className="results-list">
        {results.map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-header">
              <div className="badge-container">
                <span className="badge badge-blue">{result.metadata.note_type || 'Document'}</span>
                {result.metadata.department && (
                  <span className="badge badge-purple">{result.metadata.department}</span>
                )}
                {result.metadata.date && (
                  <span className="badge badge-green">{result.metadata.date}</span>
                )}
              </div>
              
              <span className="badge badge-outline">
                Score: {result.score.toFixed(2)}
              </span>
            </div>
            
            <hr className="divider" />
            
            <div className="result-content">
              {result.highlight ? (
                <div dangerouslySetInnerHTML={{ __html: result.highlight }} />
              ) : (
                <p className="result-text">{result.text}</p>
              )}
            </div>
            
            {result.metadata.doc_id && (
              <p className="result-doc-id">
                Document ID: {result.metadata.doc_id}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;