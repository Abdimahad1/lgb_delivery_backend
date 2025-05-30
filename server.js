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

// ✅ Initialize App
const app = express();

// ✅ CORS Configuration (accept requests from any origin)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH']
}));

// ✅ Middleware
app.use(express.json());

// ✅ Serve uploaded images as static files (profile, product, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes); // ⬅️ Now it matches Flutter call
app.use('/api/tasks', require('./routes/taskRoutes'));


// ✅ Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.error("❌ DB connection error:", err));
