const axios = require('axios');
const config = require('../config');

/**
 * Create a single document
 */
exports.createDocument = async (req, res, next) => {
  try {
    const { text, metadata } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Document text is required'
      });
    }
    
    // Generate a unique document ID if not provided
    const documentId = req.body.documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Forward to MCP service
    const response = await axios.post(`${config.mcpServiceUrl}/documents`, {
      documents: [
        {
          text,
          document_id: documentId,
          metadata: metadata || {}
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      documentId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create multiple documents in batch
 */
exports.createDocumentBatch = async (req, res, next) => {
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
      document_id: doc.documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
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
    
    res.status(201).json({
      success: true,
      message: `Batch of ${documents.length} documents created successfully`,
      documentIds: formattedDocs.map(doc => doc.document_id)
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get a document by ID
 */
exports.getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Forward to vector store service
    const response = await axios.get(`${config.vectorStoreServiceUrl}/vectors/document/${id}`, {
      headers: {
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    if (!response.data || response.data.success === false) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }
    
    res.json(response.data);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a document
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

/**
 * List documents (with pagination)
 */
exports.listDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, filter } = req.query;
    
    // Forward to vector store service
    const response = await axios.get(`${config.vectorStoreServiceUrl}/vectors/documents`, {
      params: {
        page,
        limit,
        filter
      },
      headers: {
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    res.json(response.data);
    
  } catch (error) {
    next(error);
  }
};