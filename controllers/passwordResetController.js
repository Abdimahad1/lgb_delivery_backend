// controllers/passwordResetController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP to email
exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  // Create transporter inside function
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log(`📧 Sending OTP to email: ${email}`); // Debugging email

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found for email:", email); // Debugging user lookup
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    console.log("🔒 OTP generated:", otp); // Debugging OTP generation
    console.log("⏰ OTP expiry time:", otpExpire); // Debugging OTP expiry time

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    // Always use DEFAULT_FROM_EMAIL when using Gmail SMTP
    const fromEmail = process.env.DEFAULT_FROM_EMAIL;

    const mailOptions = {
      from: `"Your App Name" <${fromEmail}>`,
      to: user.email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a90e2;">Password Reset Request</h2>
          <p>You requested to reset your password. Here is your OTP:</p>
          <div style="background: #f5f7fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #333; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent successfully to email:", email); // Debugging email sent

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("❌ Error in sending OTP:", err); // Debugging error
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  console.log(`🔍 Verifying OTP for email: ${email} with OTP: ${otp}`); // Debugging OTP verification

  try {
    const user = await User.findOne({
      email,
      otpExpire: { $gt: Date.now() }
    });

    if (!user) {
      console.log("❌ Invalid OTP or OTP expired for email:", email); // Debugging user check
      return res.status(400).json({ message: "Invalid OTP or OTP expired" });
    }

    if (user.otp !== otp) {
      console.log("❌ OTP does not match for email:", email); // Debugging OTP mismatch
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Generate a reset token that will be used in the password reset
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    console.log("🔑 Reset token generated:", resetToken); // Debugging reset token generation

    res.status(200).json({
      message: "OTP verified successfully",
      resetToken
    });

  } catch (err) {
    console.error("❌ Error in verifying OTP:", err); // Debugging error
    res.status(500).json({ message: err.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  console.log(`🔑 Resetting password with resetToken: ${resetToken}`); // Debugging reset process

  try {
    if (newPassword.length < 6) {
      console.log("❌ Password must be at least 6 characters"); // Debugging password length
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      console.log("❌ Passwords do not match"); // Debugging password mismatch
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      console.log("❌ Invalid or expired reset token"); // Debugging token expiration or invalidity
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password and save
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    console.log("✅ Password reset successfully for email:", user.email); // Debugging successful password reset

    res.status(200).json({ message: "Password reset successfully" });

  } catch (err) {
    console.error("❌ Error in resetting password:", err); // Debugging error
    res.status(500).json({ message: err.message });
  }
};
