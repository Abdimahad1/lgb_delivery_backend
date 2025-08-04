const Profile = require('../models/Profile');
const User = require('../models/User');
const path = require('path');

exports.getProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.userId });

    if (!profile) {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      profile = new Profile({
        userId: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: '',
        notifications: {
          email: true,
          inApp: true,
          sms: true,
        }
      });

      await profile.save();
    }

    // ✅ Force HTTPS in host
    const rawHost = req.get('host');
    const host = `https://${rawHost.replace(/^http:\/\//, '')}`;

    const fullProfile = {
      ...profile.toObject(),
      profileImage: profile.profileImage?.startsWith('http')
        ? profile.profileImage
        : profile.profileImage
        ? `${host}${profile.profileImage}`
        : null,
    };

    res.status(200).json({ success: true, data: fullProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching profile', error: err.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, email, notifications, shopName, coordinates } = req.body;

    if (!name || !email || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Name, email, phone and address are required' });
    }

    const parts = address.split(',').map(p => p.trim());
    const district = parts[0] || ''; // Extracted district

    const updateData = {
      name,
      phone,
      address,
      email,
      notifications,
      district,
    };

    if (shopName !== undefined) updateData.shopName = shopName;
    if (coordinates?.lat && coordinates?.lng) updateData.coordinates = coordinates;

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: req.userId },
      updateData,
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, message: 'Profile updated', data: updatedProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating profile', error: err.message });
  }
};

exports.patchProfile = async (req, res) => {
  try {
    const updates = req.body;
    const updated = await Profile.findOneAndUpdate(
      { userId: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, message: 'Profile patched', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error patching profile', error: err.message });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const relativePath = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    // ✅ Store full URL instead of relative path
    const updated = await Profile.findOneAndUpdate(
      { userId: req.userId },
      { profileImage: fullUrl },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Image uploaded',
      imageUrl: fullUrl // same as stored in DB
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Image upload failed', error: err.message });
  }
};

