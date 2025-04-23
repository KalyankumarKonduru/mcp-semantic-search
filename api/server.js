const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const routes = require('./routes');

// Load environment variables
// At the very top of api/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Then add the debug logging
console.log('Environment variables:');
console.log('API_KEY:', process.env.API_KEY ? 'Set (length: ' + process.env.API_KEY.length + ')' : 'Not set');
console.log('SERVICE_API_KEY:', process.env.SERVICE_API_KEY ? 'Set (length: ' + process.env.SERVICE_API_KEY.length + ')' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SKIP_AUTH_IN_DEV:', process.env.SKIP_AUTH_IN_DEV);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json({ limit: '10mb' })); // JSON body parsing with larger limit for document ingestion
app.use(morgan('dev')); // Request logging

// API routes
app.use('/api/v1', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp-semantic-search-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;