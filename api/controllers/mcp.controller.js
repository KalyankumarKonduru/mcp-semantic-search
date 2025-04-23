const axios = require('axios');
const config = require('../config');

/**
 * Get context for a query via MCP
 */
exports.getContext = async (req, res, next) => {
  try {
    const { query, limit = 5, metadata_filters } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }
    
    // Forward to MCP service
    const response = await axios.post(`${config.mcpServiceUrl}/context`, {
      query,
      limit,
      metadata_filters
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    res.json(response.data);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Ingest documents via MCP
 */
exports.ingestDocuments = async (req, res, next) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: 'Valid documents array is required'
      });
    }
    
    // Format documents for MCP service
    const formattedDocs = documents.map(doc => ({
      text: doc.text,
      document_id: doc.documentId || doc.document_id,
      metadata: doc.metadata || {}
    }));
    
    // Forward to MCP service
    const response = await axios.post(`${config.mcpServiceUrl}/documents`, {
      documents: formattedDocs
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    res.json(response.data);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a document via MCP
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Forward to MCP service
    const response = await axios.delete(`${config.mcpServiceUrl}/documents/${id}`, {
      headers: {
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    res.json(response.data);
    
  } catch (error) {
    next(error);
  }
};