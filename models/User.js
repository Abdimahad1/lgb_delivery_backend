const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['Customer', 'Vendor', 'DeliveryPerson', 'Admin'], 
    required: true
  },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // ✅ NEW
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },

  // ✅ OTP + Reset
  otp: { type: String, default: null },
  otpExpire: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpire: { type: Date, default: null }

}, { timestamps: true });


module.exports = mongoose.model('User', userSchema);
