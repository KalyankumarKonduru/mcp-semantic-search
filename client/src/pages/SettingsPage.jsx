// src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [embeddingModel, setEmbeddingModel] = useState('biobert');
  const [toastMessage, setToastMessage] = useState(null);

  // Load settings on initial render
  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey') || '';
    const savedApiEndpoint = localStorage.getItem('apiEndpoint') || '';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedEmbeddingModel = localStorage.getItem('embeddingModel') || 'biobert';

    setApiKey(savedApiKey);
    setApiEndpoint(savedApiEndpoint);
    setDarkMode(savedDarkMode);
    setEmbeddingModel(savedEmbeddingModel);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiEndpoint', apiEndpoint);
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('embeddingModel', embeddingModel);

    showToast('Settings saved', 'Your settings have been saved successfully', 'success');
  };

  const handleResetSettings = () => {
    if (!window.confirm('Are you sure you want to reset all settings?')) {
      return;
    }
    localStorage.removeItem('apiKey');
    localStorage.removeItem('apiEndpoint');
    localStorage.removeItem('darkMode');
    localStorage.removeItem('embeddingModel');

    setApiKey('');
    setApiEndpoint('');
    setDarkMode(false);
    setEmbeddingModel('biobert');

    showToast('Settings reset', 'All settings have been reset to defaults', 'info');
  };

  const togglePasswordVisibility = () => {
    setShowApiKey(prev => !prev);
  };

  const showToast = (title, description, status) => {
    setToastMessage({ title, description, status });
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Configure your semantic search application
        </p>
      </div>

      <div className="settings-card">
        <div className="settings-form">
          <h2 className="settings-section-title">API Configuration</h2>

          <div className="form-group">
            <label htmlFor="api-endpoint">API Endpoint</label>
            <input
              id="api-endpoint"
              type="text"
              placeholder="http://localhost:3000/api/v1"
              value={apiEndpoint}
              onChange={e => setApiEndpoint(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <div className="input-group">
              <input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your API key"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="form-input"
              />
              <button
                type="button"
                className="input-icon-button"
                onClick={togglePasswordVisibility}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                <span className="eye-icon">
                  {showApiKey ? '👁️' : '👁️‍🗨️'}
                </span>
              </button>
            </div>
          </div>

          <hr className="divider" />

          <h2 className="settings-section-title">Application Settings</h2>

          <div className="form-group switch-group">
            <label htmlFor="dark-mode" className="switch-label">
              Dark Mode
            </label>
            <label className="switch">
              <input
                id="dark-mode"
                type="checkbox"
                checked={darkMode}
                onChange={e => setDarkMode(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="embedding-model">Embedding Model</label>
            <select
              id="embedding-model"
              value={embeddingModel}
              onChange={e => setEmbeddingModel(e.target.value)}
              className="form-select"
            >
              <option value="biobert">BioBERT</option>
              <option value="clinicalbert">ClinicalBERT</option>
              <option value="pubmedbert">PubMedBERT</option>
            </select>
          </div>

          <hr className="divider" />

          <div className="button-group">
            <button className="primary-button" onClick={handleSaveSettings}>
              Save Settings
            </button>
            <button
              className="danger-outline-button"
              onClick={handleResetSettings}
            >
              Reset to Defaults
            </button>
          </div>

          <div className="current-config">
            <h3 className="config-title">Current Configuration</h3>
            <div className="badge-container">
              <span className="badge badge-blue">
                API: {apiEndpoint ? 'Configured' : 'Not Set'}
              </span>
              <span className="badge badge-green">
                Auth: {apiKey ? 'Configured' : 'Not Set'}
              </span>
              <span className="badge badge-purple">
                Model: {embeddingModel}
              </span>
              <span className="badge badge-gray">
                Theme: {darkMode ? 'Dark' : 'Light'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className={`toast-notification toast-${toastMessage.status}`}>
          <div className="toast-title">{toastMessage.title}</div>
          <div className="toast-description">{toastMessage.description}</div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
