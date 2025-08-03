const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ✅ Import Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ✅ Initialize App
const app = express();

// ✅ CORS Configuration
const allowedOrigins = [
  'https://lpg-delivery-admin-dashboard.onrender.com', // Your Render dashboard
  /^http:\/\/localhost:\d+$/,                          // Any localhost port (Flutter, Remix dev, etc.)
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow Postman, mobile, etc.

    // Check if origin is explicitly allowed or matches localhost port pattern
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.some(o => o instanceof RegExp && o.test(origin))
    ) {
      return callback(null, true);
    }

    console.warn(`❌ CORS blocked: ${origin}`);
    return callback(new Error('CORS policy does not allow this origin'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'cache-control'],
  credentials: true,
};
app.use(cors(corsOptions));

// ✅ Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Connect to MongoDB and Start Server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB connected");

  app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://0.0.0.0:${process.env.PORT || 5000}`);
  });
})
.catch(err => console.error("❌ DB connection error:", err));
