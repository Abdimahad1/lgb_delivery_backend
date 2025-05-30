const Payment = require('../models/Payment');
const { retryPayment } = require('./services/paymentService');

// 🟢 Process a payment
exports.processPayment = async (req, res) => {
  try {
    const {
      accountNo,
      amount,
      invoiceId,
      description,
      productId,
      vendorId,
      productTitle,
      productImage,
      productPrice,
      userLocation,
    } = req.body;

    const userId = req.userId;

    if (!accountNo || !amount || !invoiceId || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    console.log('🔁 Attempting payment processing...');
    const result = await retryPayment({
      phone: accountNo,
      amount: parsedAmount,
      invoiceId,
      description,
    });

    console.log('📨 WaafiPay response:', JSON.stringify(result, null, 2));

    const code = String(result?.responseCode || '');
    const statusCode = String(result?.statusCode || '');
    const transactionStatus = result?.transactionInfo?.status?.toUpperCase() || '';
    const responseMsg = String(result?.responseMsg || result?.responseMessage || '').toUpperCase();

    const isSuccess =
      code === '0' ||
      statusCode === '2001' ||
      transactionStatus === 'SUCCESS' ||
      responseMsg === 'RCS_SUCCESS';

    console.log('✅ Determined success:', isSuccess);

    const paymentData = {
      userId,
      vendorId,
      accountNo,
      amount: parsedAmount,
      invoiceId,
      referenceId: result?.transactionInfo?.referenceId || `ref-${Date.now()}`,
      description,
      productId,
      productTitle,
      productImage,
      productPrice,
      userLocation,
      status: isSuccess ? 'success' : 'failed',
      waafiResponse: result,
      timestamp: new Date(), // ✅ Required for sorting and display
    };

    const payment = await Payment.create(paymentData);
    console.log('📦 Payment saved with status:', payment.status);

    return res.status(isSuccess ? 200 : 400).json({
      success: isSuccess,
      message: isSuccess
        ? 'Payment successful'
        : result.responseMsg || result.responseMessage || 'Payment failed',
      data: payment,
    });
  } catch (err) {
    console.error('❌ Payment error:', err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: err.response?.data || err.message,
    });
  }
};

// 🟢 Get vendor-specific successful payments
exports.getVendorPayments = async (req, res) => {
  try {
    const vendorId = req.userId; // Auth middleware sets this
    const transactions = await Payment.find({
      vendorId,
      status: 'success',
    }).sort({ timestamp: -1 });

    return res.json({
      success: true,
      transactions,
    });
  } catch (err) {
    console.error('❌ Vendor payments fetch error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor payments',
      error: err.message,
    });
  }
};

// 🟢 Get all payment history (if needed for admin or user)
exports.getAllPaymentHistory = async (req, res) => {
  try {
    const transactions = await Payment.find().sort({ timestamp: -1 });
    return res.json({
      success: true,
      transactions,
    });
  } catch (err) {
    console.error('❌ Payment history fetch error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: err.message,
    });
  }
};
