const config = require('../config');

/**
 * Simple API key authentication middleware
 */
module.exports = (req, res, next) => {
  // Skip auth in development mode if configured
  if (process.env.NODE_ENV === 'development' && config.skipAuthInDev) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({
      error: 'Unauthorized - Invalid API key'
    });
  }
  
  next();
};