const express = require('express');
const documentRoutes = require('./document.routes');
const searchRoutes = require('./search.routes');
const mcpRoutes = require('./mcp.routes');

const router = express.Router();

// Map routes
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);
router.use('/mcp', mcpRoutes);

module.exports = router;