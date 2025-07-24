// middlewares/adminOnly.js
const adminOnly = (req, res, next) => {
    if (req.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admins only'
      });
    }
    next();
  };
  
  module.exports = adminOnly;
  