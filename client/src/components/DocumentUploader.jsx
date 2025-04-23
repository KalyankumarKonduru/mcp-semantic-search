// src/components/DocumentUploader.jsx
import React, { useState, useRef } from 'react';
import { documentApi } from '../api';
import './DocumentUploader.css';

const DocumentUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [noteType, setNoteType] = useState('progress_note');
  const [department, setDepartment] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Clear text input when file is selected
      setText('');
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Clear file input when text is entered
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!file && !text.trim()) {
      showToast('Input required', 'Please upload a file or enter text', 'warning');
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(10);
    
    try {
      // Prepare metadata
      const metadata = {
        note_type: noteType,
        department: department || undefined,
        date: new Date().toISOString().split('T')[0]
      };
      
      let response;
      
      if (file) {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 300);
        
        // Upload file
        response = await documentApi.uploadDocument(file, metadata);
        
        clearInterval(progressInterval);
      } else {
        // Upload text directly
        response = await documentApi.createDocument(text, metadata);
      }
      
      setUploadProgress(100);
      
      showToast('Document uploaded', 'Document has been successfully processed', 'success');
      
      // Reset form
      setText('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed', error.response?.data?.error || 'An error occurred during upload', 'error');
    } finally {
      setIsLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
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
    <form onSubmit={handleSubmit} className="document-uploader-form">
      <div className="uploader-content">
        <h2 className="section-title">Upload Document</h2>
        
        <div className="form-group">
          <label htmlFor="document-type">Document Type</label>
          <select 
            id="document-type"
            className="form-select"
            value={noteType} 
            onChange={(e) => setNoteType(e.target.value)}
          >
            <option value="progress_note">Progress Note</option>
            <option value="discharge_summary">Discharge Summary</option>
            <option value="consultation">Consultation</option>
            <option value="lab_report">Lab Report</option>
            <option value="radiology_report">Radiology Report</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="department">Department (Optional)</label>
          <input 
            id="department"
            type="text"
            className="form-input"
            placeholder="e.g., Cardiology, Neurology, etc."
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="file-upload">Upload File</label>
          <input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.pdf,.doc,.docx"
            className="file-input"
          />
          <p className="file-input-help">
            Supported formats: TXT, PDF, DOC, DOCX
          </p>
        </div>
        
        <div className="divider-text">OR</div>
        
        <div className="form-group">
          <label htmlFor="document-text">Enter Text</label>
          <textarea
            id="document-text"
            className="form-textarea"
            placeholder="Paste or type document text here..."
            value={text}
            onChange={handleTextChange}
          ></textarea>
        </div>
        
        {uploadProgress > 0 && (
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        <button
          type="submit"
          className="upload-button"
          disabled={isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload Document'}
        </button>
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
    </form>
  );
};

export default DocumentUploader;