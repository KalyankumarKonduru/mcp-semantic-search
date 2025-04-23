const axios = require('axios');
const config = require('../config');

/**
 * Perform semantic search
 */
exports.semanticSearch = async (req, res, next) => {
  try {
    const { query, limit = 5, filters } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }
    
    // Get embedding for query
    const embedResponse = await axios.post(`${config.embeddingServiceUrl}/embed/text`, {
      text: query
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    if (!embedResponse.data || !embedResponse.data.success) {
      return res.status(500).json({
        error: 'Failed to generate embedding for query'
      });
    }
    
    // Search with embedding
    const searchResponse = await axios.post(`${config.vectorStoreServiceUrl}/vectors/search`, {
      embedding: embedResponse.data.embedding,
      k: limit,
      filters
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.serviceApiKey}`
      }
    });
    
    // Format results
    const results = searchResponse.data.results.map(result => ({
      text: result.text,
      score: result.score,
      metadata: result.metadata,
      highlight: highlightQuery(result.text, query)
    }));
    
    res.json({
      query,
      results,
      totalResults: searchResponse.data.total_matches || results.length,
      executionTimeMs: searchResponse.data.query_time_ms || 0
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Perform hybrid search (semantic + keyword)
 */
exports.hybridSearch = async (req, res, next) => {
  try {
    const { query, keywords, limit = 5, filters } = req.body;
    
    if (!query && !keywords) {
      return res.status(400).json({
        error: 'Either search query or keywords are required'
      });
    }
    
    // Get embedding for semantic query
    let semanticResults = [];
    if (query) {
      const embedResponse = await axios.post(`${config.embeddingServiceUrl}/embed/text`, {
        text: query
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.serviceApiKey}`
        }
      });
      
      if (embedResponse.data && embedResponse.data.success) {
        // Search with embedding
        const searchResponse = await axios.post(`${config.vectorStoreServiceUrl}/vectors/search`, {
          embedding: embedResponse.data.embedding,
          k: limit * 2, // Get more results for hybrid reranking
          filters
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.serviceApiKey}`
          }
        });
        
        semanticResults = searchResponse.data.results || [];
      }
    }
    
    // Get keyword results if provided
    let keywordResults = [];
    if (keywords) {
      const keywordResponse = await axios.post(`${config.vectorStoreServiceUrl}/vectors/keyword-search`, {
        keywords,
        limit: limit * 2, // Get more results for hybrid reranking
        filters
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.serviceApiKey}`
        }
      });
      
      keywordResults = keywordResponse.data.results || [];
    }
    
    // Combine results (simple approach - could be more sophisticated)
    const combinedResults = hybridReranking(semanticResults, keywordResults, limit);
    
    // Format results
    const results = combinedResults.map(result => ({
      text: result.text,
      score: result.score,
      metadata: result.metadata,
      highlight: highlightQuery(result.text, query || keywords)
    }));
    
    res.json({
      query,
      keywords,
      results,
      totalResults: results.length
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Simple text highlighter for search results
 */
function highlightQuery(text, query) {
  // This is a simple implementation - could be more sophisticated
  if (!query || !text) return text;
  
  // Split query into words
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  // Create regex with word boundaries for each word
  const regex = new RegExp(`\\b(${queryWords.join('|')})\\b`, 'gi');
  
  // Replace matches with highlighted version
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Combine and rerank semantic and keyword results
 */
function hybridReranking(semanticResults, keywordResults, limit) {
  // Create a map for quick lookup
  const resultMap = new Map();
  
  // Process semantic results
  semanticResults.forEach(result => {
    const id = result.chunk_id || result.metadata.doc_id;
    resultMap.set(id, {
      ...result,
      semanticScore: result.score,
      keywordScore: 0,
      score: result.score * 0.7 // Weight semantic results at 70%
    });
  });
  
  // Process keyword results
  keywordResults.forEach(result => {
    const id = result.chunk_id || result.metadata.doc_id;
    if (resultMap.has(id)) {
      // Result exists in semantic results - update scores
      const existing = resultMap.get(id);
      existing.keywordScore = result.score;
      existing.score = existing.semanticScore * 0.7 + result.score * 0.3; // Combined score
    } else {
      // New result from keyword search
      resultMap.set(id, {
        ...result,
        semanticScore: 0,
        keywordScore: result.score,
        score: result.score * 0.3 // Weight keyword-only results at 30%
      });
    }
  });
  
  // Sort and limit results
  return Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}