const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');



// Initialize App
const app = express();

// ✅ CORS Configuration (accepts requests from any origin)
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH'], // Added PUT & PATCH for updates
};
app.use(cors(corsOptions));

// ✅ Middleware
app.use(express.json());

// ✅ Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);


// ✅ Database Connection & Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // ✅ Listen on all network interfaces
    app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${process.env.PORT}`);
    });

  })
  .catch(err => console.error("❌ DB connection error:", err));
