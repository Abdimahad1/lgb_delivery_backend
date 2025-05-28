const axios = require('axios');

// ✅ Format phone number for WaafiPay (adds 252, strips leading 0s)
const formatPhone = (phone) => {
  if (!phone.startsWith("252")) {
    return `252${phone.replace(/^0+/, "")}`;
  }
  return phone;
};

// ✅ Build the WaafiPay API payload
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
        accountNo: phone,
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

// ✅ Primary method to send payment request
const payByWaafiPay = async (paymentData) => {
  const formattedPhone = formatPhone(paymentData.phone);
  const payload = buildPayload({
    phone: formattedPhone,
    amount: paymentData.amount,
    invoiceId: paymentData.invoiceId,
    description: paymentData.description,
  });

  console.log("🔄 Sending WaafiPay payload:", JSON.stringify(payload, null, 2));

  const response = await axios.post(
    process.env.PAYMENT_API_URL,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return response.data;
};

// ✅ Retry wrapper with exponential backoff
const retryPayment = async (paymentData, retries = 2, delay = 1000) => {
  try {
    return await payByWaafiPay(paymentData);
  } catch (error) {
    if (retries <= 0) throw error;

    console.warn(`⚠️ Retrying payment... Attempts left: ${retries}`);
    await new Promise((res) => setTimeout(res, delay));

    return retryPayment(paymentData, retries - 1, delay * 2);
  }
};

module.exports = { payByWaafiPay, retryPayment };
