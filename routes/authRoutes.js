const express = require('express');
const { register, login, syncData } = require('../controllers/authController');
const router = express.Router();

// Log request data middleware
const logRequest = (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log("Body:", req.body);
  next();
};

router.post('/login', logRequest, login);
router.post('/signup', logRequest, register);
router.post('/sync', logRequest, syncData);

module.exports = router;