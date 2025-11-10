// API Key authentication middleware
const log = {
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
};

function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // Check if API key is required
  if (!process.env.API_KEY) {
    log.warn('API_KEY not set - running without authentication!');
    return next();
  }

  // Validate API key
  if (!apiKey) {
    log.error('Request without API key');
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Please provide API key in X-API-Key header'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    log.error(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
}

module.exports = { validateApiKey };
