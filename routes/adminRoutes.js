const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const adminOnly = require('../middlewares/adminOnlyMiddleware');

const {
  getTotalUsers,
  getTotalOrders,
  getTotalSuccessfulPayments,
  getRecentTransactions,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getReportData,
  generateReportPDF,  // ✅ New for PDF generation
  downloadReportPDF   // ✅ New for PDF download
} = require('../controllers/adminController');

// ✅ Admin Auth Check
router.get('/verify-token', auth, adminOnly, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid and admin is authenticated.',
    userId: req.userId,
    role: req.role
  });
});

// ✅ Dashboard Stats
router.get('/total-users', auth, adminOnly, getTotalUsers);
router.get('/total-orders', auth, adminOnly, getTotalOrders);
router.get('/total-successful-payments', auth, adminOnly, getTotalSuccessfulPayments);
router.get('/recent-transactions', auth, adminOnly, getRecentTransactions);

// ✅ Full User Management
router.get('/users', auth, adminOnly, getAllUsers);
router.post('/users', auth, adminOnly, createUser);
router.patch('/users/:id', auth, adminOnly, updateUser);
router.delete('/users/:id', auth, adminOnly, deleteUser);

// ✅ Analytics Report
router.get('/report', auth, adminOnly, getReportData);
router.post('/generate-report-pdf', auth, adminOnly, generateReportPDF);  // ✅ New
router.get('/download-report-pdf', auth, adminOnly, downloadReportPDF);   // ✅ New

module.exports = router;