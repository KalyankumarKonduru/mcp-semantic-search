const express = require('express');
const searchController = require('../controllers/search.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Search routes
router.post('/', searchController.semanticSearch);
router.post('/hybrid', searchController.hybridSearch);

module.exports = router;