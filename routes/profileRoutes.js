const express = require('express');
const multer = require('multer');
const {
  getProfile,
  updateProfile,
  patchProfile,
  uploadProfileImage
} = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');
const Profile = require('../models/Profile');
const User = require('../models/User');

const router = express.Router();

// ✅ Setup Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ✅ Profile CRUD routes
router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.patch('/', authMiddleware, patchProfile);
router.post('/upload', authMiddleware, upload.single('image'), uploadProfileImage);

// ✅ Get all vendors, even without shopName or image
router.get('/all-vendors', authMiddleware, async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;

    // Find all users who are Vendors
    const vendorUsers = await User.find({ role: 'Vendor' }).select('_id name email');

    // Find all their profiles
    const vendorProfiles = await Profile.find({
      userId: { $in: vendorUsers.map(u => u._id) }
    });

    // Combine user info and profile
    const formatted = vendorProfiles.map(profile => {
      const user = vendorUsers.find(u => u._id.toString() === profile.userId.toString());

      return {
        userId: profile.userId,
        name: profile.name || user?.name || '',
        shopName: profile.shopName || '',
        address: profile.address || '',
        profileImage: profile.profileImage
          ? (profile.profileImage.startsWith('http')
              ? profile.profileImage
              : `${host}${profile.profileImage}`)
          : null,
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: err.message,
    });
  }
});


// ✅ Get all delivery persons with profile info
router.get('/all-delivery-persons', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'DeliveryPerson' }).select('name phone email role _id');
    const profiles = await Profile.find({ userId: { $in: users.map(u => u._id) } });

    const host = `${req.protocol}://${req.get('host')}`;

    const formatted = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: profile?.address || '',
        profileImage: profile?.profileImage?.startsWith('http')
          ? profile.profileImage
          : profile?.profileImage
          ? `${host}${profile.profileImage}`
          : null,
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery persons',
      error: err.message,
    });
  }
});

module.exports = router;
