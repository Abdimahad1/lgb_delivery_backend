const express = require('express');
const Payment = require('../models/Payment');
const router = express.Router();
const { processPayment } = require('../controllers/paymentController');

router.post('/pay', processPayment);
router.get('/history', async (req, res) => {
    try {
      const history = await Payment.find().sort({ timestamp: -1 });
      res.json({ success: true, transactions: history });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch history" });
    }
  });

module.exports = router;
