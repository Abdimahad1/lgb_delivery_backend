const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

// 🔔 Send a notification (used by delivery person)
router.post('/send', auth, notificationController.createNotification);

// 📥 Get all notifications for the current user
router.get('/my', auth, notificationController.getMyNotifications);

// ✅ Mark a specific notification as read
router.patch('/mark-read/:id', auth, notificationController.markAsRead);

// ✅ Mark all as read
router.patch('/mark-all-read', auth, notificationController.markAllAsRead);

// 🗑️ Delete one
router.delete('/:id', auth, notificationController.deleteNotification);

// 🗑️ Delete all for current user
router.delete('/delete-all', auth, notificationController.deleteAllNotifications);

module.exports = router;
