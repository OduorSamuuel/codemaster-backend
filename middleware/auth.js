const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Extract the token (assuming "Bearer TOKEN" format)
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user information to the request
    req.user = decoded;
    next();
  } catch (error) {
    // Handle invalid or expired token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;