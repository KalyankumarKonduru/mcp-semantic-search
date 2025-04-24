// api/routes/document.routes.js
const express = require('express');
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/', documentController.createDocument);
router.post('/batch', documentController.createDocumentBatch);
router.get('/:id', documentController.getDocument);
router.delete('/:id', documentController.deleteDocument);
router.get('/', documentController.listDocuments);

module.exports = router;
