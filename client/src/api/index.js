import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000
});

// Add API key to all requests if available
api.interceptors.request.use(config => {
  // first try localStorage (user-saved), otherwise use env var
  const apiKey = localStorage.getItem('apiKey') 
                  || process.env.REACT_APP_API_KEY;
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});



// Document management API
export const documentApi = {
  // List documents with pagination
  listDocuments: (page = 1, limit = 20, filter = '') => 
    api.get('/documents', { params: { page, limit, filter } }),
  
  // Get a single document
  getDocument: (id) => 
    api.get(`/documents/${id}`),
  
  // Create a new document
  createDocument: (text, metadata) => 
    api.post('/documents', { text, metadata }),
  
  // Upload a document file
  uploadDocument: async (file, metadata) => {
    const text = await file.text();
    return api.post('/documents', { 
      text, 
      metadata: { 
        ...metadata, 
        filename: file.name,
        fileType: file.type,
        fileSize: file.size
      } 
    });
  },
  
  // Delete a document
  deleteDocument: (id) => 
    api.delete(`/documents/${id}`)
};

// Search API
export const searchApi = {
  // Semantic search
  semanticSearch: (query, limit = 5, filters = null) => 
    api.post('/search', { query, limit, filters }),
  
  // Hybrid search (semantic + keyword)
  hybridSearch: (query, keywords, limit = 5, filters = null) => 
    api.post('/search/hybrid', { query, keywords, limit, filters })
};

// MCP API
export const mcpApi = {
  // Get context for a query
  getContext: (query, limit = 5, metadata_filters = null) => 
    api.post('/mcp/context', { query, limit, metadata_filters })
};