const Notification = require('../models/Notification');

// 🔔 Send a notification (delivery → customer)
exports.createNotification = async (req, res) => {
  try {
    const { receiverId, senderName, message } = req.body;

    if (!receiverId || !senderName || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newNotification = await Notification.create({
      senderId: req.userId,
      receiverId,
      senderName,
      message
    });

    res.status(201).json({ success: true, data: newNotification });
  } catch (err) {
    console.error('❌ Create notification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
};

// 📩 Get all notifications for the current user
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const notifications = await Notification.find({ receiverId: userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    console.error('❌ Fetch notifications error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// ✅ Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    console.error('❌ Mark as read error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// ✅ Mark all as read for current user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    await Notification.updateMany({ receiverId: userId, isRead: false }, { isRead: true });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('❌ Mark all as read error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// 🗑️ Delete one notification
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('❌ Delete notification error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

// 🗑️ Delete all notifications for current user
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    await Notification.deleteMany({ receiverId: userId });

    res.status(200).json({ success: true, message: 'All notifications deleted' });
  } catch (err) {
    console.error('❌ Delete all error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete all notifications' });
  }
};
