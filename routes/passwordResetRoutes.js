// routes/passwordResetRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  resetPassword
} = require('../controllers/passwordResetController');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;