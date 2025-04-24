// src/pages/DocumentManagementPage.jsx
import React, { useState, useEffect } from 'react';
import DocumentUploader from '../components/DocumentUploader';
import { documentApi } from '../api';
import './DocumentManagementPage.css';

const DocumentManagementPage = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchDocuments(1);
  }, []);

  const fetchDocuments = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const response = await documentApi.listDocuments(pageNum, 10);
      const docs = response.data?.data?.documents || [];

      if (pageNum === 1) {
        setDocuments(docs);
      } else {
        setDocuments((prev) => [...prev, ...docs]);
      }

      setPage(pageNum);
      setHasMore(docs.length === 10);
    } catch (error) {
      console.error('Error fetching documents:', error);
      const description =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'An error occurred';
      showToast('Error fetching documents', description, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = () => {
    // After a successful upload, reload page 1
    fetchDocuments(1);
  };

  const handleViewDocument = async (id) => {
    try {
      const response = await documentApi.getDocument(id);
      setSelectedDocument(response.data.data.document);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching document:', error);
      showToast(
        'Error fetching document',
        error.response?.data?.error || error.message,
        'error'
      );
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await documentApi.deleteDocument(id);
      showToast('Document deleted', '', 'success');
      fetchDocuments(1);
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast(
        'Error deleting document',
        error.response?.data?.error || error.message,
        'error'
      );
    }
  };

  const loadMoreDocuments = () => {
    if (!isLoading && hasMore) fetchDocuments(page + 1);
  };

  const showToast = (title, description, status) => {
    setToastMessage({ title, description, status });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const closeModal = () => setIsModalOpen(false);

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
                          <td>{doc.metadata.title || doc.id}</td>
                          <td>
                            <span className="badge badge-blue">
                              {doc.metadata.note_type || 'Document'}
                            </span>
                          </td>
                          <td>{doc.metadata.date || 'N/A'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="icon-button view-button"
                                onClick={() => handleViewDocument(doc.id)}
                                aria-label="View document"
                              >
                                {/* eye icon */}
                                👁️
                              </button>
                              <button
                                className="icon-button delete-button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                aria-label="Delete document"
                              >
                                {/* trash icon */}
                                🗑️
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

      {isModalOpen && selectedDocument && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedDocument.metadata.title || 'Document Details'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="badge-container">
                {selectedDocument.metadata.date && (
                  <span className="badge badge-green">
                    Date: {selectedDocument.metadata.date}
                  </span>
                )}
                {selectedDocument.metadata.department && (
                  <span className="badge badge-purple">
                    Dept: {selectedDocument.metadata.department}
                  </span>
                )}
                <span className="badge badge-gray">ID: {selectedDocument.id}</span>
              </div>
              <hr className="divider" />
              <div className="document-content">
                <pre>{selectedDocument.text}</pre>
              </div>
              {selectedDocument.chunks?.length > 0 && (
                <div className="chunks-section">
                  <h3 className="chunks-title">Document Chunks</h3>
                  {selectedDocument.chunks.map((chunk, idx) => (
                    <div key={idx} className="chunk-item">
                      <div className="chunk-header">Chunk {idx + 1}</div>
                      <p className="chunk-text">{chunk.text.slice(0, 100)}…</p>
                    </div>
                  ))}
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

      {toastMessage && (
        <div className={`toast-notification toast-${toastMessage.status}`}>
          <div className="toast-title">{toastMessage.title}</div>
          <div className="toast-description">{toastMessage.description}</div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagementPage;
