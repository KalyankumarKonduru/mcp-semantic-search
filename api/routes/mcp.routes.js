const express = require('express');
const mcpController = require('../controllers/mcp.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// MCP routes
router.post('/context', mcpController.getContext);
router.post('/documents', mcpController.ingestDocuments);
router.delete('/documents/:id', mcpController.deleteDocument);

module.exports = router;