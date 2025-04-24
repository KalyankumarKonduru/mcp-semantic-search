const config = require('../config');

module.exports = (req, res, next) => {
  // In dev you may skip auth
  if (process.env.NODE_ENV === 'development' && config.skipAuthInDev) {
    return next();
  }

  // Grab either header
  const apiKeyHeader = req.headers['x-api-key'];
  const authHeader    = req.headers['authorization'];
  const token = apiKeyHeader
    || (authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null);

  if (!token || token !== config.apiKey) {
    return res.status(401).json({ error: 'Unauthorized – Invalid API key' });
  }
  next();
};
