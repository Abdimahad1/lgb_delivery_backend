const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');
const { processPayment } = require('../controllers/paymentController');
const Payment = require('../models/Payment');

// ✅ POST: Process a new payment
router.post('/pay', authMiddleware, processPayment);

// ✅ GET: Payment history for current user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await Payment.find({ userId: req.userId }).sort({ timestamp: -1 });
    res.json({ success: true, transactions: history });
  } catch (err) {
    console.error("❌ Error fetching user history:", err);
    res.status(500).json({ success: false, message: "Failed to fetch payment history" });
  }
});

// ✅ GET: Vendor-specific successful orders
router.get('/vendor-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Payment.find({
      vendorId: req.userId,
      status: 'success',
    }).sort({ timestamp: -1 });

    res.json({ success: true, transactions: orders }); // 🔄 Rename `orders` → `transactions` to match frontend
  } catch (err) {
    console.error("❌ Vendor orders fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch vendor orders" });
  }
});

module.exports = router;
