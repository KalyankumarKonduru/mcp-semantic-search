// controllers/search.controller.js

const axios = require('axios');
const config = require('../config');

/**
 * Perform semantic search
 */
exports.semanticSearch = async (req, res, next) => {
  try {
    const { query, limit = 5, filters } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // 1) Get embedding (no API key header)
    const embedRes = await axios.post(
      `${config.embeddingServiceUrl}/embed/text`,
      { text: query },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!embedRes.data?.success) {
      return res.status(500).json({ error: 'Failed to generate embedding' });
    }

    // 2) Call vector‐store with x-api-key header
    const vsHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': config.serviceApiKey
    };
    const searchRes = await axios.post(
      `${config.vectorStoreServiceUrl}/vectors/search`,
      { embedding: embedRes.data.embedding, k: limit, filters },
      { headers: vsHeaders }
    );

    // 3) Format and return
    const results = (searchRes.data.results || []).map(r => ({
      text: r.text,
      score: r.score,
      metadata: r.metadata,
      highlight: highlightQuery(r.text, query)
    }));
    res.json({
      query,
      results,
      totalResults: searchRes.data.total_matches || results.length,
      executionTimeMs: searchRes.data.query_time_ms || 0
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Perform hybrid search (semantic + keyword)
 */
exports.hybridSearch = async (req, res, next) => {
  try {
    const { query, keywords, limit = 5, filters } = req.body;
    if (!query && !keywords) {
      return res.status(400).json({ error: 'Either query or keywords required' });
    }

    const vsHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': config.serviceApiKey
    };

    // semantic part
    let semanticResults = [];
    if (query) {
      const embedRes = await axios.post(
        `${config.embeddingServiceUrl}/embed/text`,
        { text: query },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (embedRes.data?.success) {
        const semRes = await axios.post(
          `${config.vectorStoreServiceUrl}/vectors/search`,
          { embedding: embedRes.data.embedding, k: limit * 2, filters },
          { headers: vsHeaders }
        );
        semanticResults = semRes.data.results || [];
      }
    }

    // keyword part
    let keywordResults = [];
    if (keywords) {
      const kwRes = await axios.post(
        `${config.vectorStoreServiceUrl}/vectors/keyword-search`,
        { keywords, limit: limit * 2, filters },
        { headers: vsHeaders }
      );
      keywordResults = kwRes.data.results || [];
    }

    // combine & rerank
    const combined = hybridReranking(semanticResults, keywordResults, limit);
    const results = combined.map(r => ({
      text: r.text,
      score: r.score,
      metadata: r.metadata,
      highlight: highlightQuery(r.text, query || keywords)
    }));

    res.json({ query, keywords, results, totalResults: results.length });

  } catch (err) {
    next(err);
  }
};

// -- helpers unchanged below --

function highlightQuery(text, query) {
  if (!query || !text) return text;
  const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function hybridReranking(sem, kw, limit) {
  const map = new Map();
  sem.forEach(r => {
    const id = r.chunk_id || r.metadata.doc_id;
    map.set(id, { ...r, semanticScore: r.score, keywordScore: 0, score: r.score * 0.7 });
  });
  kw.forEach(r => {
    const id = r.chunk_id || r.metadata.doc_id;
    if (map.has(id)) {
      const e = map.get(id);
      e.keywordScore = r.score;
      e.score = e.semanticScore * 0.7 + r.score * 0.3;
    } else {
      map.set(id, { ...r, semanticScore: 0, keywordScore: r.score, score: r.score * 0.3 });
    }
  });
  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
