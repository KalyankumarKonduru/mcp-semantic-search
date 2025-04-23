const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const documentController = require('../controllers/document.controller');
const config = require('../config');

describe('Document Controller', () => {
  let req, res, next, axiosStub;

  beforeEach(() => {
    // Mock request object
    req = {
      body: {},
      params: {}
    };

    // Mock response object
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    // Mock next function
    next = sinon.stub();

    // Stub axios
    axiosStub = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    // Restore the stub
    axiosStub.restore();
  });

  describe('createDocument', () => {
    it('should return error if text is not provided', async () => {
      // Arrange
      req.body = {};

      // Act
      await documentController.createDocument(req, res, next);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Document text is required');
    });

    it('should create a document with valid input', async () => {
      // Arrange
      req.body = {
        text: 'Test document text',
        metadata: { note_type: 'progress_note' }
      };

      const mockResponse = {
        data: {
          success: true,
          message: 'Document created successfully'
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.createDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.mcpServiceUrl}/documents`);
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const responseBody = res.json.args[0][0];
      expect(responseBody).to.have.property('success', true);
      expect(responseBody).to.have.property('message', 'Document created successfully');
      expect(responseBody).to.have.property('documentId');
    });

    it('should handle errors from MCP service', async () => {
      // Arrange
      req.body = {
        text: 'Test document text'
      };

      const error = new Error('MCP service error');
      error.response = { 
        data: { error: 'Service unavailable' },
        status: 503
      };
      
      axiosStub.rejects(error);

      // Act
      await documentController.createDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.equal(error);
    });
  });

  describe('createDocumentBatch', () => {
    it('should return error if documents array is not provided', async () => {
      // Arrange
      req.body = {};

      // Act
      await documentController.createDocumentBatch(req, res, next);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Valid documents array is required');
    });

    it('should return error if documents array is empty', async () => {
      // Arrange
      req.body = { documents: [] };

      // Act
      await documentController.createDocumentBatch(req, res, next);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Valid documents array is required');
    });

    it('should create documents in batch with valid input', async () => {
      // Arrange
      req.body = {
        documents: [
          { text: 'Document 1', metadata: { note_type: 'progress_note' } },
          { text: 'Document 2', metadata: { note_type: 'discharge_summary' } }
        ]
      };

      const mockResponse = {
        data: {
          success: true,
          message: 'Processing 2 documents in the background'
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.createDocumentBatch(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.mcpServiceUrl}/documents`);
      
      // Check that the documents were formatted correctly
      const formattedDocs = axiosStub.firstCall.args[1].documents;
      expect(formattedDocs).to.have.length(2);
      expect(formattedDocs[0]).to.have.property('text', 'Document 1');
      expect(formattedDocs[0]).to.have.property('document_id');
      expect(formattedDocs[0]).to.have.property('metadata').that.includes({ note_type: 'progress_note' });
      
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const responseBody = res.json.args[0][0];
      expect(responseBody).to.have.property('success', true);
      expect(responseBody).to.have.property('message').that.includes('Batch of 2 documents');
      expect(responseBody).to.have.property('documentIds').with.lengthOf(2);
    });
  });

  describe('getDocument', () => {
    beforeEach(() => {
      // Replace axios.post stub with axios.get stub for this test
      axiosStub.restore();
      axiosStub = sinon.stub(axios, 'get');
    });

    it('should return 404 if document is not found', async () => {
      // Arrange
      req.params.id = 'non-existent-id';

      const mockResponse = {
        data: {
          success: false,
          message: 'Document not found'
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.getDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.vectorStoreServiceUrl}/vectors/document/non-existent-id`);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Document not found');
    });

    it('should get document by ID', async () => {
      // Arrange
      req.params.id = 'test-doc-id';

      const mockResponse = {
        data: {
          success: true,
          message: 'Document retrieved successfully',
          data: {
            document: {
              metadata: { note_type: 'progress_note' },
              chunks: [{ text: 'Chunk 1' }, { text: 'Chunk 2' }]
            }
          }
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.getDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.vectorStoreServiceUrl}/vectors/document/test-doc-id`);
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.deep.equal(mockResponse.data);
    });
  });

  describe('deleteDocument', () => {
    beforeEach(() => {
      // Replace axios.post stub with axios.delete stub for this test
      axiosStub.restore();
      axiosStub = sinon.stub(axios, 'delete');
    });

    it('should delete document by ID', async () => {
      // Arrange
      req.params.id = 'test-doc-id';

      const mockResponse = {
        data: {
          success: true,
          message: 'Document deleted successfully'
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.deleteDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.mcpServiceUrl}/documents/test-doc-id`);
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.deep.equal(mockResponse.data);
    });

    it('should handle errors when deleting document', async () => {
      // Arrange
      req.params.id = 'test-doc-id';

      const error = new Error('Delete error');
      axiosStub.rejects(error);

      // Act
      await documentController.deleteDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.equal(error);
    });
  });

  describe('listDocuments', () => {
    beforeEach(() => {
      // Replace axios.post stub with axios.get stub for this test
      axiosStub.restore();
      axiosStub = sinon.stub(axios, 'get');
      
      // Add query params
      req.query = {
        page: 1,
        limit: 10
      };
    });

    it('should list documents with pagination', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: 'Retrieved 2 documents',
          data: {
            documents: [
              { id: 'doc1', metadata: { note_type: 'progress_note' } },
              { id: 'doc2', metadata: { note_type: 'discharge_summary' } }
            ],
            total: 2,
            page: 1,
            limit: 10,
            pages: 1
          }
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.listDocuments(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.vectorStoreServiceUrl}/vectors/documents`);
      expect(axiosStub.firstCall.args[1].params).to.deep.equal({ page: 1, limit: 10 });
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.deep.equal(mockResponse.data);
    });

    it('should apply filter parameter', async () => {
      // Arrange
      req.query.filter = 'progress';
      
      const mockResponse = {
        data: {
          success: true,
          message: 'Retrieved 1 document',
          data: {
            documents: [
              { id: 'doc1', metadata: { note_type: 'progress_note' } }
            ],
            total: 1,
            page: 1,
            limit: 10,
            pages: 1
          }
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await documentController.listDocuments(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[1].params).to.have.property('filter', 'progress');
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0].data.documents).to.have.lengthOf(1);
    });
  });
});