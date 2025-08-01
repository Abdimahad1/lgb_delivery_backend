const express = require('express');
const router = express.Router();

// ✅ ADD THIS LINE
const Payment = require('../models/Payment');

const authMiddleware = require('../middlewares/authMiddleware');
const {
  processPayment,
  getVendorPayments,
  getAllPaymentHistory,
  getVendorOrdersWithDeliveryStatus,
  getAllPaymentsForAdmin, // ✅ New Controller
} = require('../controllers/paymentController');

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

    res.json({ success: true, transactions: orders });
  } catch (err) {
    console.error("❌ Vendor orders fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch vendor orders" });
  }
});

// ✅ GET: All payments where current user is the vendor
router.get('/my-payments', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ vendorId: req.userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      transactions: payments
    });
  } catch (err) {
    console.error("❌ Fetch vendor payments error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
});

// ✅ NEW: Admin - Get ALL payments for everyone
router.get('/admin-all', authMiddleware, getAllPaymentsForAdmin);

module.exports = router;
