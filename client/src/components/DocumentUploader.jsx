// src/components/DocumentUploader.jsx
import React, { useState, useRef } from 'react';
import { documentApi } from '../api';
import './DocumentUploader.css';

const DocumentUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [noteType, setNoteType] = useState('progress_note');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (title, description, status) => {
    setToastMessage({ title, description, status });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleFileChange = e => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setText('');
    }
  };

  const handleTextChange = e => {
    setText(e.target.value);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFile(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file && !text.trim()) {
      showToast('Input required', 'Please upload a file or enter text', 'warning');
      return;
    }

    setIsLoading(true);
    setUploadProgress(10);

    try {
      // Read file as UTF-8 text, or use textarea content
      const bodyText = file ? await file.text() : text;

      const metadata = {
        note_type: noteType,
        department: department || undefined,
        date: new Date().toISOString().split('T')[0],
      };

      // Simulate progress bar
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 10, 90));
      }, 300);

      // Always send JSON { text, metadata }
      const response = await documentApi.createDocument(bodyText, metadata);
      clearInterval(progressInterval);

      setUploadProgress(100);
      showToast('Success', 'Document processed successfully', 'success');

      // Reset form
      setText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadComplete && onUploadComplete(response.data);
    } catch (err) {
      console.error(err);
      const desc = err.response?.data?.error || err.message || 'Upload failed';
      showToast('Error', desc, 'error');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
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
            onChange={e => setNoteType(e.target.value)}
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
            onChange={e => setDepartment(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="file-upload">Upload File</label>
          <input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="file-input"
          />
          <p className="file-input-help">Supported: plain-text (.txt) only</p>
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
          />
        </div>

        {uploadProgress > 0 && (
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          className="upload-button"
          disabled={isLoading}
        >
          {isLoading ? 'Uploading…' : 'Upload Document'}
        </button>
      </div>

      {toastMessage && (
        <div className={`toast-notification toast-${toastMessage.status}`}>
          <div className="toast-title">{toastMessage.title}</div>
          <div className="toast-description">{toastMessage.description}</div>
        </div>
      )}
    </form>
  );
};

export default DocumentUploader;
