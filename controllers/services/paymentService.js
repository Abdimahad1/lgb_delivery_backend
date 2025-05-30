const axios = require('axios');

const formatPhone = (phone) => {
  if (!phone.startsWith("252")) {
    return `252${phone.replace(/^0+/, "")}`;
  }
  return phone;
};

const buildPayload = ({ phone, amount, invoiceId, description }) => {
  const formattedAmount = parseFloat(amount).toFixed(2);
  return {
    schemaVersion: "1.0",
    requestId: Date.now().toString(),
    timestamp: new Date().toISOString(),
    channelName: "WEB",
    serviceName: "API_PURCHASE",
    serviceParams: {
      merchantUid: process.env.MERCHANT_UID,
      apiUserId: process.env.API_USER_ID,
      apiKey: process.env.API_KEY,
      paymentMethod: "MWALLET_ACCOUNT",
      payerInfo: {
        accountNo: formatPhone(phone),
      },
      transactionInfo: {
        referenceId: `ref-${Date.now()}`,
        invoiceId,
        amount: parseFloat(formattedAmount),
        currency: "USD",
        description,
      },
    },
  };
};

const payByWaafiPay = async (paymentData) => {
  const payload = buildPayload(paymentData);
  console.log("🔄 Sending payment payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      process.env.PAYMENT_API_URL,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000, // 15 seconds timeout
      }
    );

    console.log("✅ Payment API response:", JSON.stringify(response.data, null, 2));
    return response.data;

  } catch (error) {
    console.error("❌ Payment API error:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    throw error;
  }
};

const retryPayment = async (paymentData, retries = 3, delay = 1000) => {
  try {
    return await payByWaafiPay(paymentData);
  } catch (error) {
    const statusCode = error.response?.status;

    // Don't retry on client errors (4xx)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      console.warn(`⛔ No retry for client error (${statusCode})`);
      throw error;
    }

    if (retries <= 0) {
      console.warn("❌ No retries left. Failing payment.");
      throw error;
    }

    const nextDelay = delay * 2;
    console.warn(`⚠️ Retrying payment (${retries} attempts left) in ${nextDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, nextDelay));

    return retryPayment(paymentData, retries - 1, nextDelay);
  }
};

module.exports = {
  payByWaafiPay,
  retryPayment,
};