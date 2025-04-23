module.exports = {
    // Service URLs
    embeddingServiceUrl: process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000',
    vectorStoreServiceUrl: process.env.VECTOR_STORE_URL || 'http://localhost:8001',
    mcpServiceUrl: process.env.MCP_SERVICE_URL || 'http://localhost:8002',
    
    // API keys
    apiKey: process.env.API_KEY || 'default-api-key',
    serviceApiKey: process.env.SERVICE_API_KEY || 'internal-service-key',
    
    // Development options
    skipAuthInDev: process.env.SKIP_AUTH_IN_DEV === 'true'
  };