const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const searchController = require('../controllers/search.controller');
const config = require('../config');

describe('Search Controller', () => {
  let req, res, next, axiosStub;

  beforeEach(() => {
    // Mock request object
    req = {
      body: {
        query: 'test query',
        limit: 5,
        filters: null
      }
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

  describe('semanticSearch', () => {
    it('should return error if query is not provided', async () => {
      // Arrange
      const embedResponse = {
        data: {
          success: true,
          embedding: [0.1, 0.2, 0.3]
        }
      };
      
      const searchResponse = {
        data: {
          results: [
            {
              text: 'Result text 1',
              score: 0.95,
              metadata: { doc_id: 'doc1', note_type: 'progress_note' }
            },
            {
              text: 'Result text 2',
              score: 0.85,
              metadata: { doc_id: 'doc2', note_type: 'discharge_summary' }
            }
          ],
          total_matches: 2,
          query_time_ms: 15
        }
      };
      
      // First call returns embedding, second call returns search results
      axiosStub.onFirstCall().resolves(embedResponse);
      axiosStub.onSecondCall().resolves(searchResponse);
      
      // Act
      await searchController.semanticSearch(req, res, next);
      
      // Assert
      expect(axiosStub.calledTwice).to.be.true;
      
      // First call should be to embedding service
      expect(axiosStub.firstCall.args[0]).to.include(`${config.embeddingServiceUrl}/embed/text`);
      
      // Second call should be to vector store
      expect(axiosStub.secondCall.args[0]).to.include(`${config.vectorStoreServiceUrl}/vectors/search`);
      
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.args[0][0];
      expect(response).to.have.property('query', 'test query');
      expect(response).to.have.property('results').with.lengthOf(2);
      expect(response).to.have.property('totalResults', 2);
      expect(response).to.have.property('executionTimeMs', 15);
    });
  });
  
  describe('hybridSearch', () => {
    it('should return error if both query and keywords are empty', async () => {
      // Arrange
      req.body.query = '';
      req.body.keywords = '';
      
      // Act
      await searchController.hybridSearch(req, res, next);
      
      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Either search query or keywords are required');
    });
    
    it('should perform semantic search if only query is provided', async () => {
      // Arrange
      req.body.query = 'semantic query';
      req.body.keywords = null;
      
      const embedResponse = {
        data: {
          success: true,
          embedding: [0.1, 0.2, 0.3]
        }
      };
      
      const searchResponse = {
        data: {
          results: [
            {
              text: 'Semantic result',
              score: 0.95,
              metadata: { doc_id: 'doc1' }
            }
          ]
        }
      };
      
      axiosStub.onFirstCall().resolves(embedResponse);
      axiosStub.onSecondCall().resolves(searchResponse);
      
      // Act
      await searchController.hybridSearch(req, res, next);
      
      // Assert
      expect(axiosStub.calledTwice).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.args[0][0];
      expect(response).to.have.property('query', 'semantic query');
      expect(response).to.have.property('results').with.lengthOf(1);
      expect(response.results[0]).to.have.property('text', 'Semantic result');
    });
    
    it('should perform keyword search if only keywords are provided', async () => {
      // Arrange
      req.body.query = null;
      req.body.keywords = 'keyword query';
      
      const keywordResponse = {
        data: {
          results: [
            {
              text: 'Keyword result',
              score: 0.8,
              metadata: { doc_id: 'doc2' }
            }
          ]
        }
      };
      
      axiosStub.resolves(keywordResponse);
      
      // Act
      await searchController.hybridSearch(req, res, next);
      
      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(axiosStub.firstCall.args[0]).to.include(`${config.vectorStoreServiceUrl}/vectors/keyword-search`);
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.args[0][0];
      expect(response).to.have.property('keywords', 'keyword query');
      expect(response).to.have.property('results').with.lengthOf(1);
      expect(response.results[0]).to.have.property('text', 'Keyword result');
    });
    
    it('should perform hybrid search with both query and keywords', async () => {
      // Arrange
      req.body.query = 'semantic query';
      req.body.keywords = 'keyword query';
      
      const embedResponse = {
        data: {
          success: true,
          embedding: [0.1, 0.2, 0.3]
        }
      };
      
      const semanticResponse = {
        data: {
          results: [
            {
              text: 'Semantic result',
              score: 0.95,
              metadata: { doc_id: 'doc1' },
              chunk_id: 'doc1_1'
            }
          ]
        }
      };
      
      const keywordResponse = {
        data: {
          results: [
            {
              text: 'Keyword result',
              score: 0.8,
              metadata: { doc_id: 'doc2' },
              chunk_id: 'doc2_1'
            }
          ]
        }
      };
      
      axiosStub.onFirstCall().resolves(embedResponse);
      axiosStub.onSecondCall().resolves(semanticResponse);
      axiosStub.onThirdCall().resolves(keywordResponse);
      
      // Act
      await searchController.hybridSearch(req, res, next);
      
      // Assert
      expect(axiosStub.calledThrice).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const response = res.json.args[0][0];
      expect(response).to.have.property('query', 'semantic query');
      expect(response).to.have.property('keywords', 'keyword query');
      // Should combine results from both searches
      expect(response).to.have.property('results').with.lengthOf(2);
    });
  });
});
 Arrange
      req.body.query = '';

      // Act
      await searchController.semanticSearch(req, res, next);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.args[0][0]).to.have.property('error', 'Search query is required');

    it('should return error if embedding generation fails', async () => {
      // Arrange
      axiosStub.rejects(new Error('Embedding service error'));

      // Act
      await searchController.semanticSearch(req, res, next);

      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.be.an('error');
      expect(next.args[0][0].message).to.equal('Embedding service error');
    });
