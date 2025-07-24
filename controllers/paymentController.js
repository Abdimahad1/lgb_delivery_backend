const Payment = require('../models/Payment');
const AssignedTask = require('../models/AssignedTask'); // ✅ Make sure this is imported
const { payByWaafiPay } = require('./services/paymentService');

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
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const duplicate = await Payment.findOne({ userId, invoiceId }).lean();
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate invoice payment already exists',
        data: duplicate,
      });
    }

    console.log('🔁 Processing payment...');
    const result = await payByWaafiPay({
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

    const isPaymentSuccessful =
      code === '0' ||
      statusCode === '2001' ||
      transactionStatus === 'SUCCESS' ||
      responseMsg === 'RCS_SUCCESS';

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
      status: isPaymentSuccessful ? 'success' : 'failed',
      waafiResponse: result,
      timestamp: new Date(),
    };

    const payment = await Payment.create(paymentData);

    return res.status(isPaymentSuccessful ? 200 : 400).json({
      success: isPaymentSuccessful,
      message: isPaymentSuccessful
        ? 'Payment successful'
        : result.responseMsg || result.responseMessage || 'Payment failed',
      data: payment,
    });
  } catch (err) {
    console.error('❌ Payment processing error:', err.response?.data || err.message);
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
    const vendorId = req.userId;
    const transactions = await Payment.find({
      vendorId,
      status: 'success',
    }).sort({ timestamp: -1 }).lean();

    return res.json({ success: true, transactions });
  } catch (err) {
    console.error('❌ Vendor payment fetch error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor payments',
      error: err.message,
    });
  }
};

// 🟢 Get all payments (admin or user)
exports.getAllPaymentHistory = async (req, res) => {
  try {
    const transactions = await Payment.find().sort({ timestamp: -1 }).lean();
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error('❌ Payment history error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: err.message,
    });
  }
};

// 🆕 Get vendor orders enriched with delivery task status
exports.getVendorOrdersWithDeliveryStatus = async (req, res) => {
  try {
    const vendorId = req.userId;

    // 🧠 Parallelize fetching
    const [transactions, tasks] = await Promise.all([
      Payment.find({ vendorId }).sort({ createdAt: -1 }).lean(),
      AssignedTask.find().lean(),
    ]);

    const orderIds = transactions.map(tx => tx._id.toString());
    const taskMap = {};

    tasks.forEach(task => {
      const id = task.orderId?.toString();
      if (id && orderIds.includes(id)) {
        taskMap[id] = task.status;
      }
    });

    const enriched = transactions
      .filter(tx => {
        const status = taskMap[tx._id.toString()];
        return status !== 'Rejected'; // ⛔ Filter out
      })
      .map(tx => ({
        ...tx,
        deliveryStatus: taskMap[tx._id.toString()] || 'Pending',
      }));

    return res.status(200).json({ success: true, transactions: enriched });
  } catch (err) {
    console.error("❌ Error fetching vendor orders with delivery status:", err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor orders with delivery info',
    });
  }
};

// 🟢 Admin: Get all payments (read-only)
exports.getAllPaymentsForAdmin = async (req, res) => {
  try {
    const transactions = await Payment.find()
      .populate("userId", "name email") // show user name/email
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, transactions });
  } catch (err) {
    console.error("❌ Admin fetch error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all payments",
    });
  }
};
