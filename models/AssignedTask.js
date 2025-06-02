const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
  deliveryPersonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment', 
    required: true 
  },
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // ✅ Newly added (optional for now)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // ⬅️ Fallback safe
  },

  product: { type: String },
  customer: { type: String },
  address: { type: String },

  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Delivered'],
    default: 'Pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
