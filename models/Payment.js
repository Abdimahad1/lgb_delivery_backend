const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  vendorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true 
  },
  accountNo: { 
    type: String, 
    required: true,
    index: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0.01 
  },
  invoiceId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  referenceId: { 
    type: String, 
    required: true,
    index: true 
  },
  description: { 
    type: String,
    required: true 
  },
  productTitle: { 
    type: String,
    required: true 
  },
  productImage: { 
    type: String 
  },
  productPrice: { 
    type: Number,
    required: true 
  },
  userLocation: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ["success", "failed", "pending"],
    default: "pending",
    index: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  waafiResponse: { 
    type: mongoose.Schema.Types.Mixed 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for faster queries
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ vendorId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

// Add pre-save hook to validate data
PaymentSchema.pre('save', function(next) {
  if (!this.referenceId) {
    this.referenceId = `ref-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model("Payment", PaymentSchema);