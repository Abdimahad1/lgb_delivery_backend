const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },

  // 🆕 Optional but useful for context
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssignedTask',
  },
  type: {
    type: String,
    enum: ['StatusUpdate', 'Reminder', 'Alert', 'General'],
    default: 'General',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
