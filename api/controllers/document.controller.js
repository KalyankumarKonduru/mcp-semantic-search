const axios = require('axios');
const config = require('../config');
const pdf = require('pdf-parse');    // install with `npm install pdf-parse`

/**
 * Handle multipart file upload, convert to text, then forward to MCP
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse metadata JSON if provided
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch {
        return res.status(400).json({ error: 'Invalid metadata JSON' });
      }
    }

    // Extract text from buffer
    let text = '';
    const mime = req.file.mimetype;
    if (mime === 'application/pdf') {
      const data = await pdf(req.file.buffer);
      text = data.text;
    } else {
      text = req.file.buffer.toString('utf8');
    }

    // Assign or preserve document_id
    const documentId =
      metadata.document_id ||
      `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    metadata.document_id = documentId;

    // Forward to MCP
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.serviceApiKey
    };
    const mcpRes = await axios.post(
      `${config.mcpServiceUrl}/documents`,
      { documents: [{ text, document_id: documentId, metadata }] },
      { headers }
    );

    if (!mcpRes.data.success) {
      return res
        .status(500)
        .json({ error: mcpRes.data.message || 'MCP ingestion failed' });
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded & document ingested',
      documentId
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create from raw text
 */
exports.createDocument = async (req, res, next) => {
  try {
    const { text, metadata = {} } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Document text is required' });
    }

    const documentId =
      metadata.document_id ||
      `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    metadata.document_id = documentId;

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.serviceApiKey
    };
    const mcpRes = await axios.post(
      `${config.mcpServiceUrl}/documents`,
      { documents: [{ text, document_id: documentId, metadata }] },
      { headers }
    );
    if (!mcpRes.data.success) {
      return res
        .status(500)
        .json({ error: mcpRes.data.message || 'MCP ingestion failed' });
    }

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      documentId
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create multiple documents in batch
 */
exports.createDocumentBatch = async (req, res, next) => {
  try {
    const { documents } = req.body;
    if (!Array.isArray(documents) || documents.length === 0) {
      return res
        .status(400)
        .json({ error: 'Valid documents array is required' });
    }

    const formattedDocs = documents.map((doc) => {
      const id =
        doc.document_id ||
        `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        text: doc.text,
        document_id: id,
        metadata: { ...doc.metadata, document_id: id }
      };
    });

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.serviceApiKey
    };
    const mcpRes = await axios.post(
      `${config.mcpServiceUrl}/documents`,
      { documents: formattedDocs },
      { headers }
    );
    if (!mcpRes.data.success) {
      return res
        .status(500)
        .json({ error: mcpRes.data.message || 'MCP batch ingestion failed' });
    }

    res.status(201).json({
      success: true,
      message: `Batch of ${formattedDocs.length} documents created successfully`,
      documentIds: formattedDocs.map((d) => d.document_id)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a document by ID
 */
exports.getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const headers = { 'x-api-key': config.serviceApiKey };
    const vsRes = await axios.get(
      `${config.vectorStoreServiceUrl}/vectors/document/${id}`,
      { headers }
    );
    if (!vsRes.data.success) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(vsRes.data);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a document
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const headers = { 'x-api-key': config.serviceApiKey };
    const mcpRes = await axios.delete(
      `${config.mcpServiceUrl}/documents/${id}`,
      { headers }
    );
    res.json(mcpRes.data);
  } catch (err) {
    next(err);
  }
};

/**
 * List documents (with pagination)
 */
exports.listDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, filter } = req.query;
    const headers = { 'x-api-key': config.serviceApiKey };
    const vsRes = await axios.get(
      `${config.vectorStoreServiceUrl}/vectors/documents`,
      { params: { page, limit, filter }, headers }
    );
    res.json(vsRes.data);
  } catch (err) {
    next(err);
  }
};
