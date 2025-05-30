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
const User = require('../models/User'); // ✅ Make sure this is included

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/', authMiddleware, getProfile);
router.put('/', authMiddleware, updateProfile);
router.patch('/', authMiddleware, patchProfile);
router.post('/upload', authMiddleware, upload.single('image'), uploadProfileImage);

// ✅ Get all vendors (already in place)
router.get('/all-vendors', authMiddleware, async (req, res) => {
  try {
    const host = req.protocol + '://' + req.get('host');
    const vendors = await Profile.find({
      shopName: { $exists: true, $ne: '' },
      profileImage: { $exists: true },
    });

    const formatted = vendors.map(v => ({
      userId: v.userId,
      name: v.name,
      shopName: v.shopName,
      address: v.address,
      profileImage: v.profileImage.startsWith('http')
        ? v.profileImage
        : `${host}${v.profileImage}`,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: err.message,
    });
  }
});

// ✅ NEW: Get all DeliveryPersons
router.get('/all-delivery-persons', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'DeliveryPerson' }).select('name phone email role _id');

    const deliveryProfiles = await Profile.find({ userId: { $in: users.map(u => u._id) } });
    const host = req.protocol + '://' + req.get('host');

    const formatted = users.map(user => {
      const profile = deliveryProfiles.find(p => p.userId.toString() === user._id.toString());
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: profile?.address || '',
        profileImage: profile?.profileImage?.startsWith('http')
          ? profile?.profileImage
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
