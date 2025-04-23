const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const mcpController = require('../controllers/mcp.controller');
const config = require('../config');

describe('MCP Controller', () => {
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

  describe('getContext', () => {
    it('should return error if query is not provided', async () => {
      // Arrange
      req.body = {};

      // Act
      await mcpController.getContext(req, res, next);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Query is required');
    });

    it('should get context for a valid query', async () => {
      // Arrange
      req.body = {
        query: 'test query',
        limit: 5,
        metadata_filters: {
          note_type: ['progress_note']
        }
      };

      const mockResponse = {
        data: {
          contexts: [
            {
              text: 'Context text 1',
              source: {
                document_id: 'doc1',
                note_type: 'progress_note'
              },
              relevance_score: 0.95
            },
            {
              text: 'Context text 2',
              source: {
                document_id: 'doc2',
                note_type: 'progress_note'
              },
              relevance_score: 0.85
            }
          ],
          metadata: {
            total_matches: 2,
            query_time_ms: 15
          }
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await mcpController.getContext(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.mcpServiceUrl}/context`);
      
      // Check that the request body was formatted correctly
      const requestBody = axiosStub.firstCall.args[1];
      expect(requestBody).to.have.property('query', 'test query');
      expect(requestBody).to.have.property('limit', 5);
      expect(requestBody).to.have.property('metadata_filters').that.deep.equals({
        note_type: ['progress_note']
      });
      
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.deep.equal(mockResponse.data);
    });

    it('should handle errors from MCP service', async () => {
      // Arrange
      req.body = {
        query: 'test query'
      };

      const error = new Error('MCP service error');
      axiosStub.rejects(error);

      // Act
      await mcpController.getContext(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.equal(error);
    });
  });

  describe('ingestDocuments', () => {
    it('should return error if documents array is not provided', async () => {
      // Arrange
      req.body = {};

      // Act
      await mcpController.ingestDocuments(req, res, next);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Valid documents array is required');
    });

    it('should ingest documents with valid input', async () => {
      // Arrange
      req.body = {
        documents: [
          { text: 'Document 1', documentId: 'doc1', metadata: { note_type: 'progress_note' } },
          { text: 'Document 2', document_id: 'doc2', metadata: { note_type: 'discharge_summary' } }
        ]
      };

      const mockResponse = {
        data: {
          success: true,
          message: 'Processing 2 documents in the background',
          data: { document_count: 2 }
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await mcpController.ingestDocuments(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.mcpServiceUrl}/documents`);
      
      // Check that the documents were formatted correctly
      const formattedDocs = axiosStub.firstCall.args[1].documents;
      expect(formattedDocs).to.have.length(2);
      expect(formattedDocs[0]).to.have.property('text', 'Document 1');
      expect(formattedDocs[0]).to.have.property('document_id', 'doc1');
      expect(formattedDocs[1]).to.have.property('document_id', 'doc2');
      
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.deep.equal(mockResponse.data);
    });

    it('should handle errors during document ingestion', async () => {
      // Arrange
      req.body = {
        documents: [{ text: 'Document 1', documentId: 'doc1' }]
      };

      const error = new Error('Ingestion error');
      axiosStub.rejects(error);

      // Act
      await mcpController.ingestDocuments(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.equal(error);
    });
  });

  describe('deleteDocument', () => {
    beforeEach(() => {
      // Replace axios.post stub with axios.delete stub for this test
      axiosStub.restore();
      axiosStub = sinon.stub(axios, 'delete');
    });

    it('should delete document via MCP', async () => {
      // Arrange
      req.params.id = 'test-doc-id';

      const mockResponse = {
        data: {
          success: true,
          message: 'Document deleted successfully',
          data: { document_id: 'test-doc-id' }
        }
      };

      axiosStub.resolves(mockResponse);

      // Act
      await mcpController.deleteDocument(req, res, next);

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
      await mcpController.deleteDocument(req, res, next);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.equal(error);
    });
  });
});