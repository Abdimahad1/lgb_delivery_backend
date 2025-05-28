const axios = require('axios');

const { retryPayment } = require('./services/paymentService');

const Payment = require('../models/Payment'); // ⬅ import at top

exports.processPayment = async (req, res) => {
  try {
    const { accountNo, amount, invoiceId, description } = req.body;

    if (!accountNo || !amount || !invoiceId || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const result = await retryPayment({
      phone: accountNo,
      amount: parsedAmount,
      invoiceId,
      description
    });

    const isSuccess = result.responseCode === '0' || result.statusCode === 2001;

    // ✅ Save to DB
    await Payment.create({
      accountNo,
      amount: parsedAmount,
      invoiceId,
      referenceId: result?.transactionInfo?.referenceId || `ref-${Date.now()}`,
      description,
      status: isSuccess ? "success" : "failed",
      waafiResponse: result
    });

    if (isSuccess) {
      return res.status(200).json({ success: true, data: result });
    } else {
      return res.status(400).json({
        success: false,
        message: result.responseMessage || 'Payment failed',
        data: result
      });
    }

  } catch (err) {
    console.error("❌ Payment error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: err.response?.data || err.message
    });
  }
};



