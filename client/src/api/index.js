import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000
});

api.interceptors.request.use(config => {
  const key = localStorage.getItem('apiKey') || process.env.REACT_APP_API_KEY;
  if (key) config.headers['x-api-key'] = key;
  return config;
});

export const documentApi = {
  listDocuments:   (page, limit, filter) => api.get('/documents', { params:{page,limit,filter} }),
  getDocument:     id => api.get(`/documents/${id}`),
  createDocument:  (text, metadata) => api.post('/documents', { text, metadata }),
  uploadFile:      form => api.post('/documents/upload', form),   // multipart
  deleteDocument:  id => api.delete(`/documents/${id}`)
};

export const searchApi = {
  semanticSearch: (query, limit, filters) => api.post('/search', { query, limit, filters }),
  hybridSearch:   (q, keywords, limit, filters) => api.post('/search/hybrid', { query:q, keywords, limit, filters })
};

export const mcpApi = {
  getContext: (query, limit, metadata_filters) => api.post('/mcp/context', { query, limit, metadata_filters })
};