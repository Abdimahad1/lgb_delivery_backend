const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
  deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: String,
  customer: String,
  address: String,
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
