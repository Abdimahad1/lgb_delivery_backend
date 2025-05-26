const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;

    // Validate input
    if (!name || !phone || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Email already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user
    const newUser = new User({ 
      name, 
      phone, 
      email, 
      password: hashedPassword, 
      role 
    });
    
    await newUser.save();

    // Generate token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.status(201).json({ 
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error during registration", 
      error: err.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and role are required"
      });
    }

    console.log("Login attempt for:", { email, role });

    // Find user by email and role
    const user = await User.findOne({ email, role });
    if (!user) {
      console.error("Login failed: User not found or incorrect role");
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("Login failed: Password mismatch");
      return res.status(400).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    console.error("❌ Server error during login:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error during login", 
      error: err.message 
    });
  }
};

exports.syncData = async (req, res) => {
  try {
    const { pendingSignups, pendingLogins } = req.body;
    const results = {
      signups: [],
      logins: []
    };

    // Process pending signups
    if (pendingSignups && pendingSignups.length > 0) {
      for (const signup of pendingSignups) {
        try {
          const { name, phone, email, password, role } = signup;
          
          // Check if user already exists
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            results.signups.push({
              email,
              status: 'skipped',
              message: 'User already exists'
            });
            continue;
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(password, 10);
          
          // Create new user
          const newUser = new User({ 
            name, 
            phone, 
            email, 
            password: hashedPassword, 
            role 
          });
          await newUser.save();

          results.signups.push({
            email,
            status: 'success',
            userId: newUser._id
          });
        } catch (err) {
          results.signups.push({
            email: signup.email,
            status: 'failed',
            error: err.message
          });
        }
      }
    }

    // Process pending logins (mostly for tracking purposes)
    if (pendingLogins && pendingLogins.length > 0) {
      for (const login of pendingLogins) {
        try {
          const { email, role } = login;
          const user = await User.findOne({ email, role });
          
          if (user) {
            results.logins.push({
              email,
              status: 'success',
              userId: user._id
            });
          } else {
            results.logins.push({
              email,
              status: 'failed',
              message: 'User not found'
            });
          }
        } catch (err) {
          results.logins.push({
            email: login.email,
            status: 'failed',
            error: err.message
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Data sync completed",
      results
    });
  } catch (err) {
    console.error("❌ Sync Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during sync", 
      error: err.message 
    });
  }
};