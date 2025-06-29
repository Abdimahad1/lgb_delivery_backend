// controllers/passwordResetController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Constants
const OTP_EXPIRY_MINUTES = 10;
const PASSWORD_RESET_EXPIRY_MINUTES = 10;

// Helpers
const generateOTP = () => crypto.randomInt(100000, 999999).toString();
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const getExpiryTime = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

// Send OTP
exports.sendOTP = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();

  log(`📧 Starting OTP process for email: ${email}`);
  log(`⏰ Server time: ${new Date()}`);
  log(`🌐 Server timezone offset: ${new Date().getTimezoneOffset()} minutes`);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    log(`❌ Invalid email format: ${email}`);
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      log(`❌ User not found for email: ${email}`);
      return res.status(404).json({ message: "If this email exists in our system, you'll receive an OTP" });
    }

    const otp = generateOTP();
    const otpExpire = getExpiryTime(OTP_EXPIRY_MINUTES);

    log(`🔢 Generated OTP: ${otp}`);
    log(`⏳ OTP expires at: ${otpExpire}`);

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    const mailOptions = {
      from: `"Password Reset" <${process.env.DEFAULT_FROM_EMAIL}>`,
      to: user.email,
      subject: 'Your Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color:#4a90e2;">Password Reset Request</h2>
          <p>Here is your OTP:</p>
          <div style="background:#f5f7fa;padding:20px;border-radius:5px;text-align:center;">
            <h1 style="letter-spacing:5px;">${otp}</h1>
          </div>
          <p>This OTP expires at ${otpExpire.toLocaleTimeString()} (${OTP_EXPIRY_MINUTES} minutes from now).</p>
          <p>If you did not request this, please ignore.</p>
        </div>
      `
    };

    log(`✉️ Sending OTP email to ${user.email}`);
    await transporter.sendMail(mailOptions);
    log(`✅ OTP email sent`);

    res.status(200).json({
      message: "If this email exists in our system, you'll receive an OTP",
      serverTime: new Date()
    });

  } catch (err) {
    log(`❌ Error in sendOTP: ${err.message}`);
    log(`🔄 Stack trace: ${err.stack}`);
    res.status(500).json({
      message: "Failed to process OTP request",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = req.body.otp?.trim();
  const currentTime = new Date();

  log(`🔍 Starting OTP verification for ${email}`);
  log(`⌚ Current time: ${currentTime}`);
  log(`🔢 Received OTP: ${otp}`);

  if (!email || !otp || otp.length !== 6) {
    log(`❌ Invalid verification input - email: ${email}, otp length: ${otp?.length}`);
    return res.status(400).json({ message: "Please provide valid email and 6-digit OTP" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      log(`❌ User not found for ${email}`);
      return res.status(400).json({ message: "Invalid OTP or OTP expired" });
    }

    log(`📦 Stored OTP: ${user.otp}`);
    log(`⏳ Stored expiry: ${user.otpExpire}`);

    if (!user.otp || user.otp !== otp) {
      log(`❌ OTP mismatch: stored=${user.otp}, received=${otp}`);
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpire < currentTime) {
      log(`⌛ OTP expired at ${user.otpExpire}`);
      return res.status(400).json({
        message: "OTP expired",
        expiredAt: user.otpExpire,
        currentTime
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = getExpiryTime(PASSWORD_RESET_EXPIRY_MINUTES);
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    log(`✅ OTP verified. Generated reset token: ${resetToken}`);
    res.status(200).json({
      message: "OTP verified successfully",
      resetToken,
      serverTime: currentTime,
      expiresAt: user.resetPasswordExpire
    });

  } catch (err) {
    log(`❌ Error in verifyOTP: ${err.message}`);
    log(`🔄 Stack trace: ${err.stack}`);
    res.status(500).json({
      message: "Failed to verify OTP",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  const currentTime = new Date();

  log(`🔑 Starting password reset using token: ${resetToken}`);

  if (!resetToken || !newPassword || !confirmPassword) {
    log(`❌ Missing fields`);
    return res.status(400).json({ message: "Please provide all required fields" });
  }

  if (newPassword.length < 6) {
    log(`❌ Password too short`);
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  if (newPassword !== confirmPassword) {
    log(`❌ Password mismatch`);
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: currentTime }
    });

    if (!user) {
      log(`❌ Invalid or expired reset token`);
      return res.status(400).json({
        message: "Invalid or expired token",
        serverTime: currentTime
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    log(`✅ Password reset successful for ${user.email}`);
    res.status(200).json({
      message: "Password reset successfully",
      serverTime: currentTime
    });

  } catch (err) {
    log(`❌ Error in resetPassword: ${err.message}`);
    log(`🔄 Stack trace: ${err.stack}`);
    res.status(500).json({
      message: "Failed to reset password",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Server time
exports.getServerTime = async (req, res) => {
  const now = new Date();
  log(`⏰ Server time requested`);
  res.status(200).json({
    serverTime: now,
    isoString: now.toISOString(),
    localeString: now.toLocaleString(),
    timestamp: now.getTime(),
    timezoneOffset: now.getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
};
