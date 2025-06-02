const axios = require('axios');

/**
 * Format the user's phone number to start with '252'
 */
const formatPhone = (phone) => {
  if (!phone.startsWith("252")) {
    return `252${phone.replace(/^0+/, "")}`;
  }
  return phone;
};

/**
 * Build the payload required by WaafiPay API
 */
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

/**
 * Make a one-time payment request to WaafiPay
 * No retries — response is final
 */
const payByWaafiPay = async (paymentData) => {
  const payload = buildPayload(paymentData);

  console.log("🔄 Sending payment payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      process.env.PAYMENT_API_URL,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000, // ⏱️ 60 seconds only
      }
    );

    console.log("✅ Payment API response:", JSON.stringify(response.data, null, 2));
    return response.data;

  } catch (error) {
    console.error("❌ Payment API error:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  payByWaafiPay,
};
