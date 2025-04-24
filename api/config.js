// config.js
module.exports = {
  // Container‐network hostnames (match your docker-compose service names)
  embeddingServiceUrl:     process.env.EMBEDDING_SERVICE_URL     || 'http://embedding:8000',
  vectorStoreServiceUrl:   process.env.VECTOR_STORE_SERVICE_URL || 'http://vector-store:8001',
  mcpServiceUrl:           process.env.MCP_SERVICE_URL         || 'http://mcp-provider:8002',

  // API keys
  apiKey:        process.env.API_KEY,         // for front-end → Express
  serviceApiKey: process.env.SERVICE_API_KEY, // for Express → FastAPI

  // Skip auth in development
  skipAuthInDev: process.env.SKIP_AUTH_IN_DEV === 'true'
};
