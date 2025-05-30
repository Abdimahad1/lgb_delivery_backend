const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("🔐 Incoming Authorization Header:", authHeader);
  console.log("📦 Full Headers:", JSON.stringify(req.headers, null, 2));

  if (!authHeader) {
    console.log("⚠️ No authorization header provided");
    return res.status(401).json({
      success: false,
      message: 'Authorization header is required',
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log("⚠️ Malformed authorization header");
    return res.status(401).json({
      success: false,
      message: 'Authorization header must start with Bearer',
    });
  }
  

  const token = authHeader.split(' ')[1];
  
  if (!token || token === 'null') {
    console.log("⚠️ Token is null or undefined");
    return res.status(401).json({
      success: false,
      message: 'Token cannot be null',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;

    console.log("✅ Authenticated User ID:", req.userId);
    console.log("✅ Authenticated Role:", req.role);

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    
    let message = 'Invalid token';
    if (err.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Malformed token';
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: ${message}`,
      error: err.message,
    });
  }
};

module.exports = authMiddleware;