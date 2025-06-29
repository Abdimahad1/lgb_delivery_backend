const User = require('../models/User');
const Profile = require('../models/Profile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;

    // Validate
    if (!name || !phone || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Clean inputs
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedRole = role.trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanedEmail });
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
      email: cleanedEmail,
      password: hashedPassword,
      role: cleanedRole
    });

    await newUser.save();

    // Create new profile
    const newProfile = new Profile({
      userId: newUser._id,
      name,
      phone,
      email: cleanedEmail,
      address: '',
      notifications: {
        email: true,
        inApp: true,
        sms: true
      }
    });

    await newProfile.save();

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

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role are required"
      });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const cleanedRole = role.trim();

    console.log("🔐 Login attempt:", { cleanedEmail, cleanedRole });

    const user = await User.findOne({
      email: cleanedEmail,
      role: new RegExp(`^${cleanedRole}$`, 'i')
    });

    console.log("🔎 Found user:", user);

    if (!user) {
      console.error("❌ Login failed: User not found or incorrect role");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("❌ Login failed: password mismatch");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Ensure profile exists
    let profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      profile = new Profile({
        userId: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: '',
        notifications: {
          email: true,
          inApp: true,
          sms: true
        }
      });
      await profile.save();
    }

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
    const results = { signups: [], logins: [] };

    // Process signups
    if (pendingSignups && pendingSignups.length > 0) {
      for (const signup of pendingSignups) {
        try {
          const { name, phone, email, password, role } = signup;

          const cleanedEmail = email.trim().toLowerCase();
          const cleanedRole = role.trim();

          const existingUser = await User.findOne({ email: cleanedEmail });
          if (existingUser) {
            results.signups.push({
              email: cleanedEmail,
              status: 'skipped',
              message: 'User already exists'
            });
            continue;
          }

          const hashedPassword = await bcrypt.hash(password, 10);

          const newUser = new User({
            name,
            phone,
            email: cleanedEmail,
            password: hashedPassword,
            role: cleanedRole
          });
          await newUser.save();

          const newProfile = new Profile({
            userId: newUser._id,
            name,
            phone,
            email: cleanedEmail,
            address: '',
            notifications: {
              email: true,
              inApp: true,
              sms: true
            }
          });
          await newProfile.save();

          results.signups.push({
            email: cleanedEmail,
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

    // Process logins
    if (pendingLogins && pendingLogins.length > 0) {
      for (const login of pendingLogins) {
        try {
          const cleanedEmail = login.email.trim().toLowerCase();
          const cleanedRole = login.role.trim();

          const user = await User.findOne({
            email: cleanedEmail,
            role: new RegExp(`^${cleanedRole}$`, 'i')
          });

          if (user) {
            let profile = await Profile.findOne({ userId: user._id });
            if (!profile) {
              profile = new Profile({
                userId: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                address: '',
                notifications: {
                  email: true,
                  inApp: true,
                  sms: true
                }
              });
              await profile.save();
            }
            results.logins.push({
              email: cleanedEmail,
              status: 'success',
              userId: user._id
            });
          } else {
            results.logins.push({
              email: cleanedEmail,
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
