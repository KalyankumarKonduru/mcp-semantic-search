const express = require('express');
const mcpController = require('../controllers/mcp.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/context', mcpController.getContext);
router.post('/documents', mcpController.ingestDocuments);
router.delete('/documents/:id', mcpController.deleteDocument);

module.exports = router;