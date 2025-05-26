const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: String,
  phone: String,
  email: String,
  address: String,
  district: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  shopName: String,
  profileImage: String,
  notifications: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
