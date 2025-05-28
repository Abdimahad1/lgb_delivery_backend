const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  accountNo: { type: String, required: true },
  amount: { type: Number, required: true },
  invoiceId: { type: String, required: true, unique: true },
  referenceId: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: "success" }, // or 'failed', 'pending'
  timestamp: { type: Date, default: Date.now },
  waafiResponse: { type: Object }, // optional: store full API response
});

module.exports = mongoose.model("Payment", PaymentSchema);
