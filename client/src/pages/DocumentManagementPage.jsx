import React, { useState, useEffect } from 'react';
import DocumentUploader from '../components/DocumentUploader';
import { documentApi } from '../api';
import './DocumentManagementPage.css';

const DocumentManagementPage = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch documents on initial load
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async (pageNum = 1) => {
    setIsLoading(true);
    
    try {
      const response = await documentApi.listDocuments(pageNum, 10);
      
      if (pageNum === 1) {
        setDocuments(response.data.documents || []);
      } else {
        setDocuments(prev => [...prev, ...(response.data.documents || [])]);
      }
      
      setPage(pageNum);
      setHasMore((response.data.documents || []).length === 10);
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('Error fetching documents', error.response?.data?.error || 'An error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = () => {
    // Refresh document list after upload
    fetchDocuments(1);
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      await documentApi.deleteDocument(id);
      showToast('Document deleted', '', 'success');
      
      // Refresh document list
      fetchDocuments(1);
      
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast('Error deleting document', error.response?.data?.error || 'An error occurred', 'error');
    }
  };

  const handleViewDocument = async (id) => {
    try {
      const response = await documentApi.getDocument(id);
      setSelectedDocument(response.data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching document:', error);
      showToast('Error fetching document', error.response?.data?.error || 'An error occurred', 'error');
    }
  };

  const loadMoreDocuments = () => {
    fetchDocuments(page + 1);
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

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="document-management-container">
      <div className="document-management-header">
        <h1 className="page-title">Document Management</h1>
        <p className="page-description">
          Upload, view, and manage EHR documents for semantic search
        </p>
      </div>
      
      <div className="document-management-grid">
        <div className="document-management-uploader">
          <div className="card">
            <DocumentUploader onUploadComplete={handleUploadComplete} />
          </div>
        </div>
        
        <div className="document-management-list">
          <div className="card">
            <h2 className="section-title">Document List</h2>
            
            {isLoading && page === 1 ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <p>No documents found</p>
                <p className="empty-state-description">
                  Upload documents to start using semantic search
                </p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="document-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.title || doc.id}</td>
                          <td>
                            <span className="badge badge-blue">
                              {doc.metadata?.note_type || 'Document'}
                            </span>
                          </td>
                          <td>{doc.metadata?.date || 'N/A'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="icon-button view-button"
                                onClick={() => handleViewDocument(doc.id)}
                                aria-label="View document"
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                              <button
                                className="icon-button delete-button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                aria-label="Delete document"
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {hasMore && (
                  <div className="load-more">
                    <button 
                      className="load-more-button"
                      onClick={loadMoreDocuments}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Document view modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedDocument?.title || 'Document Details'}
                {selectedDocument?.metadata?.note_type && (
                  <span className="badge badge-blue modal-badge">
                    {selectedDocument.metadata.note_type}
                  </span>
                )}
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              {selectedDocument ? (
                <div>
                  <div className="badge-container">
                    {selectedDocument.metadata?.date && (
                      <span className="badge badge-green">Date: {selectedDocument.metadata.date}</span>
                    )}
                    {selectedDocument.metadata?.department && (
                      <span className="badge badge-purple">Dept: {selectedDocument.metadata.department}</span>
                    )}
                    {selectedDocument.id && (
                      <span className="badge badge-gray">ID: {selectedDocument.id}</span>
                    )}
                  </div>
                  
                  <hr className="divider" />
                  
                  <div className="document-content">
                    <pre>{selectedDocument.text}</pre>
                  </div>
                  
                  {selectedDocument.chunks && selectedDocument.chunks.length > 0 && (
                    <div className="chunks-section">
                      <h3 className="chunks-title">Document Chunks</h3>
                      <p className="chunks-description">
                        This document has been split into {selectedDocument.chunks.length} chunks for semantic search
                      </p>
                      
                      {selectedDocument.chunks.map((chunk, idx) => (
                        <div key={idx} className="chunk-item">
                          <div className="chunk-header">Chunk {idx + 1}</div>
                          <p className="chunk-text">{chunk.text.substring(0, 100)}...</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="loading-container">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="primary-button" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
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

export default DocumentManagementPage;